import { NextResponse } from "next/server";
import { getSessionUser, findUserById } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await findUserById(session.id);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      elo: user.elo,
    },
  });
}
