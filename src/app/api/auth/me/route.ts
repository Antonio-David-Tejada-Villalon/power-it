import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionUser } from "@/lib/auth/session";
import { toClientUser } from "@/lib/serializers";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.sub);
  if (!user || user.status !== "active") {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: toClientUser(user) });
}
