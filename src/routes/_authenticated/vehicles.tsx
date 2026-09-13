import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel } from "@/components/app-shell";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles — Northgate Parking Access" },
      {
        name: "description",
        content: "Register the number plates that should open the gate automatically.",
      },
      { property: "og:title", content: "Vehicles — Northgate Parking Access" },
      { property: "og:description", content: "Register plates for automatic gate entry." },
    ],
  }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const { data: access } = useAccess();
  const estateId = access?.estate?.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ plate: "", make: "", model: "", colour: "" });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate, make, model, colour, is_active, owner_id, unit_id")
        .eq("estate_id", estateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addVehicle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vehicles").insert({
        estate_id: estateId!,
        owner_id: access!.userId,
        unit_id: access!.unitId,
        plate: form.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        make: form.make || null,
        model: form.model || null,
        colour: form.colour || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setForm({ plate: "", make: "", model: "", colour: "" });
      queryClient.invalidateQueries({ queryKey: ["vehicles", estateId] });
    },
  });

  const toggleVehicle = useMutation({
    mutationFn: async (v: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_active: !v.is_active })
        .eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles", estateId] }),
  });

  const removeVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles", estateId] }),
  });

  if (!estateId) {
    return (
      <AppShell title="Vehicles" description="Join an estate first to register a vehicle.">
        {null}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Vehicles"
      description="Plates listed here open the gate automatically. Suspend a plate to stop it without deleting the record."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Registered plates">
          {vehicles?.length ? (
            <ul className="divide-y divide-line">
              {vehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-mono text-sm">{v.plate}</p>
                    <p className="text-xs text-ink-soft">
                      {[v.colour, v.make, v.model].filter(Boolean).join(" ") || "No details"}
                      {!v.is_active && " · suspended"}
                    </p>
                  </div>
                  {(v.owner_id === access?.userId || access?.isManager) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleVehicle.mutate({ id: v.id, is_active: v.is_active })}
                        className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-paper-deep"
                      >
                        {v.is_active ? "Suspend" : "Reinstate"}
                      </button>
                      <button
                        onClick={() => removeVehicle.mutate(v.id)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs text-destructive hover:bg-paper-deep"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">No vehicles registered yet.</p>
          )}
        </Panel>

        <Panel title="Add a vehicle">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              addVehicle.mutate();
            }}
          >
            <input
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="Number plate"
              required
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-brass"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="Make"
                className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
              />
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Model"
                className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
              />
            </div>
            <input
              value={form.colour}
              onChange={(e) => setForm({ ...form, colour: e.target.value })}
              placeholder="Colour"
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
            {addVehicle.error && (
              <p className="text-sm text-destructive">{(addVehicle.error as Error).message}</p>
            )}
            <button
              type="submit"
              disabled={addVehicle.isPending}
              className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
            >
              {addVehicle.isPending ? "Saving…" : "Add vehicle"}
            </button>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
