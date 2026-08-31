import { NextResponse } from "next/server";
import {
  createSession,
  findUserByUsername,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const user = await findUserByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession({ id: user.id, username: user.username });
  await setSessionCookie(token);

  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
