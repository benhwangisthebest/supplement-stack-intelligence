import { DISCLAIMERS } from "@/lib/safety";

type DisclaimerKey = keyof typeof DISCLAIMERS;

// Renders standardized, non-diagnostic safety copy (Design §5, §7).
// All text comes from lib/safety — never inline it.
export function Disclaimer({
  variant = "general",
  className = "",
}: {
  variant?: DisclaimerKey;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={`text-xs leading-relaxed text-muted ${className}`}
    >
      {DISCLAIMERS[variant]}
    </p>
  );
}
