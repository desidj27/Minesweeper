import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavAuth } from "@/components/NavAuth";

export const metadata: Metadata = {
  title: "Ranked Minesweeper",
  description: "Competitive minesweeper with ranked leaderboards and seasonal play",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Ranked Minesweeper
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/leaderboard" className="text-[var(--muted)] hover:text-[var(--text)]">
                Leaderboard
              </Link>
              <NavAuth />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
