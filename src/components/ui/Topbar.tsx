"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ClientUser } from "@/lib/types";

interface TopbarProps {
  user: ClientUser;
  onOpenMenu: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  encargado: "Encargado",
  cliente: "Cliente",
};

export function Topbar({ user, onOpenMenu }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-20 border-b border-[color:var(--glass-border)] flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
      <button
        onClick={onOpenMenu}
        className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 md:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="hidden md:block">
        <p className="text-sm text-foreground-secondary">Bienvenido de nuevo,</p>
        <p className="font-heading font-semibold text-lg">{user.name}</p>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="hidden sm:inline-flex px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wide">
          {ROLE_LABEL[user.role] ?? user.role}
        </span>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="p-3 glass rounded-2xl hover:bg-danger/10 hover:border-danger/30 transition-all text-danger"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
