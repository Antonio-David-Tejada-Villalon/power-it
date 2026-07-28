import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { requireRole, handleApiError } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin", "supervisor"]);
    await connectDB();

    const params = request.nextUrl.searchParams;
    const limit = Math.min(500, Number(params.get("limit") ?? 200));
    const action = params.get("action");
    const actor = params.get("actor");
    const resourceType = params.get("resourceType");
    const from = params.get("from");
    const to = params.get("to");

    const query: Record<string, unknown> = {};
    if (action) query.action = { $regex: action, $options: "i" };
    if (actor) query.actorEmail = { $regex: actor, $options: "i" };
    if (resourceType && resourceType !== "todos") query.resourceType = resourceType;
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
      query.createdAt = createdAt;
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    return NextResponse.json({
      items: logs.map((log) => ({
        id: String(log._id),
        actor: log.actor ? String(log.actor) : null,
        actorEmail: log.actorEmail,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: log.metadata,
        ip: log.ip,
        createdAt: log.createdAt?.toISOString?.(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
