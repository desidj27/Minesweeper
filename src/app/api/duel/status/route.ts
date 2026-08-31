import { NextResponse } from "next/server";
import { eq, or, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { duelMatches, duelQueue } from "@/lib/db/schema";
import { getQueueStatus } from "@/lib/duel/matchmaking";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ state: "unauthenticated" });
  }

  const db = await getDb();

  const activeMatches = await db
    .select({ id: duelMatches.id })
    .from(duelMatches)
    .where(
      and(
        eq(duelMatches.status, "active"),
        or(
          eq(duelMatches.player1Id, user.id),
          eq(duelMatches.player2Id, user.id)
        )
      )
    )
    .limit(1);

  if (activeMatches[0]) {
    return NextResponse.json({
      state: "matched",
      matchId: activeMatches[0].id,
    });
  }

  const queue = await getQueueStatus(user.id);
  if (queue) {
    return NextResponse.json({
      state: "queued",
      difficulty: queue.difficulty,
    });
  }

  return NextResponse.json({ state: "idle" });
}
