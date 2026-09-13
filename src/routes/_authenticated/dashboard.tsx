import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel, StatusPill } from "@/components/app-shell";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Northgate Parking Access" },
      {
        name: "description",
        content: "Your estate at a glance: vehicles, visitor passes and the latest gate activity.",
      },
      { property: "og:title", content: "Overview — Northgate Parking Access" },
      { property: "og:description", content: "Vehicles, visitors and live gate activity." },
    ],
  }),
  component: DashboardPage,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}

function DashboardPage() {
  const { data: access, isLoading } = useAccess();
  const estateId = access?.estate?.id;

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary", estateId, access?.userId],
    enabled: !!estateId,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [vehicles, passes, events, bays] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("estate_id", estateId!),
        supabase
          .from("visitor_passes")
          .select("id", { count: "exact", head: true })
          .eq("estate_id", estateId!)
          .eq("status", "active")
          .gte("valid_to", nowIso),
        supabase
          .from("access_events")
          .select("id, plate, decision, reason, captured_at, direction")
          .eq("estate_id", estateId!)
          .order("captured_at", { ascending: false })
          .limit(8),
        supabase
          .from("parking_bays")
          .select("id, status")
          .eq("estate_id", estateId!),
      ]);
      return {
        vehicles: vehicles.count ?? 0,
        passes: passes.count ?? 0,
        events: events.data ?? [],
        baysFree: (bays.data ?? []).filter((b) => b.status === "free").length,
        baysTotal: (bays.data ?? []).length,
      };
    },
  });

  if (isLoading) {
    return <AppShell title="Loading…">{null}</AppShell>;
  }

  if (!access?.estate) {
    return (
      <AppShell
        title="You are not linked to an estate yet"
        description="Ask your estate for a join code, then add it here to unlock your vehicles, visitor passes and gate activity."
      >
        <Link
          to="/join"
          className="inline-flex rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper"
        >
          Enter a join code
        </Link>
      </AppShell>
    );
  }

  const roleLabel = access.isSuperAdmin
    ? "Super admin"
    : access.isManager
      ? "Estate manager"
      : access.isGuard
        ? "Security"
        : "Resident";

  return (
    <AppShell
      title={access.estate.name}
      description={`Signed in as ${roleLabel}${access.estate.address ? ` · ${access.estate.address}` : ""}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vehicles" value={summary?.vehicles ?? "—"} />
        <Stat label="Active visitor passes" value={summary?.passes ?? "—"} />
        <Stat
          label="Bays free"
          value={summary ? `${summary.baysFree}/${summary.baysTotal}` : "—"}
        />
        <Stat label="Your role" value={roleLabel} />
      </div>

      <div className="mt-8">
        <Panel title="Latest gate activity">
          {summary?.events?.length ? (
            <ul className="divide-y divide-line">
              {summary.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-ink-faint">
                      {new Date(e.captured_at).toLocaleTimeString()}
                    </span>
                    <span className="font-mono">{e.plate}</span>
                    <span className="text-ink-soft">{e.reason}</span>
                  </div>
                  <StatusPill decision={e.decision} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">
              No gate activity yet. Security can simulate a plate read from the Security screen.
            </p>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
