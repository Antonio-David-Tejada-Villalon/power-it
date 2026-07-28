import { NextResponse } from "next/server";
import { getSessionUser } from "./session";
import { hasPermission, hasAnyRole } from "./permissions";
import type { Role } from "@/models/User";
import type { AccessTokenPayload } from "./jwt";

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(): Promise<AccessTokenPayload> {
  const session = await getSessionUser();
  if (!session) throw new ApiAuthError(401, "No autenticado");
  return session;
}

export async function requirePermission(permission: string): Promise<AccessTokenPayload> {
  const session = await requireSession();
  if (!hasPermission(session, permission)) throw new ApiAuthError(403, "No autorizado");
  return session;
}

export async function requireRole(roles: Role[]): Promise<AccessTokenPayload> {
  const session = await requireSession();
  if (!hasAnyRole(session, roles)) throw new ApiAuthError(403, "No autorizado");
  return session;
}

interface MongoDuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (isDuplicateKeyError(err)) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    return NextResponse.json(
      { error: field ? `Ya existe un registro con ese ${field}` : "Registro duplicado" },
      { status: 409 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
