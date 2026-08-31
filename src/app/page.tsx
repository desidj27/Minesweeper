import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { MatchmakingPanel } from "@/components/MatchmakingPanel";
import { DIFFICULTIES } from "@/lib/game/constants";
import type { Difficulty } from "@/lib/game/types";

const ORDER: Difficulty[] = ["beginner", "intermediate", "expert"];

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          Ranked Minesweeper Duels
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          1v1 races on the same board. Clear it before your opponent — or survive
          after they hit a mine. Wins and losses adjust your ELO rating.
        </p>
        {!user ? (
          <p className="text-sm">
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="text-[var(--accent)] hover:underline">
              sign up
            </Link>{" "}
            to play ranked duels.
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Playing as <span className="text-[var(--text)]">{user.username}</span>
            {" · "}
            <Link href="/leaderboard" className="text-[var(--accent)] hover:underline">
              View ELO leaderboard
            </Link>
          </p>
        )}
      </section>

      {user ? (
        <section className="grid gap-4 sm:grid-cols-3">
          {ORDER.map((diff) => (
            <MatchmakingPanel key={diff} difficulty={diff} />
          ))}
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-3">
          {ORDER.map((diff) => (
            <div
              key={diff}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 opacity-60"
            >
              <h2 className="text-lg font-semibold">{DIFFICULTIES[diff].label}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Sign in to queue</p>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
        <h3 className="mb-2 font-semibold text-[var(--text)]">Duel rules</h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Both players receive the identical mine layout</li>
          <li>Timer starts on your first click</li>
          <li>First player to fully clear the board wins</li>
          <li>If you hit a mine, you can still win if your opponent also explodes</li>
          <li>ELO updates when the duel ends (K=32)</li>
        </ul>
      </section>
    </div>
  );
}
