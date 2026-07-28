import type { Role } from "@/models/User";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["*"],
  supervisor: [
    "products:read",
    "products:write",
    "categories:read",
    "categories:write",
    "orders:read",
    "orders:write",
    "users:read",
    "audit:read",
  ],
  encargado: [
    "products:read",
    "products:update_stock",
    "orders:read",
    "orders:update_status",
  ],
  operario: [],
  cliente: ["orders:own:read", "orders:own:create"],
};

export function permissionsForRole(role: Role): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export interface PermissionCheckable {
  role: Role;
  permissions?: string[];
}

export function hasPermission(user: PermissionCheckable | null | undefined, permission: string): boolean {
  if (!user) return false;
  const perms = user.permissions?.length ? user.permissions : permissionsForRole(user.role);
  return perms.includes("*") || perms.includes(permission);
}

export function hasAnyRole(user: PermissionCheckable | null | undefined, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
