import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Inter handles body + UI. Display headlines reuse Inter at weight 600 with
// negative tracking — the recommended Cal Sans substitute (DESIGN.md §Typography).
const inter = Inter({
  subsets: ["latin"],
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
