import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const db = await getDb();

  const rows = await db
    .select({
      username: users.username,
      elo: users.elo,
    })
    .from(users)
    .orderBy(desc(users.elo))
    .limit(limit);

  return NextResponse.json({
    entries: rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      elo: r.elo,
    })),
  });
}
