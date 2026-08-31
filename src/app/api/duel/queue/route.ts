import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { joinQueue, leaveQueue, getQueueStatus } from "@/lib/duel/matchmaking";
import type { Difficulty } from "@/lib/game/types";

const VALID = new Set<string>(["beginner", "intermediate", "expert"]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to duel" }, { status: 401 });
  }

  const body = await request.json();
  const difficulty = body.difficulty as Difficulty;
  if (!VALID.has(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  const result = await joinQueue(user.id, difficulty);
  return NextResponse.json(result);
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await leaveQueue(user.id);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ queued: false });
  }
  const row = await getQueueStatus(user.id);
  return NextResponse.json({
    queued: !!row,
    difficulty: row?.difficulty ?? null,
  });
}
