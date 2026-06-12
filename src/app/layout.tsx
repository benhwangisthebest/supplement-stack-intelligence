import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/layout/TopNav";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "Supplement Stack Intelligence",
  description:
    "A personalized supplement research and stack intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-neutral-900 antialiased">
        <TopNav />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-neutral-200">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <Disclaimer variant="general" />
          </div>
        </footer>
      </body>
    </html>
  );
}
