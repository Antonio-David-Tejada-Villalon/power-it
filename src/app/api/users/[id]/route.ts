import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User, ROLES } from "@/models/User";
import { UserEditRequest } from "@/models/UserEditRequest";
import { hashPassword, PasswordSchema } from "@/lib/auth/password";
import { permissionsForRole } from "@/lib/auth/permissions";
import { manageableRoles } from "@/lib/auth/hierarchy";
import { toClientUser, toClientUserEditRequest } from "@/lib/serializers";
import { requireRole, handleApiError, ApiAuthError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const UserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  permissions: z.array(z.string()).optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "suspended"]).optional(),
  password: PasswordSchema.optional(),
  canApproveOwnEdits: z.boolean().optional(),
  reason: z.string().min(3).max(500).optional(),
});

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin", "supervisor", "encargado", "operario"]);
    const { id } = await params;
    await connectDB();
    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const isSelf = id === session.sub;
    const isAdmin = session.role === "admin";
    if (!isAdmin && !isSelf && !manageableRoles(session.role).includes(user.role)) {
      throw new ApiAuthError(403, "No autorizado");
    }

    return NextResponse.json({ user: toClientUser(user) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin", "supervisor", "encargado", "operario"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = UserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de usuario inválidos" },
        { status: 400 }
      );
    }

    await connectDB();
    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const isSelf = id === session.sub;
    const isAdmin = session.role === "admin";

    if (!isAdmin && !isSelf && !manageableRoles(session.role).includes(target.role)) {
      throw new ApiAuthError(403, "No autorizado");
    }
    if (parsed.data.role && !isAdmin && !manageableRoles(session.role).includes(parsed.data.role)) {
      throw new ApiAuthError(403, "No podés asignar ese rol");
    }
    if (!isAdmin && isSelf && (parsed.data.role || parsed.data.status)) {
      return NextResponse.json(
        { error: "No podés solicitar un cambio de rol o estado para tu propio usuario" },
        { status: 400 }
      );
    }

    const { name, role, status, password, reason } = parsed.data;

    if (isAdmin) {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) {
        updates.role = role;
        if (!parsed.data.permissions) updates.permissions = permissionsForRole(role);
      }
      if (parsed.data.permissions !== undefined) updates.permissions = parsed.data.permissions;
      if (status !== undefined) updates.status = status;
      if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
      if (parsed.data.canApproveOwnEdits !== undefined) updates.canApproveOwnEdits = parsed.data.canApproveOwnEdits;
      if (password) updates.passwordHash = await hashPassword(password);

      // Cambiar la contraseña invalida cualquier refresh token emitido antes
      // (ver /api/auth/refresh, que compara refreshTokenVersion) — así una
      // sesión robada no sobrevive a un cambio de clave.
      const mongoUpdate: Record<string, unknown> = { $set: updates };
      if (password) mongoUpdate.$inc = { refreshTokenVersion: 1 };

      const updated = await User.findByIdAndUpdate(id, mongoUpdate, { returnDocument: "after" });

      await logAudit({
        actorId: session.sub,
        actorEmail: session.email,
        action: "user.update",
        resourceType: "user",
        resourceId: id,
        metadata: { ...updates, passwordHash: password ? "(cambiada)" : undefined },
        request,
      });

      return NextResponse.json({ user: toClientUser(updated) });
    }

    // No-admin: toda edición (propia o de un subordinado) queda como
    // solicitud pendiente de aprobación por el gerente correspondiente.
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Indicá un motivo para la solicitud" }, { status: 400 });
    }
    const changes: Record<string, unknown> = {};
    if (name !== undefined) changes.name = name;
    if (role !== undefined) changes.role = role;
    if (status !== undefined) changes.status = status;
    if (password) changes.passwordHash = await hashPassword(password);
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: "No hay cambios para solicitar" }, { status: 400 });
    }

    const editRequest = await UserEditRequest.create({
      targetUser: target._id,
      requestedBy: session.sub,
      requestedByRole: session.role,
      changes,
      reason: reason.trim(),
    });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "user.edit_request.create",
      resourceType: "user_edit_request",
      resourceId: String(editRequest._id),
      metadata: {
        targetUser: id,
        changes: { name, role, status, passwordChanged: Boolean(password) },
        reason: reason.trim(),
      },
      request,
    });

    await editRequest.populate([
      { path: "targetUser", select: "name email role" },
      { path: "requestedBy", select: "name email role" },
    ]);

    return NextResponse.json(
      { request: toClientUserEditRequest(editRequest, { canReview: false, isMine: true }) },
      { status: 202 }
    );
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
