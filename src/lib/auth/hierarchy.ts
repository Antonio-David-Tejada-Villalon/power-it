import type { Role } from "@/models/User";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  encargado: "Encargado",
  operario: "Operario",
  cliente: "Cliente",
};

// Qué roles puede crear/editar/listar cada rol de staff (más allá de sí mismo).
const MANAGED_ROLES: Record<Role, Role[]> = {
  admin: ["admin", "supervisor", "encargado", "operario", "cliente"],
  supervisor: ["encargado", "operario"],
  encargado: ["operario"],
  operario: [],
  cliente: [],
};

// A quién se elevan las solicitudes de edición generadas por cada rol.
const DIRECT_MANAGER: Record<Role, Role | null> = {
  admin: null,
  supervisor: "admin",
  encargado: "supervisor",
  operario: "encargado",
  cliente: null,
};

export function manageableRoles(actorRole: Role): Role[] {
  return MANAGED_ROLES[actorRole] ?? [];
}

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "admin") return true;
  return manageableRoles(actorRole).includes(targetRole);
}

export function directManagerRole(role: Role): Role | null {
  return DIRECT_MANAGER[role];
}

interface ReviewableActor {
  role: Role;
  id: string;
  canApproveOwnEdits?: boolean;
}

/**
 * Una solicitud siempre escala al gerente directo de quien la generó (o al
 * admin, que puede actuar sobre cualquiera). Un supervisor puede además
 * autoaprobar sus propias solicitudes -si el admin le otorgó ese privilegio-
 * pero solo cuando el cambio es sobre su propia cuenta, no sobre un
 * subordinado que haya editado.
 */
export function canReviewRequest(
  actor: ReviewableActor,
  requesterRole: Role,
  requesterId: string,
  targetUserId: string
): boolean {
  if (actor.role === "admin") return true;
  const isSelfEdit = requesterId === actor.id && targetUserId === actor.id;
  if (isSelfEdit) {
    return actor.role === "supervisor" && Boolean(actor.canApproveOwnEdits);
  }
  if (requesterId === actor.id) return false;
  return manageableRoles(actor.role).includes(requesterRole);
}

/**
 * Roles cuyas solicitudes (propias o de subordinados) puede ver un actor,
 * aunque no siempre pueda actuar sobre todas (ver canReviewRequest).
 */
export function visibleRequestRoles(actorRole: Role): Role[] {
  if (actorRole === "admin") return ["admin", "supervisor", "encargado", "operario", "cliente"];
  return manageableRoles(actorRole);
}
