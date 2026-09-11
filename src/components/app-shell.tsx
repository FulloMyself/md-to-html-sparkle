import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/use-access";

function Logo() {
  return (
    <div className="size-7 rounded-md bg-ink grid place-items-center">
      <span className="font-mono text-[11px] font-medium text-paper">N</span>
    </div>
  );
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { data: access } = useAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const links: { to: string; label: string; show: boolean }[] = [
    { to: "/dashboard", label: "Overview", show: true },
    { to: "/vehicles", label: "Vehicles", show: true },
    { to: "/visitors", label: "Visitors", show: true },
    { to: "/console", label: "Security", show: !!access?.isGuard },
    { to: "/admin", label: "Estate setup", show: !!access?.isManager },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink font-sans antialiased">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-serif text-lg">Northgate</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links
              .filter((l) => l.show)
              .map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                  activeProps={{ className: "bg-paper-deep text-ink" }}
                >
                  {l.label}
                </Link>
              ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-faint sm:inline">
              {access?.fullName ?? access?.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-deep"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="border-t border-line md:hidden">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {links
              .filter((l) => l.show)
              .map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-ink-soft"
                  activeProps={{ className: "bg-paper-deep text-ink" }}
                >
                  {l.label}
                </Link>
              ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-paper">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && (
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({ decision }: { decision: string }) {
  const tone =
    decision === "allowed"
      ? "border-allow/40 text-allow"
      : decision === "denied"
        ? "border-destructive/40 text-destructive"
        : "border-brass/50 text-brass";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${tone}`}
    >
      {decision}
    </span>
  );
}
