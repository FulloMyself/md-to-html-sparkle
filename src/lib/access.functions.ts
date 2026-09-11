import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function normalisePlate(plate: string) {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

type ReadInput = {
  estateId: string;
  gateId: string;
  plate: string;
  direction: "entry" | "exit";
};

/**
 * Simulates a camera plate read at a gate and applies the estate's access rules.
 * A real camera can post the same payload later — only the "source" changes.
 */
export const recordPlateRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ReadInput) => {
    if (!input.estateId) throw new Error("Estate is required");
    if (!input.gateId) throw new Error("Gate is required");
    const plate = normalisePlate(input.plate ?? "");
    if (plate.length < 2) throw new Error("Enter a plate with at least 2 characters");
    return { ...input, plate };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { estateId, gateId, plate, direction } = data;

    let decision: "allowed" | "denied" | "held" = "held";
    let reason = "Plate not recognised";
    let vehicleId: string | null = null;
    let passId: string | null = null;
    let bayCode: string | null = null;

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, unit_id, is_active")
      .eq("estate_id", estateId)
      .eq("plate", plate)
      .maybeSingle();

    if (vehicle && vehicle.is_active) {
      decision = "allowed";
      reason = "Registered resident vehicle";
      vehicleId = vehicle.id;
      if (vehicle.unit_id) {
        const { data: bay } = await supabase
          .from("parking_bays")
          .select("id, code")
          .eq("estate_id", estateId)
          .eq("unit_id", vehicle.unit_id)
          .limit(1)
          .maybeSingle();
        if (bay) bayCode = bay.code;
      }
    } else if (vehicle && !vehicle.is_active) {
      decision = "denied";
      reason = "Vehicle suspended by the estate";
      vehicleId = vehicle.id;
    } else {
      const nowIso = new Date().toISOString();
      const { data: pass } = await supabase
        .from("visitor_passes")
        .select("id, status, valid_from, valid_to, visitor_name")
        .eq("estate_id", estateId)
        .eq("plate", plate)
        .order("valid_to", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pass) {
        passId = pass.id;
        if (pass.status === "revoked") {
          decision = "denied";
          reason = "Visitor pass was revoked";
        } else if (pass.valid_from > nowIso) {
          decision = "held";
          reason = `Visitor pass for ${pass.visitor_name} is not valid yet`;
        } else if (pass.valid_to < nowIso) {
          decision = "denied";
          reason = "Visitor pass has expired";
        } else {
          decision = "allowed";
          reason = `Expected visitor — ${pass.visitor_name}`;
          const { data: bay } = await supabase
            .from("parking_bays")
            .select("code")
            .eq("estate_id", estateId)
            .is("unit_id", null)
            .eq("status", "free")
            .limit(1)
            .maybeSingle();
          if (bay) bayCode = bay.code;
        }
      }
    }

    const { data: event, error } = await supabase
      .from("access_events")
      .insert({
        estate_id: estateId,
        gate_id: gateId,
        plate,
        direction,
        decision,
        reason,
        vehicle_id: vehicleId,
        pass_id: passId,
        bay_code: direction === "entry" ? bayCode : null,
        confidence: Number((0.9 + Math.random() * 0.099).toFixed(3)),
        source: "simulated",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    // Gate + bay side effects. These need estate staff rights; residents
    // simulating their own plate simply get the logged decision.
    if (decision === "allowed") {
      await supabase.from("gates").update({ is_open: true }).eq("id", gateId);
      if (bayCode) {
        await supabase
          .from("parking_bays")
          .update(
            direction === "entry"
              ? { status: "occupied" as const, occupied_plate: plate }
              : { status: "free" as const, occupied_plate: null },
          )
          .eq("estate_id", estateId)
          .eq("code", bayCode);
      }
      if (direction === "exit") {
        await supabase
          .from("parking_bays")
          .update({ status: "free" as const, occupied_plate: null })
          .eq("estate_id", estateId)
          .eq("occupied_plate", plate);
      }
    }

    return event;
  });

type ResolveInput = { eventId: string; decision: "allowed" | "denied"; note: string };

/** A guard overriding a held or denied gate decision. */
export const resolveAccessEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ResolveInput) => {
    if (!input.eventId) throw new Error("Event is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: event, error } = await supabase
      .from("access_events")
      .update({
        decision: data.decision,
        reason:
          data.decision === "allowed"
            ? "Opened manually by security"
            : "Refused manually by security",
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        resolution_note: data.note || null,
      })
      .eq("id", data.eventId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    if (data.decision === "allowed" && event.gate_id) {
      await supabase.from("gates").update({ is_open: true }).eq("id", event.gate_id);
    }
    return event;
  });

/** Joins the signed-in person to an estate using one of its join codes. */
export const joinEstate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; unitLabel?: string }) => {
    if (!input.code?.trim()) throw new Error("Enter a join code");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error, data: result } = await context.supabase.rpc("join_estate", {
      _code: data.code.trim(),
      _unit_label: data.unitLabel?.trim() || undefined,
    });
    if (error) throw new Error(error.message);
    return result as { estate_id: string; estate_name: string; role: string };
  });
