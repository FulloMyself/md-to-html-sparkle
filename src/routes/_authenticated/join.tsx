import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, Panel } from "@/components/app-shell";
import { joinEstate } from "@/lib/access.functions";
import { accessQueryKey } from "@/hooks/use-access";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join an estate — Northgate" },
      { name: "description", content: "Use your estate join code to get access to Northgate." },
      { property: "og:title", content: "Join an estate — Northgate" },
      { property: "og:description", content: "Enter the join code your estate gave you." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const join = useServerFn(joinEstate);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState("");

  const mutation = useMutation({
    mutationFn: (input: { code: string; unitLabel?: string }) => join({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accessQueryKey });
      navigate({ to: "/dashboard" });
    },
  });

  return (
    <AppShell
      title="Join your estate"
      description="Your estate gives out a join code for residents, one for security staff and one for managers. Enter yours below."
    >
      <div className="max-w-md">
        <Panel title="Join code">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({ code, unitLabel: unit });
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. NG-RES-2026"
              required
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-brass"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Your unit number (residents only, e.g. A-04)"
              className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
            {mutation.error && (
              <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
            )}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
            >
              {mutation.isPending ? "Joining…" : "Join estate"}
            </button>
          </form>
          <p className="mt-4 text-xs text-ink-faint">
            Demo codes for Northgate Estate — residents: NG-RES-2026, security: NG-GRD-2026,
            managers: NG-ADM-2026.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
