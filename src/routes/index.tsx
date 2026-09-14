import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Northgate — Humanless Residential Parking Access" },
      {
        name: "description",
        content:
          "Northgate reads plates at the gate, checks your household rules locally, and lifts the boom before you slow down. Resident-first, offline-capable vehicle access for estates and complexes.",
      },
      { property: "og:title", content: "Northgate — Humanless Residential Parking Access" },
      {
        property: "og:description",
        content:
          "Plate recognition, local rules, and automatic gate opening. No fob, no app, no one at the desk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Northgate — Humanless Residential Parking Access" },
      {
        name: "twitter:description",
        content:
          "Plate recognition, local rules, and automatic gate opening. No fob, no app, no one at the desk.",
      },
    ],
  }),
  component: Index,
});

const accessEvents = [
  { time: "14:02:11", plate: "7 XKA 441", detail: "Bay A-04", status: "ALLOWED", tone: "allow" },
  { time: "14:02:19", plate: "KLM 209", detail: "Guest · pre-auth", status: "ALLOWED", tone: "allow" },
  { time: "14:03:47", plate: "DQX 883", detail: "Not on list", status: "HELD", tone: "held" },
  { time: "14:05:02", plate: "7 XKA 441", detail: "Bay A-04", status: "EXIT", tone: "allow" },
] as const;

const flowSteps = [
  {
    number: "01",
    tag: "Camera",
    title: "Plate detected",
    body: "The gateway camera captures and reads the plate in under 400 ms, even in low light or at speed.",
  },
  {
    number: "02",
    tag: "Rules engine",
    title: "Rules matched",
    body: "The plate is checked against resident, visitor and bay rules — locally, on the gateway, no round-trip required.",
  },
  {
    number: "03",
    tag: "Gate",
    title: "Gate opens",
    body: "The boom lifts and the event is logged with plate, bay and timestamp. Everything is traceable afterward.",
  },
] as const;

const roles = [
  { name: "Residents", note: "Auto entry" },
  { name: "Security", note: "Live console" },
  { name: "Admins", note: "Rules & audit" },
] as const;

