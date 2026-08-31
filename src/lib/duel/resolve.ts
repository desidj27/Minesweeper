import { applyElo } from "@/lib/elo";

export type DuelOutcome = "won" | "lost";

export interface PlayerResult {
  userId: string;
  outcome: DuelOutcome | null;
  timeMs: number | null;
}

export type MatchWinner = "player1" | "player2" | "draw" | null;

export function resolveWinner(
  p1: PlayerResult,
  p2: PlayerResult
): MatchWinner {
  if (p1.outcome === null || p2.outcome === null) return null;

  if (p1.outcome === "won" && p2.outcome !== "won") return "player1";
  if (p2.outcome === "won" && p1.outcome !== "won") return "player2";

  if (p1.outcome === "won" && p2.outcome === "won") {
    const t1 = p1.timeMs ?? Infinity;
    const t2 = p2.timeMs ?? Infinity;
    if (t1 < t2) return "player1";
    if (t2 < t1) return "player2";
    return "draw";
  }

  return "draw";
}

export function eloScoresForWinner(winner: MatchWinner): {
  player1Score: number;
  player2Score: number;
} {
  switch (winner) {
    case "player1":
      return { player1Score: 1, player2Score: 0 };
    case "player2":
      return { player1Score: 0, player2Score: 1 };
    case "draw":
      return { player1Score: 0.5, player2Score: 0.5 };
    default:
      return { player1Score: 0.5, player2Score: 0.5 };
  }
}

export function computeEloDeltas(
  player1Elo: number,
  player2Elo: number,
  winner: MatchWinner
) {
  const { player1Score, player2Score } = eloScoresForWinner(winner);
  return applyElo(player1Elo, player2Elo, player1Score);
}
