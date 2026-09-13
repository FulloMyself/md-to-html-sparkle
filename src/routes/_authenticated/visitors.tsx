import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel } from "@/components/app-shell";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/visitors")({
  head: () => ({
    meta: [
      { title: "Visitors — Northgate Parking Access" },
      {
        name: "description",
        content: "Authorise a visitor's plate in advance so the gate opens when they arrive.",
      },
      { property: "og:title", content: "Visitors — Northgate Parking Access" },
      { property: "og:description", content: "Pre-authorise visitor plates for a time window." },
    ],
  }),
  component: VisitorsPage,
});

function localInput(date: Date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
}

function VisitorsPage() {
  const { data: access } = useAccess();
  const estateId = access?.estate?.id;
  const queryClient = useQueryClient();
  const now = new Date();
  const [form, setForm] = useState({
    visitor_name: "",
    visitor_phone: "",
    plate: "",
    valid_from: localInput(now),
    valid_to: localInput(new Date(now.getTime() + 6 * 3600 * 1000)),
  });

  const { data: passes } = useQuery({
    queryKey: ["passes", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitor_passes")
        .select("id, visitor_name, visitor_phone, plate, valid_from, valid_to, status, host_id")
        .eq("estate_id", estateId!)
        .order("valid_to", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("visitor_passes").insert({
        estate_id: estateId!,
        host_id: access!.userId,
        unit_id: access!.unitId,
        visitor_name: form.visitor_name,
        visitor_phone: form.visitor_phone || null,
        plate: form.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        valid_from: new Date(form.valid_from).toISOString(),
        valid_to: new Date(form.valid_to).toISOString(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setForm({ ...form, visitor_name: "", visitor_phone: "", plate: "" });
      queryClient.invalidateQueries({ queryKey: ["passes", estateId] });
    },
  });

  const revokePass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("visitor_passes")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["passes", estateId] }),
  });

  if (!estateId) {
    return (
      <AppShell title="Visitors" description="Join an estate first to invite visitors.">
        {null}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Visitors"
      description="Give a visitor's plate a time window. Inside that window the gate opens on its own; outside it the arrival is held for security."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Visitor passes">
          {passes?.length ? (
            <ul className="divide-y divide-line">
              {passes.map((p) => {
                const expired = new Date(p.valid_to) < new Date();
                return (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm">
                        {p.visitor_name} · <span className="font-mono">{p.plate}</span>
                      </p>
                      <p className="text-xs text-ink-soft">
                        {new Date(p.valid_from).toLocaleString()} —{" "}
                        {new Date(p.valid_to).toLocaleString()}
                        {p.status === "revoked"
                          ? " · revoked"
                          : expired
                            ? " · expired"
                            : " · active"}
                      </p>
                    </div>
                    {p.status !== "revoked" && !expired && (
                      <button
                        onClick={() => revokePass.mutate(p.id)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs text-destructive hover:bg-paper-deep"
                      >
                        Revoke
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">No visitor passes yet.</p>
          )}
        </Panel>

        <Panel title="Invite a visitor">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createPass.mutate();
            }}
          >
            <input
              value={form.visitor_name}
              onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
              placeholder="Visitor name"
              required
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
            <input
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="Number plate"
              required
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-brass"
            />
            <input
              value={form.visitor_phone}
              onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
              placeholder="Phone (optional)"
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
            <label className="block text-xs text-ink-faint">
              Valid from
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-brass"
              />
            </label>
            <label className="block text-xs text-ink-faint">
              Valid until
              <input
                type="datetime-local"
                value={form.valid_to}
                onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-brass"
              />
            </label>
            {createPass.error && (
              <p className="text-sm text-destructive">{(createPass.error as Error).message}</p>
            )}
            <button
              type="submit"
              disabled={createPass.isPending}
              className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
            >
              {createPass.isPending ? "Saving…" : "Create pass"}
            </button>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
