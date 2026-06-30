import Link from "next/link";
import { Disclaimer } from "@/components/ui/Disclaimer";

// Dark footer — the only dark surface on every page. The light-to-dark
// transition closes the page (DESIGN.md §Components → footer).
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Library",
    links: [
      { label: "Search supplements", href: "/library" },
      { label: "Evidence grades", href: "/library" },
      { label: "Research papers", href: "/library" },
    ],
  },
  {
    heading: "Profile",
    links: [
      { label: "Health context", href: "/profile" },
      { label: "Lab markers", href: "/profile" },
      { label: "Preferences", href: "/profile" },
    ],
  },
  {
    heading: "Stack Lab",
    links: [
      { label: "Build a stack", href: "/stack-lab" },
      { label: "Evaluation", href: "/stack-lab" },
      { label: "Product match", href: "/stack-lab" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-surface-dark text-on-dark-soft">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-on-dark"
            >
              <span className="inline-block h-5 w-5 rounded-full bg-on-dark" />
              Supplement Stack Intelligence
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-on-dark-soft">
              Make complex supplement science navigable — evidence first,
              user-controlled.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-on-dark">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-on-dark-soft transition-colors hover:text-on-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <Disclaimer variant="general" className="!text-on-dark-soft" />
          <p className="mt-4 text-xs text-on-dark-soft/70">
            © {new Date().getFullYear()} Supplement Stack Intelligence.
            Educational and decision-support only — not medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
