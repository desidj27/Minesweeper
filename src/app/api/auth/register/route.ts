import { NextResponse } from "next/server";
import { getDb, saveDatabase } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  createSession,
  hashPassword,
  setSessionCookie,
  findUserByUsername,
} from "@/lib/auth";
import { newId } from "@/lib/id";

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (username.length < 3 || username.length > 20) {
    return NextResponse.json(
      { error: "Username must be 3–20 characters" },
      { status: 400 }
    );
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username may only contain letters, numbers, and underscores" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const id = newId();
  const passwordHash = await hashPassword(password);
  const db = await getDb();

  await db.insert(users).values({
    id,
    username,
    passwordHash,
    elo: 1000,
    createdAt: new Date(),
  });

  await saveDatabase();

  const token = await createSession({ id, username });
  await setSessionCookie(token);

  return NextResponse.json({ user: { id, username } });
}
