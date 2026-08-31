import { NextResponse } from "next/server";
import { getDb, saveDatabase } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { newId, newSeed } from "@/lib/id";
import { currentSeasonId } from "@/lib/game/constants";
import type { Difficulty } from "@/lib/game/types";
import { DIFFICULTIES } from "@/lib/game/constants";

const VALID_DIFFICULTIES = new Set<string>(["beginner", "intermediate", "expert"]);

export async function POST(request: Request) {
  const body = await request.json();
  const difficulty = body.difficulty as Difficulty;
  const ranked = Boolean(body.ranked);

  if (!VALID_DIFFICULTIES.has(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (ranked && !user) {
    return NextResponse.json(
      { error: "Sign in required for ranked games" },
      { status: 401 }
    );
  }

  const config = DIFFICULTIES[difficulty];
  const id = newId();
  const seed = newSeed();
  const db = await getDb();

  await db.insert(games).values({
    id,
    userId: user?.id ?? null,
    seed,
    difficulty,
    mode: "standard",
    ranked,
    status: "playing",
    seasonId: ranked ? currentSeasonId() : null,
    startedAt: new Date(),
  });

  await saveDatabase();

  return NextResponse.json({
    gameId: id,
    seed,
    difficulty,
    ranked,
    width: config.width,
    height: config.height,
    mines: config.mines,
  });
}
