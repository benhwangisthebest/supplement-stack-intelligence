import Link from "next/link";
import { EffectGradeBadge } from "@/components/evidence/EffectGradeBadge";

// Marketing landing — Cal.com editorial rhythm: white hero → light-gray feature
// cards → white product-mockup band → light CTA band → dark footer (layout).
export default function HomePage() {
  return (
    <main>
      {/* Hero band — 7/5 split: headline left, product mockup card right */}
      <section className="container-page grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[7fr_5fr]">
        <div>
          <span className="badge">Evidence-first · user-controlled</span>
          <h1 className="display-xl mt-5">
            Does your supplement stack actually make sense?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
            Search supplements, understand the evidence, build your stack, and
            see what actually fits your body — graded by effect, not hype.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/library" className="btn-primary">
              Explore the Library
            </Link>
            <Link href="/stack-lab" className="btn-secondary">
              Build a stack
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Educational and decision-support — not medical advice.
          </p>
        </div>

        <HeroMockup />
      </section>

      {/* Three pillars — light-gray feature cards */}
      <section className="container-page section">
        <h2 className="display-md max-w-2xl">
          Three pillars, one core loop.
        </h2>
        <p className="mt-3 max-w-2xl text-body">
          Library builds understanding. Profile gives context. Stack Lab turns
          both into a practical, editable strategy.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <FeatureCard
            tag="Library"
            href="/library"
            title="Understand the evidence"
            body="Search supplements and read effect-level evidence grades, dosing ranges, mechanisms, side effects, and study summaries — organized by strength, never overstated."
          />
          <FeatureCard
            tag="Profile"
            href="/profile"
            title="Your living health context"
            body="Goals, diet, allergies, medications, preferences, and lab markers — a context file you improve over time that personalizes every evaluation."
          />
          <FeatureCard
            tag="Stack Lab"
            href="/stack-lab"
            title="Build, evaluate, optimize"
            body="Assemble stacks, run an evidence-aware evaluation, generate protocols from your profile, and match real products — with you in control."
          />
        </div>
      </section>

      {/* Product mockup band — show the actual product chrome */}
      <section className="container-page section">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="badge">Stack evaluation</span>
            <h2 className="display-sm mt-5 max-w-md">
              Recommendations you can interrogate.
            </h2>
            <p className="mt-4 max-w-md text-body">
              Every flag explains itself — why it fired, how strong the evidence
              is, and what would raise confidence. The app evaluates your
              choices instead of blocking them.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Evidence & dose fit against your goals",
                "Redundancy, interaction, and allergy flags",
                "Lab-informed prioritization when data exists",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-body">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <EvaluationMockup />
        </div>
      </section>

      {/* Pre-footer CTA band */}
      <section className="container-page section">
        <div className="rounded-lg bg-surface-card px-8 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="display-sm mx-auto max-w-xl">
            Build a smarter supplement stack — with evidence and control.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/library" className="btn-primary">
              Start with the Library
            </Link>
            <Link href="/profile" className="btn-secondary">
              Set up your Profile
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  tag,
  title,
  body,
  href,
}: {
  tag: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card-feature group block transition-colors hover:bg-surface-strong/60"
    >
      <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">
        {tag}
      </span>
      <h3 className="mt-3 text-title-md text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-body">{body}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink">
        Open
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}

// A product-UI fragment shown directly in-card — a supplement detail snapshot.
function HeroMockup() {
  return (
    <div className="card overflow-hidden shadow-card-hover">
      <div className="flex items-center gap-1.5 border-b border-hairline px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-surface-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-surface-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-surface-strong" />
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-title-md text-ink">Creatine monohydrate</h3>
            <p className="text-xs text-muted">Performance · Foundational</p>
          </div>
          <EffectGradeBadge grade="A" confidence="high" />
        </div>

        <div className="mt-5 space-y-3">
          {[
            { effect: "Strength & power output", grade: "A" as const },
            { effect: "Cognitive support (specific contexts)", grade: "B" as const },
            { effect: "Mood", grade: "C" as const },
          ].map((row) => (
            <div
              key={row.effect}
              className="flex items-center justify-between rounded-md border border-hairline px-3 py-2.5"
            >
              <span className="text-sm text-body">{row.effect}</span>
              <EffectGradeBadge grade={row.grade} />
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-md bg-surface-soft px-3 py-2.5">
          <span className="text-xs text-muted">Common dose</span>
          <span className="text-sm font-semibold text-ink">3–5 g / day</span>
        </div>
      </div>
    </div>
  );
}

// Evaluation flags fragment.
function EvaluationMockup() {
  const flags = [
    { sev: "Recommended", tone: "bg-success/10 text-success", text: "Magnesium glycinate fits your sleep goal." },
    { sev: "Redundant", tone: "bg-warning/10 text-warning", text: "Two magnesium sources target the same mechanism." },
    { sev: "Flagged", tone: "bg-error/10 text-error", text: "Dose exceeds the common studied range." },
  ];
  return (
    <div className="card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-title-sm text-ink">Sleep stack · evaluation</h3>
        <span className="badge">5 items</span>
      </div>
      <div className="mt-5 space-y-3">
        {flags.map((f) => (
          <div key={f.sev} className="rounded-md border border-hairline p-3">
            <span
              className={`inline-flex rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${f.tone}`}
            >
              {f.sev}
            </span>
            <p className="mt-2 text-sm text-body">{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
