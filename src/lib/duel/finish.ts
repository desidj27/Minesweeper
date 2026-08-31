import { eq } from "drizzle-orm";
import { getDb, saveDatabase } from "@/lib/db";
import { duelMatches, users } from "@/lib/db/schema";
import {
  computeEloDeltas,
  resolveWinner,
  type DuelOutcome,
  type MatchWinner,
} from "@/lib/duel/resolve";

export async function submitDuelResult(
  matchId: string,
  userId: string,
  outcome: DuelOutcome,
  timeMs: number
) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(duelMatches)
    .where(eq(duelMatches.id, matchId))
    .limit(1);

  const match = rows[0];
  if (!match) return { error: "Match not found", status: 404 as const };
  if (match.status === "finished") {
    const result = await getMatchResult(matchId, userId);
    return { status: 200 as const, finalized: true, ...result };
  }

  const isPlayer1 = match.player1Id === userId;
  const isPlayer2 = match.player2Id === userId;
  if (!isPlayer1 && !isPlayer2) {
    return { error: "Not in this match", status: 403 as const };
  }

  const myOutcome = isPlayer1 ? match.player1Outcome : match.player2Outcome;
  if (myOutcome) {
    return { error: "Already submitted", status: 400 as const };
  }

  if (isPlayer1) {
    await db
      .update(duelMatches)
      .set({
        player1Outcome: outcome,
        player1TimeMs: Math.round(timeMs),
      })
      .where(eq(duelMatches.id, matchId));
  } else {
    await db
      .update(duelMatches)
      .set({
        player2Outcome: outcome,
        player2TimeMs: Math.round(timeMs),
      })
      .where(eq(duelMatches.id, matchId));
  }

  if (outcome === "won") {
    await finalizeMatch(matchId, userId);
    const result = await getMatchResult(matchId, userId);
    return { status: 200 as const, finalized: true, ...result };
  }

  const updated = (
    await db.select().from(duelMatches).where(eq(duelMatches.id, matchId)).limit(1)
  )[0]!;

  const opponentOutcome = isPlayer1
    ? updated.player2Outcome
    : updated.player1Outcome;
  const opponentId = isPlayer1 ? updated.player2Id : updated.player1Id;

  if (opponentOutcome === "won") {
    await finalizeMatch(matchId, opponentId);
    const result = await getMatchResult(matchId, userId);
    return { status: 200 as const, finalized: true, ...result };
  }

  const p1Done = updated.player1Outcome != null;
  const p2Done = updated.player2Outcome != null;

  if (p1Done && p2Done) {
    await finalizeMatch(matchId, null);
    const result = await getMatchResult(matchId, userId);
    return { status: 200 as const, finalized: true, ...result };
  }

  await saveDatabase();
  return {
    status: 200 as const,
    finalized: false,
    waitingForOpponent: true,
  };
}

async function finalizeMatch(matchId: string, winnerUserId: string | null) {
  const db = await getDb();
  const match = (
    await db.select().from(duelMatches).where(eq(duelMatches.id, matchId)).limit(1)
  )[0]!;

  if (match.status === "finished") return;

  let winner: MatchWinner;
  if (winnerUserId === match.player1Id) winner = "player1";
  else if (winnerUserId === match.player2Id) winner = "player2";
  else {
    winner = resolveWinner(
      {
        userId: match.player1Id,
        outcome: match.player1Outcome as DuelOutcome | null,
        timeMs: match.player1TimeMs,
      },
      {
        userId: match.player2Id,
        outcome: match.player2Outcome as DuelOutcome | null,
        timeMs: match.player2TimeMs,
      }
    );
  }

  const p1Row = (
    await db.select().from(users).where(eq(users.id, match.player1Id)).limit(1)
  )[0]!;
  const p2Row = (
    await db.select().from(users).where(eq(users.id, match.player2Id)).limit(1)
  )[0]!;

  const { newA, newB, deltaA, deltaB } = computeEloDeltas(
    p1Row.elo,
    p2Row.elo,
    winner
  );

  const winnerId =
    winner === "player1"
      ? match.player1Id
      : winner === "player2"
        ? match.player2Id
        : null;

  await db
    .update(duelMatches)
    .set({
      status: "finished",
      winnerId,
      player1EloDelta: deltaA,
      player2EloDelta: deltaB,
      finishedAt: new Date(),
    })
    .where(eq(duelMatches.id, matchId));

  await db.update(users).set({ elo: newA }).where(eq(users.id, match.player1Id));
  await db.update(users).set({ elo: newB }).where(eq(users.id, match.player2Id));

  await saveDatabase();
}

export async function getMatchResult(matchId: string, userId: string) {
  const db = await getDb();
  const match = (
    await db.select().from(duelMatches).where(eq(duelMatches.id, matchId)).limit(1)
  )[0];

  if (!match) return { error: "Match not found" };

  const isPlayer1 = match.player1Id === userId;
  const myDelta = isPlayer1 ? match.player1EloDelta : match.player2EloDelta;
  const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
  const opponentOutcome = isPlayer1
    ? match.player2Outcome
    : match.player1Outcome;
  const opponentTime = isPlayer1 ? match.player2TimeMs : match.player1TimeMs;
  const myTime = isPlayer1 ? match.player1TimeMs : match.player2TimeMs;
  const myOutcome = isPlayer1 ? match.player1Outcome : match.player2Outcome;

  const opponentUser = (
    await db
      .select({ username: users.username, elo: users.elo })
      .from(users)
      .where(eq(users.id, opponentId))
      .limit(1)
  )[0];

  const meUser = (
    await db.select({ elo: users.elo }).from(users).where(eq(users.id, userId)).limit(1)
  )[0];

  let won: boolean | null = null;
  if (match.status === "finished") {
    if (match.winnerId === userId) won = true;
    else if (match.winnerId === null) won = null;
    else won = false;
  }

  return {
    match: {
      id: match.id,
      status: match.status,
      difficulty: match.difficulty,
      seed: match.seed,
      safeX: match.safeX,
      safeY: match.safeY,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      winnerId: match.winnerId,
    },
    me: {
      outcome: myOutcome,
      timeMs: myTime,
      eloDelta: myDelta,
      elo: meUser?.elo ?? 1000,
      won,
    },
    opponent: {
      username: opponentUser?.username ?? "Unknown",
      elo: opponentUser?.elo ?? 1000,
      outcome: opponentOutcome,
      timeMs: match.status === "finished" ? opponentTime : null,
      finished: opponentOutcome != null,
    },
  };
}
