"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number | string;
  format?: "currency" | "number";
  icon?: LucideIcon;
}

const currency = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

export function KPICard({ label, value, format, icon: Icon }: KPICardProps) {
  const display = format === "currency" && typeof value === "number" ? currency.format(value) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-6 space-y-3 shadow-[var(--card-shadow)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground-secondary">{label}</p>
        {Icon && (
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Icon size={18} />
          </div>
        )}
      </div>
      <p className="font-heading text-3xl font-bold">{display}</p>
    </motion.div>
  );
}
