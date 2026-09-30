import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Inter handles body + UI. Display headlines reuse Inter at weight 600 with
// negative tracking — the recommended Cal Sans substitute (DESIGN.md §Typography).
//
// Self-hosted so `next build` makes no network call (Phase 4 U18, FU-66, D-10).
// Each ./fonts/inter-<subset>-wght-normal.woff2 is `files/` of the same name from
// `npm pack @fontsource-variable/inter@5.3.0` (not a dependency):
//   tarball integrity sha512-OupL48va4JNofb97w6NYeF9S7W/kHNKM0Er8Dem5nqi4jeOLrVJDoE8tZEpnMJmtkvNbB1EIPPwHcdkF6b1oUA==
//   latin     sha256 3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62
//   latin-ext sha256 34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956
//   greek     sha256 1be3448e292fbf05ffe176fe1e43f135013d50b1e7d324ad1a558f623d3bb6f6
// Inter 4.001 (git-66647c0bb), wght axis 100–900, SIL OFL 1.1: the same builds
// Google Fonts served for these subsets before U18 (owner ruling Q-16 (b)).
// next/font/local cannot give a file its own unicode-range, so the three faces
// share one family and the browser falls through them by glyph coverage, last
// declared first. Latin must stay LAST: the fallback metrics come from the last
// file on a tie, and only latin has the a–z they are measured on.
// `weight` is the axis range; without it each @font-face is declared at 400 only.
const inter = localFont({
  src: [
    { path: "./fonts/inter-greek-wght-normal.woff2" },
    { path: "./fonts/inter-latin-ext-wght-normal.woff2" },
    { path: "./fonts/inter-latin-wght-normal.woff2" },
  ],
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Supplement Stack Intelligence",
  description:
    "A personalized supplement research and stack intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} [--font-display:var(--font-inter)]`}
    >
      <body className="flex min-h-screen flex-col">
        <TopNav />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
