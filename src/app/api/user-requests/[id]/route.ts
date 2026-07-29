import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { UserEditRequest } from "@/models/UserEditRequest";
import { permissionsForRole } from "@/lib/auth/permissions";
import { canReviewRequest } from "@/lib/auth/hierarchy";
import { toClientUserEditRequest } from "@/lib/serializers";
import { requireRole, handleApiError, ApiAuthError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject", "delete"]),
  reason: z.string().min(3).max(500),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin", "supervisor", "encargado"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Indicá una acción y un motivo válidos" }, { status: 400 });
    }

    await connectDB();
    const editRequest = await UserEditRequest.findById(id);
    if (!editRequest) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    if (editRequest.status !== "pending") {
      return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 409 });
    }

    const actor = await User.findById(session.sub).select("role canApproveOwnEdits").lean();
    if (!actor) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const authorized = canReviewRequest(
      { role: session.role, id: session.sub, canApproveOwnEdits: actor.canApproveOwnEdits },
      editRequest.requestedByRole,
      String(editRequest.requestedBy),
      String(editRequest.targetUser)
    );
    if (!authorized) throw new ApiAuthError(403, "No podés revisar esta solicitud");

    const { action, reason } = parsed.data;

    if (action === "approve") {
      const changes = editRequest.changes ?? {};
      const updates: Record<string, unknown> = {};
      if (changes.name !== undefined) updates.name = changes.name;
      if (changes.status !== undefined) updates.status = changes.status;
      if (changes.role) {
        updates.role = changes.role;
        updates.permissions = permissionsForRole(changes.role);
      }
      if (changes.passwordHash) updates.passwordHash = changes.passwordHash;

      // Igual que en el PATCH directo de admin: si cambia la contraseña,
      // se invalidan los refresh tokens ya emitidos para esa cuenta.
      const mongoUpdate: Record<string, unknown> = { $set: updates };
      if (changes.passwordHash) mongoUpdate.$inc = { refreshTokenVersion: 1 };

      await User.findByIdAndUpdate(editRequest.targetUser, mongoUpdate);
    }

    const requestedById = String(editRequest.requestedBy);

    editRequest.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "deleted";
    editRequest.reviewedBy = session.sub as unknown as typeof editRequest.reviewedBy;
    editRequest.reviewReason = reason;
    editRequest.reviewedAt = new Date();
    await editRequest.save();

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: `user.edit_request.${action}`,
      resourceType: "user_edit_request",
      resourceId: id,
      metadata: { targetUser: String(editRequest.targetUser), reason },
      request,
    });

    await editRequest.populate([
      { path: "targetUser", select: "name email role" },
      { path: "requestedBy", select: "name email role" },
      { path: "reviewedBy", select: "name email role" },
    ]);

    return NextResponse.json({
      request: toClientUserEditRequest(editRequest, {
        canReview: false,
        isMine: requestedById === session.sub,
      }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
