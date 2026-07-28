"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import type { NavItem } from "@/lib/dashboardNav";

interface SidebarProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function Sidebar({ items, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="h-20 flex items-center px-6 border-b border-[color:var(--glass-border)]">
        <Logo className="h-8 w-auto object-contain" />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[color:var(--glass-border)]">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
        >
          ← Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
