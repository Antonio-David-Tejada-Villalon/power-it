import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User, ROLES } from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { permissionsForRole } from "@/lib/auth/permissions";
import { manageableRoles } from "@/lib/auth/hierarchy";
import { toClientUser } from "@/lib/serializers";
import { requireRole, handleApiError, ApiAuthError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireRole(["admin", "supervisor", "encargado"]);
    await connectDB();
    const visibleRoles = manageableRoles(session.role);
    const filter = session.role === "admin" ? {} : { role: { $in: visibleRoles } };
    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ items: users.map(toClientUser) });
  } catch (err) {
    return handleApiError(err);
  }
}

const UserInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["admin", "supervisor", "encargado"]);
    const body = await request.json().catch(() => null);
    const parsed = UserInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de usuario inválidos" }, { status: 400 });
    }

    if (session.role !== "admin" && !manageableRoles(session.role).includes(parsed.data.role)) {
      throw new ApiAuthError(403, "No podés crear usuarios con ese rol");
    }

    await connectDB();
    const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      phone: parsed.data.phone,
      permissions: permissionsForRole(parsed.data.role),
    });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "user.create",
      resourceType: "user",
      resourceId: String(user._id),
      metadata: { email: user.email, role: user.role },
      request,
    });

    return NextResponse.json({ user: toClientUser(user) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
