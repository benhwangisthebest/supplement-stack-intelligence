import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { NavPills } from "./NavPills";

// Clean three-pillar navigation (Design §5.1, Plan §4.1).
//
// EXACTLY THREE, UNCONDITIONALLY (Phase 2 U24, §7 decision 1 ruled Option A).
// `CLAUDE.md` §1 and `docs/product-direction.md` §3.3 both state the three-item
// rule as PERMANENT. This array previously had `{href:"/advisor"}` appended for
// signed-in users and the result handed to a single `<NavPills>`, so an authed
// reader saw four pills in the pillar group. The v6 design decision that
// authorised the Advisor authorised a "top-level-adjacent surface … NOT a 4th
// main pillar" — so that was an implementation diverging from its own
// authorising decision, not unauthorised scope.
//
// The ruling did not relax the rule; the code moved to meet it. The Advisor is
// still reachable and still only for signed-in users — it is now rendered as a
// sibling of the sign-out control (below), which is what "top-level-adjacent"
// means in markup. THIS IS PLACEMENT, NOT REMOVAL.
//
// Exported for `src/architecture/nav-pillars.test.ts`, which asserts both the
// labels and — at source level — that this array reaches `NavPills`
// unconditionally. A fourth pillar cannot reappear ungoverned.
export const PILLARS = [
  { href: "/library", label: "Library" },
  { href: "/profile", label: "Profile" },
  { href: "/stack-lab", label: "Stack Lab" },
];

/** Top-level-adjacent, not a pillar. Signed-in only, as before. */
const ADVISOR = { href: "/advisor", label: "Advisor" };

export async function TopNav() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight text-ink"
        >
          <span className="inline-block h-5 w-5 rounded-full bg-ink" />
          Supplement Stack Intelligence
        </Link>

        <NavPills items={PILLARS} />

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href={ADVISOR.href} className="btn-ghost">
                {ADVISOR.label}
              </Link>
              <form action={signOut}>
                <button type="submit" className="btn-secondary">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/auth/login" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
