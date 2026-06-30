"use client";

// A small chevron button used to minimize/expand a panel's body (Stack Lab UX).
// Keeps each panel self-contained: the header stays visible, only the body hides.
export function CollapseToggle({
  collapsed,
  onToggle,
  label,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Expand ${label}` : `Minimize ${label}`}
      title={collapsed ? `Expand ${label}` : `Minimize ${label}`}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-card hover:text-ink"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
        aria-hidden="true"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
