"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Signature Cal.com nav-pill-group: a pill-radius wrapper around the pillar
// segments, the active segment a white pill with a subtle shadow.
export function NavPills({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="nav-pill-group hidden md:flex">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "nav-pill-active" : "nav-pill"}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
