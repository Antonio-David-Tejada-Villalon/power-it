"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";

interface TopProduct {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
  image: string | null;
}

const currency = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

const MEDAL_COLORS = ["text-warning", "text-foreground-secondary", "text-[#B87333]"];

interface TopProductsRankingProps {
  from?: string;
  to?: string;
}

export function TopProductsRanking({ from, to }: TopProductsRankingProps) {
  const [items, setItems] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({ limit: "10" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/dashboard/top-products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-primary" />
        <h3 className="font-heading font-bold text-lg">Productos más vendidos</h3>
      </div>

      {loading ? (
        <p className="text-sm text-foreground-secondary">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground-secondary">Sin ventas en este período.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 py-2.5 border-b border-[color:var(--glass-border)] last:border-0"
            >
              <span className={`font-heading font-bold text-lg w-6 text-center ${MEDAL_COLORS[i] ?? "text-foreground-secondary"}`}>
                {i + 1}
              </span>
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
                <p className="text-xs text-foreground-secondary">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-sm">{item.unitsSold} unid.</p>
                <p className="text-xs text-foreground-secondary">{currency.format(item.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
