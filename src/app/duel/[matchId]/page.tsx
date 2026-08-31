import Link from "next/link";
import { redirect } from "next/navigation";
import { DuelGame } from "@/components/DuelGame";
import { getSessionUser } from "@/lib/auth";
import { getMatchResult } from "@/lib/duel/finish";
import type { Difficulty } from "@/lib/game/types";

export default async function DuelMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { matchId } = await params;
  const data = await getMatchResult(matchId, user.id);

  if ("error" in data) {
    return (
      <div>
        <p>Match not found.</p>
        <Link href="/">Back home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Lobby
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Duel</h1>
      </div>
      <DuelGame
        matchId={matchId}
        initialMatch={{
          id: data.match.id,
          seed: data.match.seed,
          difficulty: data.match.difficulty as Difficulty,
          safeX: data.match.safeX,
          safeY: data.match.safeY,
          status: data.match.status,
        }}
        opponent={data.opponent}
      />
    </div>
  );
}
