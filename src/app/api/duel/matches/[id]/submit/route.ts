import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { submitDuelResult } from "@/lib/duel/finish";
import type { DuelOutcome } from "@/lib/duel/resolve";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const outcome = body.outcome as DuelOutcome;
  const timeMs = Number(body.timeMs);

  if (outcome !== "won" && outcome !== "lost") {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    return NextResponse.json({ error: "Invalid time" }, { status: 400 });
  }

  const result = await submitDuelResult(id, user.id, outcome, timeMs);

  if ("error" in result && result.status !== 200) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json(result);
}