function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-6" : "size-7";
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";
  return (
    <div className={`${box} rounded-md bg-ink grid place-items-center`}>
      <span className={`font-mono ${text} font-medium text-paper`}>N</span>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans antialiased">
      {/* NAV */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="font-serif text-xl font-medium tracking-tight text-ink">
              Northgate
            </span>
            <span className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint sm:inline">
              Residential Access
            </span>
          </div>
          <nav className="hidden items-center gap-8 font-sans text-sm font-medium text-ink-soft md:flex">
            <a href="#flow" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#console" className="transition-colors hover:text-ink">
              Console
            </a>
            <a href="#cta" className="transition-colors hover:text-ink">
              Roles
            </a>
          </nav>
          <Link
            to="/auth"
            className="rounded-[min(1vw,10px)] bg-ink px-4 py-2 font-sans text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-8 lg:py-24">
          <div className="lg:col-span-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-brass">
              Humanless entry, resident-first
            </span>
            <h1 className="mt-5 max-w-[20ch] text-balance font-serif text-4xl font-medium leading-tight text-ink lg:text-6xl">
              The gate already knows you're here.
            </h1>
            <p className="mt-6 max-w-[46ch] text-pretty font-sans text-base text-ink-soft">
              Northgate reads plates at the gate, checks them against your household rules, and
              lifts the boom before you slow down. No fob, no app, no one at the desk — just
              quiet, audited access for homes and small communities.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-[min(1vw,10px)] bg-ink px-5 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-ink/90"
              >
                Open the system
              </Link>
              <a
                href="#flow"
                className="inline-flex items-center gap-2 rounded-[min(1vw,10px)] border border-line px-5 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-paper-deep/60"
              >
                See the entry flow
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              <span>Offline-first gateway</span>
              <span>Plate → rule → gate</span>
              <span>Full audit trail</span>
            </div>
          </div>

          {/* Gate visual */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-[min(1.2vw,16px)] bg-paper-deep p-6 ring-1 ring-ink/5">
              <div className="mb-5 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  Gate 01 · Camera West
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-allow">
                  <span className="pulse-dot size-1.5 rounded-full bg-allow" />
                  Live
                </span>
              </div>

              <div className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-[min(1vw,12px)] bg-ink/5 outline-1 -outline-offset-1 outline-ink/5">
                <div
                  className="absolute inset-x-0 bottom-0 h-2/5"
                  style={{
                    background:
                      "linear-gradient(to top, oklch(0.19 0.012 75 / 0.06), transparent)",
                  }}
                />
                <div className="relative z-10">
                  <div className="rounded-md bg-ink px-4 py-2 font-mono text-lg tracking-[0.28em] text-paper shadow-sm">
                    7 XKA 441
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-allow">
                    <span className="size-1.5 rounded-full bg-allow" />
                    Matched · Resident
                  </div>
                </div>
                <div
                  className="scan-line absolute left-0 right-0 top-0 h-8"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, oklch(0.58 0.09 78 / 0.28), transparent)",
                  }}
                />
              </div>

              <div className="relative mt-5 h-16">
                <div className="absolute bottom-2 left-0 top-2 w-3 rounded-full bg-ink" />
                <div
                  className="gate-arm absolute bottom-3 left-2 h-2.5 w-[82%] rounded-full"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, oklch(0.19 0.012 75) 0 18px, oklch(0.72 0.09 85) 18px 36px)",
                  }}
                />
                <div className="absolute bottom-1 right-0 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                  Boom lift
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ENTRY FLOW */}
      <section id="flow" className="border-b border-line bg-paper-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-[40ch]">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-brass">
              Automated entry
            </span>
            <h2 className="mt-3 max-w-[35ch] text-balance font-serif text-3xl font-medium leading-tight text-ink lg:text-4xl">
              One approach, three silent decisions.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {flowSteps.map((step) => (
              <div
                key={step.number}
                className="rounded-[min(1vw,14px)] bg-paper p-6 ring-1 ring-ink/5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-brass">{step.number}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                    {step.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-ink">{step.title}</h3>
                <p className="mt-2 text-pretty font-sans text-sm text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE CONSOLE */}
      <section id="console" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-brass">
                Security console
              </span>
              <h2 className="mt-3 max-w-[35ch] text-balance font-serif text-3xl font-medium leading-tight text-ink lg:text-4xl">
                A live log of every movement.
              </h2>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
              Gateway online · 3 cameras
            </span>
          </div>

          <div className="mt-8 overflow-hidden rounded-[min(1.2vw,16px)] bg-ink ring-1 ring-ink/5">
            <div className="flex items-center justify-between border-b border-paper/10 px-4 py-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-paper/70">
                Access events · today
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-brass-soft">
                <span className="pulse-dot size-1.5 rounded-full bg-brass-soft" />
                Streaming
              </span>
            </div>
            <div className="divide-y divide-paper/10 font-mono text-[13px]">
              {accessEvents.map((event) => (
                <div key={event.time + event.plate} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-paper/40">{event.time}</span>
                  <span className="tracking-[0.15em] text-paper/90">{event.plate}</span>
                  <span className="hidden text-paper/50 sm:inline">{event.detail}</span>
                  <span
                    className={`ml-auto flex items-center gap-1.5 ${
                      event.tone === "held" ? "text-brass-soft" : "text-allow"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        event.tone === "held" ? "bg-brass-soft" : "bg-allow"
                      }`}
                    />
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section id="cta" className="bg-paper-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="max-w-[22ch] text-balance font-serif text-4xl font-medium leading-tight text-ink lg:text-5xl">
                Bring quiet, certain access to your home.
              </h2>
              <p className="mt-5 max-w-[48ch] text-pretty font-sans text-base text-ink-soft">
                A single gateway, a few cameras, and rules that hold whether or not there's a
                signal. Set it once, then simply drive in.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-[min(1vw,10px)] bg-ink px-5 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-ink/90"
                >
                  Create your account
                </Link>
                <a
                  href="#cta"
                  className="inline-flex items-center gap-2 rounded-[min(1vw,10px)] border border-line px-5 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-paper-deep/60"
                >
                  Talk to the team
                </a>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[min(1.2vw,16px)] bg-paper p-6 ring-1 ring-ink/5">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                  Who it's for
                </span>
                <ul className="mt-4 divide-y divide-line">
                  {roles.map((role) => (
                    <li key={role.name} className="flex items-center justify-between py-3">
                      <span className="font-sans text-sm text-ink">{role.name}</span>
                      <span className="font-mono text-[11px] text-ink-faint">{role.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="font-serif text-base font-medium text-ink">Northgate</span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
              Residential parking access · © 2026
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
