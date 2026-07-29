import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { NavPills } from "./NavPills";

// Clean three-pillar navigation (Design §5.1, Plan §4.1).
const PILLARS = [
  { href: "/library", label: "Library" },
  { href: "/profile", label: "Profile" },
  { href: "/stack-lab", label: "Stack Lab" },
];

export async function TopNav() {
  const user = await getUser();

  // The Advisor is an assistant over the three pillars (not a 4th pillar) —
  // only surfaced once signed in.
  const pillars = user
    ? [...PILLARS, { href: "/advisor", label: "Advisor" }]
    : PILLARS;

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

        <NavPills items={pillars} />

        <div className="flex items-center gap-2">
          {user ? (
            <form action={signOut}>
              <button type="submit" className="btn-secondary">
                Sign out
              </button>
            </form>
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
