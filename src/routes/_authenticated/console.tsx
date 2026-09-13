import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell, Panel, StatusPill } from "@/components/app-shell";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";
import { recordPlateRead, resolveAccessEvent } from "@/lib/access.functions";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Security console — Northgate Parking Access" },
      {
        name: "description",
        content:
          "Live gate activity, held vehicles, bay occupancy and device health for estate security.",
      },
      { property: "og:title", content: "Security console — Northgate Parking Access" },
      { property: "og:description", content: "Live gate decisions with manual override." },
    ],
  }),
  component: ConsolePage,
});

function ConsolePage() {
  const { data: access } = useAccess();
  const estateId = access?.estate?.id;
  const queryClient = useQueryClient();
  const simulate = useServerFn(recordPlateRead);
  const resolve = useServerFn(resolveAccessEvent);
  const [plate, setPlate] = useState("");
  const [gateId, setGateId] = useState("");
  const [direction, setDirection] = useState<"entry" | "exit">("entry");

  const { data: gates } = useQuery({
    queryKey: ["gates", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gates")
        .select("id, name, direction, is_open")
        .eq("estate_id", estateId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["events", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_events")
        .select("id, plate, decision, reason, direction, captured_at, bay_code, confidence")
        .eq("estate_id", estateId!)
        .order("captured_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const { data: bays } = useQuery({
    queryKey: ["bays", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parking_bays")
        .select("id, code, status, occupied_plate")
        .eq("estate_id", estateId!)
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const { data: devices } = useQuery({
    queryKey: ["devices", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, kind, status, last_seen_at")
        .eq("estate_id", estateId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!estateId) return;
    const channel = supabase
      .channel("gate-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "access_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["events", estateId] });
          queryClient.invalidateQueries({ queryKey: ["bays", estateId] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "gates" }, () => {
        queryClient.invalidateQueries({ queryKey: ["gates", estateId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [estateId, queryClient]);

  const read = useMutation({
    mutationFn: () =>
      simulate({
        data: {
          estateId: estateId!,
          gateId: gateId || gates?.[0]?.id || "",
          plate,
          direction,
        },
      }),
    onSuccess: () => {
      setPlate("");
      queryClient.invalidateQueries({ queryKey: ["events", estateId] });
      queryClient.invalidateQueries({ queryKey: ["bays", estateId] });
    },
  });

  const override = useMutation({
    mutationFn: (input: { eventId: string; decision: "allowed" | "denied" }) =>
      resolve({ data: { ...input, note: "" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", estateId] }),
  });

  const closeGate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gates").update({ is_open: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gates", estateId] }),
  });

  if (!estateId) {
    return <AppShell title="Security console">{null}</AppShell>;
  }

  return (
    <AppShell
      title="Security console"
      description="Everything happening at the gates right now. Plate reads are simulated for testing — a real camera will post the same reads later."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Simulate a plate read">
            <form
              className="flex flex-wrap items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                read.mutate();
              }}
            >
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="Plate seen by camera"
                required
                className="min-w-40 flex-1 rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-brass"
              />
              <select
                value={gateId || gates?.[0]?.id || ""}
                onChange={(e) => setGateId(e.target.value)}
                className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
              >
                {gates?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "entry" | "exit")}
                className="rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
              >
                <option value="entry">Arriving</option>
                <option value="exit">Leaving</option>
              </select>
              <button
                type="submit"
                disabled={read.isPending}
                className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
              >
                {read.isPending ? "Reading…" : "Read plate"}
              </button>
            </form>
            {read.error && (
              <p className="mt-3 text-sm text-destructive">{(read.error as Error).message}</p>
            )}
          </Panel>

          <Panel title="Live gate activity">
            {events?.length ? (
              <ul className="divide-y divide-line">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-ink-faint">
                        {new Date(e.captured_at).toLocaleTimeString()}
                      </span>
                      <span className="font-mono">{e.plate}</span>
                      <span className="text-ink-soft">{e.reason}</span>
                      {e.bay_code && (
                        <span className="font-mono text-xs text-brass">Bay {e.bay_code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {e.decision !== "allowed" && (
                        <button
                          onClick={() =>
                            override.mutate({ eventId: e.id, decision: "allowed" })
                          }
                          className="rounded-md border border-line px-3 py-1.5 text-xs hover:bg-paper-deep"
                        >
                          Open gate
                        </button>
                      )}
                      <StatusPill decision={e.decision} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No reads yet.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Gates">
            <ul className="space-y-2 text-sm">
              {gates?.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3">
                  <span>{g.name}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.12em] ${g.is_open ? "text-allow" : "text-ink-faint"}`}
                    >
                      {g.is_open ? "open" : "closed"}
                    </span>
                    {g.is_open && (
                      <button
                        onClick={() => closeGate.mutate(g.id)}
                        className="rounded-md border border-line px-2 py-1 text-[11px] hover:bg-paper-deep"
                      >
                        Close
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Parking bays">
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {bays?.map((b) => (
                <li
                  key={b.id}
                  className="rounded-md border border-line px-3 py-2 font-mono text-xs"
                >
                  <span>{b.code}</span>
                  <span
                    className={`ml-2 ${b.status === "free" ? "text-ink-faint" : "text-brass"}`}
                  >
                    {b.status === "free" ? "free" : (b.occupied_plate ?? "in use")}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Devices">
            <ul className="space-y-2 text-sm">
              {devices?.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <span>{d.name}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                      d.status === "online"
                        ? "text-allow"
                        : d.status === "degraded"
                          ? "text-brass"
                          : "text-destructive"
                    }`}
                  >
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
