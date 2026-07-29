import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { issueSessionCookies } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";
import { toClientUser } from "@/lib/serializers";
import { logAudit } from "@/lib/audit";
import { linkGuestOrdersToUser } from "@/lib/orderLinking";

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de registro inválidos" }, { status: 400 });
    }

    await connectDB();
    const { name, email, password, phone } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const permissions = permissionsForRole("cliente");

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: "cliente",
      permissions,
    });

    await issueSessionCookies({
      id: String(user._id),
      role: user.role,
      permissions,
      refreshTokenVersion: user.refreshTokenVersion ?? 0,
      email: user.email,
    });

    await linkGuestOrdersToUser(String(user._id), user.email);

    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      action: "user.register",
      resourceType: "user",
      resourceId: String(user._id),
      request,
    });

    return NextResponse.json({ user: toClientUser(user) }, { status: 201 });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
