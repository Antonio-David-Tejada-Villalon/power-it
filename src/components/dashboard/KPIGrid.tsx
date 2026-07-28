"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { DollarSign, ClipboardList, PackageX, Users, TrendingDown, XCircle } from "lucide-react";

interface KpiItem {
  label: string;
  value: number;
  format?: string;
}

const ICONS: Record<string, typeof DollarSign> = {
  "Ventas de hoy": DollarSign,
  "Ventas del período": DollarSign,
  "Pedidos del período": ClipboardList,
  "Pedidos de hoy": ClipboardList,
  "Pedidos asignados activos": ClipboardList,
  "Egresos (cancelados)": TrendingDown,
  "Pedidos cancelados": XCircle,
  "Productos sin stock": PackageX,
  "Usuarios activos": Users,
};

interface KPIGridProps {
  from?: string;
  to?: string;
}

export function KPIGrid({ from, to }: KPIGridProps) {
  const [kpis, setKpis] = useState<KpiItem[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/dashboard/kpis?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setKpis(data.kpis ?? []));
  }, [from, to]);

  if (kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => (
        <KPICard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          format={kpi.format as "currency" | undefined}
          icon={ICONS[kpi.label]}
        />
      ))}
    </div>
  );
}
