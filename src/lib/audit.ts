import { AuditLog } from "@/models/AuditLog";
import { connectDB } from "@/lib/db";

interface LogAuditInput {
  actorId?: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export async function logAudit({
  actorId,
  actorEmail,
  action,
  resourceType,
  resourceId,
  metadata,
  request,
}: LogAuditInput) {
  await connectDB();
  await AuditLog.create({
    actor: actorId || undefined,
    actorEmail,
    action,
    resourceType,
    resourceId,
    metadata,
    ip: request?.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request?.headers.get("user-agent") ?? undefined,
  });
}
