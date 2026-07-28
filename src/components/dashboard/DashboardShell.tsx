"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Drawer } from "@/components/ui/Drawer";
import { Topbar } from "@/components/ui/Topbar";
import { NAV_BY_ROLE } from "@/lib/dashboardNav";
import type { ClientUser } from "@/lib/types";

export function DashboardShell({ user, children }: { user: ClientUser; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = NAV_BY_ROLE[user.role];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-72 flex-shrink-0 border-r border-[color:var(--glass-border)]">
        <Sidebar items={items} />
      </aside>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar items={items} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar user={user} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 p-6 md:p-10 space-y-8">{children}</main>
      </div>
    </div>
  );
}
