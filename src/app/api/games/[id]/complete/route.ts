import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb, saveDatabase } from "@/lib/db";
import { games, personalBests } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { replayMoves, validateMoves } from "@/lib/game/board";
import { DIFFICULTIES } from "@/lib/game/constants";
import type { Difficulty, Move } from "@/lib/game/types";
import { newId } from "@/lib/id";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const timeMs = Number(body.timeMs);
  const moves = body.moves as Move[];

  if (!Number.isFinite(timeMs) || timeMs < 100) {
    return NextResponse.json({ error: "Invalid time" }, { status: 400 });
  }
  if (!validateMoves(moves)) {
    return NextResponse.json({ error: "Invalid move log" }, { status: 400 });
  }

  const db = await getDb();
  const rows = await db.select().from(games).where(eq(games.id, id)).limit(1);
  const game = rows[0];

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "playing") {
    return NextResponse.json({ error: "Game already completed" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (game.ranked && (!user || user.id !== game.userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const difficulty = game.difficulty as Difficulty;
  const { board, valid } = replayMoves(game.seed, difficulty, moves);

  if (!valid || board.status !== "won") {
    await db
      .update(games)
      .set({
        status: "lost",
        completedAt: new Date(),
        movesJson: JSON.stringify(moves),
        clicks: moves.length,
      })
      .where(eq(games.id, id));

    await saveDatabase();
    return NextResponse.json({ accepted: false, reason: "Game not won" });
  }

  const threeBv = board.get3bv();
  const config = DIFFICULTIES[difficulty];

  if (threeBv < config.min3bv) {
    return NextResponse.json({
      accepted: false,
      reason: `Board 3BV (${threeBv}) below minimum (${config.min3bv})`,
    });
  }

  const maxCps = moves.length / (timeMs / 1000);
  if (maxCps > 15) {
    return NextResponse.json({
      accepted: false,
      reason: "Suspicious click rate",
    });
  }

  await db
    .update(games)
    .set({
      status: "won",
      completedAt: new Date(),
      timeMs: Math.round(timeMs),
      clicks: moves.length,
      threeBv,
      movesJson: JSON.stringify(moves),
    })
    .where(eq(games.id, id));

  let isPersonalBest = false;

  if (game.ranked && user) {
    const pbRows = await db
      .select()
      .from(personalBests)
      .where(
        and(
          eq(personalBests.userId, user.id),
          eq(personalBests.difficulty, difficulty),
          eq(personalBests.mode, "standard")
        )
      )
      .limit(1);

    const existing = pbRows[0];
    if (!existing || timeMs < existing.timeMs) {
      isPersonalBest = true;
      if (existing) {
        await db
          .update(personalBests)
          .set({
            timeMs: Math.round(timeMs),
            threeBv,
            gameId: id,
            achievedAt: new Date(),
          })
          .where(eq(personalBests.id, existing.id));
      } else {
        await db.insert(personalBests).values({
          id: newId(),
          userId: user.id,
          difficulty,
          mode: "standard",
          timeMs: Math.round(timeMs),
          threeBv,
          gameId: id,
          achievedAt: new Date(),
        });
      }
    }
  }

  await saveDatabase();

  return NextResponse.json({
    accepted: true,
    timeMs: Math.round(timeMs),
    threeBv,
    isPersonalBest,
    ranked: game.ranked,
  });
}
