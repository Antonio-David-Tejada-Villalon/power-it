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
    { href: "/dashboard/admin/auditoria", label: "Auditoría", icon: ShieldCheck },
    { href: "/dashboard/admin/configuracion", label: "Configuración", icon: Settings },
  ],
  supervisor: [
    { href: "/dashboard/supervisor", label: "Resumen", icon: LayoutDashboard },
    { href: "/dashboard/supervisor/productos", label: "Productos", icon: Package },
    { href: "/dashboard/supervisor/pedidos", label: "Pedidos", icon: ClipboardList },
  ],
  encargado: [
    { href: "/dashboard/encargado", label: "Resumen", icon: LayoutDashboard },
    { href: "/dashboard/encargado/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/dashboard/encargado/inventario", label: "Inventario", icon: Boxes },
  ],
  cliente: [],
};
