import type { Config } from "tailwindcss";

// Cal.com-style design system tokens (see .claude/DESIGN.md).
// Monochrome at the action layer: white canvas, near-black primary, light-gray
// cards, a single dark footer. Brand voltage comes from display typography.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand & action
        primary: {
          DEFAULT: "#111111",
          active: "#242424",
          disabled: "#e5e7eb",
        },
        brand: "#3b82f6",
        // Text
        ink: "#111111",
        body: "#374151",
        muted: {
          DEFAULT: "#6b7280",
          soft: "#898989",
        },
        // Surfaces
        canvas: "#ffffff",
        surface: {
          soft: "#f8f9fa",
          card: "#f5f5f5",
          strong: "#e5e7eb",
          dark: "#101010",
          "dark-elevated": "#1a1a1a",
        },
        hairline: {
          DEFAULT: "#e5e7eb",
          soft: "#f3f4f6",
        },
        "on-dark": {
          DEFAULT: "#ffffff",
          soft: "#a1a1aa",
        },
        // Semantic
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        // Badge pastels
        badge: {
          orange: "#fb923c",
          pink: "#ec4899",
          violet: "#8b5cf6",
          emerald: "#34d399",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["64px", { lineHeight: "1.05", letterSpacing: "-2px", fontWeight: "600" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-1.5px", fontWeight: "600" }],
        "display-md": ["36px", { lineHeight: "1.15", letterSpacing: "-1px", fontWeight: "600" }],
        "display-sm": ["28px", { lineHeight: "1.2", letterSpacing: "-0.5px", fontWeight: "600" }],
        "title-lg": ["22px", { lineHeight: "1.3", letterSpacing: "-0.3px", fontWeight: "600" }],
        "title-md": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "title-sm": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
      spacing: {
        section: "96px",
      },
      maxWidth: {
        content: "1200px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
