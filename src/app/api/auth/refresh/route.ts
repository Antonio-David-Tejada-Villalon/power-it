import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { issueSessionCookies, REFRESH_COOKIE } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";

export async function POST() {
  try {
    const jar = await cookies();
    const token = jar.get(REFRESH_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }

    const payload = await verifyRefreshToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(payload.sub);
    if (!user || user.status !== "active" || user.refreshTokenVersion !== payload.tokenVersion) {
      return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
    }

    const permissions = user.permissions?.length ? user.permissions : permissionsForRole(user.role);

    await issueSessionCookies({
      id: String(user._id),
      role: user.role,
      permissions,
      refreshTokenVersion: user.refreshTokenVersion ?? 0,
      email: user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/refresh]", err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
