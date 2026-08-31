import { eq, and, ne, asc } from "drizzle-orm";
import { getDb, saveDatabase } from "@/lib/db";
import { duelQueue, duelMatches, users } from "@/lib/db/schema";
import { newId, newSeed } from "@/lib/id";
import { duelSafeCell } from "@/lib/game/duel";
import type { Difficulty } from "@/lib/game/types";

export async function joinQueue(userId: string, difficulty: Difficulty) {
  const db = await getDb();

  const existing = await db
    .select()
    .from(duelQueue)
    .where(eq(duelQueue.userId, userId))
    .limit(1);

  if (existing[0]) {
    if (existing[0].difficulty === difficulty) {
      return { status: "queued" as const };
    }
    await db.delete(duelQueue).where(eq(duelQueue.userId, userId));
  }

  const opponents = await db
    .select()
    .from(duelQueue)
    .where(
      and(eq(duelQueue.difficulty, difficulty), ne(duelQueue.userId, userId))
    )
    .orderBy(asc(duelQueue.joinedAt))
    .limit(1);

  const opponent = opponents[0];

  if (opponent) {
    await db.delete(duelQueue).where(eq(duelQueue.userId, opponent.userId));

    const seed = newSeed();
    const { x: safeX, y: safeY } = duelSafeCell(difficulty);
    const matchId = newId();

    await db.insert(duelMatches).values({
      id: matchId,
      difficulty,
      seed,
      safeX,
      safeY,
      player1Id: opponent.userId,
      player2Id: userId,
      status: "active",
      createdAt: new Date(),
    });

    const opponentUser = await db
      .select({ username: users.username, elo: users.elo })
      .from(users)
      .where(eq(users.id, opponent.userId))
      .limit(1);

    await saveDatabase();

    return {
      status: "matched" as const,
      matchId,
      opponent: {
        username: opponentUser[0]?.username ?? "Unknown",
        elo: opponentUser[0]?.elo ?? 1000,
      },
    };
  }

  await db.insert(duelQueue).values({
    userId,
    difficulty,
    joinedAt: new Date(),
  });

  await saveDatabase();
  return { status: "queued" as const };
}

export async function leaveQueue(userId: string) {
  const db = await getDb();
  await db.delete(duelQueue).where(eq(duelQueue.userId, userId));
  await saveDatabase();
}

export async function getQueueStatus(userId: string) {
  const db = await getDb();
  const row = await db
    .select()
    .from(duelQueue)
    .where(eq(duelQueue.userId, userId))
    .limit(1);
  return row[0] ?? null;
}
