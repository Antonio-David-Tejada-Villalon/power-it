import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User, ROLES } from "@/models/User";
import { permissionsForRole } from "@/lib/auth/permissions";
import { toClientUser } from "@/lib/serializers";
import { requireRole, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  permissions: z.array(z.string()).optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    await connectDB();
    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    return NextResponse.json({ user: toClientUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = UserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de usuario inválidos" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.role && !parsed.data.permissions) {
      updates.permissions = permissionsForRole(parsed.data.role);
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(id, updates, { returnDocument: 'after' });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "user.update",
      resourceType: "user",
      resourceId: id,
      metadata: updates,
      request,
    });

    return NextResponse.json({ user: toClientUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await params;
    await connectDB();
    const user = await User.findByIdAndUpdate(id, { status: "suspended" }, { returnDocument: 'after' });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "user.suspend",
      resourceType: "user",
      resourceId: id,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
