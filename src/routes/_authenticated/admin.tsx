import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, Panel } from "@/components/app-shell";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getEstateCodes } from "@/lib/access.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Estate setup — Northgate Parking Access" },
      {
        name: "description",
        content: "Manage units, gates, parking bays, devices and the people who work the estate.",
      },
      { property: "og:title", content: "Estate setup — Northgate Parking Access" },
      { property: "og:description", content: "Units, gates, bays, devices and people." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: access } = useAccess();
  const estateId = access?.estate?.id;
  const queryClient = useQueryClient();
  const fetchCodes = useServerFn(getEstateCodes);
  const [unitLabel, setUnitLabel] = useState("");
  const [gateName, setGateName] = useState("");
  const [bayCode, setBayCode] = useState("");
  const [deviceName, setDeviceName] = useState("");

  const invalidate = (key: string) =>
    queryClient.invalidateQueries({ queryKey: [key, estateId] });

  const units = useQuery({
    queryKey: ["units", estateId],
    enabled: !!estateId,
    queryFn: async () =>
      (await supabase.from("units").select("id, label").eq("estate_id", estateId!).order("label"))
        .data ?? [],
  });

  const gates = useQuery({
    queryKey: ["gates", estateId],
    enabled: !!estateId,
    queryFn: async () =>
      (
        await supabase
          .from("gates")
          .select("id, name, direction")
          .eq("estate_id", estateId!)
          .order("name")
      ).data ?? [],
  });

  const bays = useQuery({
    queryKey: ["bays", estateId],
    enabled: !!estateId,
    queryFn: async () =>
      (
        await supabase
          .from("parking_bays")
          .select("id, code, status")
          .eq("estate_id", estateId!)
          .order("code")
      ).data ?? [],
  });

  const devices = useQuery({
    queryKey: ["devices", estateId],
    enabled: !!estateId,
    queryFn: async () =>
      (
        await supabase
          .from("devices")
          .select("id, name, kind, status")
          .eq("estate_id", estateId!)
          .order("name")
      ).data ?? [],
  });

  const codes = useQuery({
    queryKey: ["estate-codes", estateId],
    enabled: !!estateId && !!access?.isManager,
    queryFn: () => fetchCodes({ data: { estateId: estateId! } }),
  });

  const people = useQuery({
    queryKey: ["people", estateId],
    enabled: !!estateId,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .eq("estate_id", estateId!);
      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      return (roles ?? []).map((r) => ({
        ...r,
        profile: (profiles ?? []).find((p) => p.id === r.user_id),
      }));
    },
  });

  const addUnit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("units")
        .insert({ estate_id: estateId!, label: unitLabel });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setUnitLabel("");
      invalidate("units");
    },
  });

  const addGate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("gates")
        .insert({ estate_id: estateId!, name: gateName });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setGateName("");
      invalidate("gates");
    },
  });

  const addBay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("parking_bays")
        .insert({ estate_id: estateId!, code: bayCode });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setBayCode("");
      invalidate("bays");
    },
  });

  const addDevice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("devices")
        .insert({ estate_id: estateId!, name: deviceName });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDeviceName("");
      invalidate("devices");
    },
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate("people"),
  });

  if (!access?.isManager) {
    return (
      <AppShell
        title="Estate setup"
        description="Only estate managers can change the estate's setup."
      >
        {null}
      </AppShell>
    );
  }

  

  return (
    <AppShell
      title="Estate setup"
      description="Units, gates, bays, devices and the people who use the system."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Join codes">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-ink-soft">Residents</span>
              <span className="font-mono">{codes.data?.resident_code ?? "—"}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-ink-soft">Security</span>
              <span className="font-mono">{codes.data?.guard_code ?? "—"}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-ink-soft">Managers</span>
              <span className="font-mono">{codes.data?.admin_code ?? "—"}</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-ink-faint">
            Share the matching code with each group. It links their account to this estate.
          </p>
        </Panel>

        <Panel title="People">
          {people.data?.length ? (
            <ul className="divide-y divide-line">
              {people.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p>{p.profile?.full_name ?? p.profile?.email ?? "Unnamed"}</p>
                    <p className="text-xs text-ink-faint">{p.role.replace("_", " ")}</p>
                  </div>
                  <button
                    onClick={() => removeRole.mutate(p.id)}
                    className="rounded-md border border-line px-3 py-1.5 text-xs text-destructive hover:bg-paper-deep"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">Nobody has joined with a code yet.</p>
          )}
        </Panel>

        <SetupList
          title="Units"
          items={(units.data ?? []).map((u) => u.label)}
          value={unitLabel}
          onChange={setUnitLabel}
          onAdd={() => addUnit.mutate()}
          placeholder="e.g. C-03"
        />
        <SetupList
          title="Gates"
          items={(gates.data ?? []).map((g) => `${g.name} · ${g.direction}`)}
          value={gateName}
          onChange={setGateName}
          onAdd={() => addGate.mutate()}
          placeholder="e.g. North Gate"
        />
        <SetupList
          title="Parking bays"
          items={(bays.data ?? []).map((b) => `${b.code} · ${b.status}`)}
          value={bayCode}
          onChange={setBayCode}
          onAdd={() => addBay.mutate()}
          placeholder="e.g. V-03"
        />
        <SetupList
          title="Devices"
          items={(devices.data ?? []).map((d) => `${d.name} · ${d.status}`)}
          value={deviceName}
          onChange={setDeviceName}
          onAdd={() => addDevice.mutate()}
          placeholder="e.g. West camera"
        />
      </div>
    </AppShell>
  );
}

function SetupList({
  title,
  items,
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  title: string;
  items: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <Panel title={title}>
      <ul className="mb-4 flex flex-wrap gap-2">
        {items.length ? (
          items.map((i) => (
            <li
              key={i}
              className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-ink-soft"
            >
              {i}
            </li>
          ))
        ) : (
          <li className="text-sm text-ink-soft">Nothing here yet.</li>
        )}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
        <button type="submit" className="rounded-md bg-ink px-3 py-2 text-sm text-paper">
          Add
        </button>
      </form>
    </Panel>
  );
}
