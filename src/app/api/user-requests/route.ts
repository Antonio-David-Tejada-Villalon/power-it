import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { UserEditRequest } from "@/models/UserEditRequest";
import { manageableRoles, canReviewRequest } from "@/lib/auth/hierarchy";
import { toClientUserEditRequest } from "@/lib/serializers";
import { requireRole, handleApiError } from "@/lib/auth/guard";

export async function GET() {
  try {
    const session = await requireRole(["admin", "supervisor", "encargado", "operario"]);
    await connectDB();

    const actor = await User.findById(session.sub).select("role canApproveOwnEdits").lean();
    if (!actor) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const filter =
      session.role === "admin"
        ? {}
        : {
            $or: [
              { requestedByRole: { $in: manageableRoles(session.role) } },
              { requestedBy: session.sub },
            ],
          };

    const requests = await UserEditRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate([
        { path: "targetUser", select: "name email role" },
        { path: "requestedBy", select: "name email role" },
        { path: "reviewedBy", select: "name email role" },
      ])
      .lean();

    const items = requests.map((r) => {
      const requesterId = String(r.requestedBy?._id ?? r.requestedBy);
      const targetId = String(r.targetUser?._id ?? r.targetUser);
      const isMine = requesterId === session.sub;
      const canReview =
        r.status === "pending" &&
        canReviewRequest(
          { role: session.role, id: session.sub, canApproveOwnEdits: actor.canApproveOwnEdits },
          r.requestedByRole,
          requesterId,
          targetId
        );
      return toClientUserEditRequest(r, { canReview, isMine });
    });

    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
