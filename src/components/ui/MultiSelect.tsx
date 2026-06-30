"use client";

// Checkbox-group multi-select (Design §5.4 — goals, form preferences).
export interface Option<T extends string> {
  value: T;
  label: string;
}

export function MultiSelect<T extends string>({
  options,
  selected,
  onChange,
  label,
}: {
  options: Option<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  label?: string;
}) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <fieldset>
      {label && (
        <legend className="mb-1 text-sm font-medium text-body">{label}</legend>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(o.value)}
              className={`rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-hairline text-body hover:border-muted"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
