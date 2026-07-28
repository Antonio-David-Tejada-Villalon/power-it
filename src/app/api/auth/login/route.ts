import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { comparePassword } from "@/lib/auth/password";
import { issueSessionCookies } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";
import { toClientUser } from "@/lib/serializers";
import { logAudit } from "@/lib/audit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email o contraseña inválidos" }, { status: 400 });
    }

    await connectDB();
    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

    if (!user || !user.passwordHash || user.status !== "active") {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      await logAudit({
        actorId: String(user._id),
        actorEmail: user.email,
        action: "login.failed",
        resourceType: "user",
        resourceId: String(user._id),
        request,
      });
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const permissions = user.permissions?.length ? user.permissions : permissionsForRole(user.role);

    await issueSessionCookies({
      id: String(user._id),
      role: user.role,
      permissions,
      refreshTokenVersion: user.refreshTokenVersion ?? 0,
      email: user.email,
    });

    user.lastLoginAt = new Date();
    await user.save();

    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      action: "login.success",
      resourceType: "user",
      resourceId: String(user._id),
      request,
    });

    return NextResponse.json({ user: toClientUser(user) });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
