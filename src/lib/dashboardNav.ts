import type { Role } from "@/models/User";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Users,
  ShieldCheck,
  Settings,
  Boxes,
  Inbox,
  UserCircle,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Resumen", icon: LayoutDashboard },
    { href: "/dashboard/admin/productos", label: "Productos", icon: Package },
    { href: "/dashboard/admin/categorias", label: "Categorías", icon: FolderTree },
    { href: "/dashboard/admin/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/dashboard/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/dashboard/admin/solicitudes", label: "Solicitudes", icon: Inbox },
    { href: "/dashboard/admin/auditoria", label: "Auditoría", icon: ShieldCheck },
    { href: "/dashboard/admin/configuracion", label: "Configuración", icon: Settings },
    { href: "/dashboard/manual", label: "Manual del sistema", icon: BookOpen },
    { href: "/dashboard/perfil", label: "Mi perfil", icon: UserCircle },
  ],
  supervisor: [
    { href: "/dashboard/supervisor", label: "Resumen", icon: LayoutDashboard },
    { href: "/dashboard/supervisor/productos", label: "Productos", icon: Package },
    { href: "/dashboard/supervisor/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/dashboard/supervisor/usuarios", label: "Usuarios", icon: Users },
    { href: "/dashboard/supervisor/solicitudes", label: "Solicitudes", icon: Inbox },
    { href: "/dashboard/manual", label: "Manual del sistema", icon: BookOpen },
    { href: "/dashboard/perfil", label: "Mi perfil", icon: UserCircle },
  ],
  encargado: [
    { href: "/dashboard/encargado", label: "Resumen", icon: LayoutDashboard },
    { href: "/dashboard/encargado/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/dashboard/encargado/inventario", label: "Inventario", icon: Boxes },
    { href: "/dashboard/encargado/usuarios", label: "Usuarios", icon: Users },
    { href: "/dashboard/encargado/solicitudes", label: "Solicitudes", icon: Inbox },
    { href: "/dashboard/perfil", label: "Mi perfil", icon: UserCircle },
  ],
  operario: [
    { href: "/dashboard/perfil", label: "Mi perfil", icon: UserCircle },
    { href: "/dashboard/operario/solicitudes", label: "Mis solicitudes", icon: Inbox },
  ],
  cliente: [],
};
