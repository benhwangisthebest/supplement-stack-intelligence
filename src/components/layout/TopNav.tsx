import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { signOut } from "@/app/auth/actions";

// Clean three-pillar navigation (Design §5.1, Plan §4.1).
const PILLARS = [
  { href: "/library", label: "Library" },
  { href: "/profile", label: "Profile" },
  { href: "/stack-lab", label: "Stack Lab" },
];

export async function TopNav() {
  const user = await getUser();

  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Supplement Stack Intelligence
        </Link>

        <div className="flex items-center gap-6 text-sm">
          {PILLARS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="text-neutral-600 hover:text-neutral-900"
            >
              {p.label}
            </Link>
          ))}

          {user && (
            // The Advisor is an assistant over the three pillars (not a 4th pillar).
            <Link
              href="/advisor"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Advisor
            </Link>
          )}

          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
