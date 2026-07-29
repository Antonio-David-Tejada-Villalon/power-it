"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import { formatPrice } from "@/lib/currency";
import type { Order } from "@/lib/types";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/orders?own=true")
      .then((res) => res.json())
      .then((data) => setOrders(data.items ?? []));
  }, []);

  const columns: Column<Order>[] = [
    { key: "orderNumber", header: "Pedido", render: (o) => <span className="font-semibold">{o.orderNumber}</span> },
    { key: "items", header: "Items", render: (o) => `${o.items.length} producto(s)` },
    { key: "total", header: "Total", render: (o) => formatPrice(o.total, o.currency) },
    { key: "status", header: "Estado", render: (o) => <Badge tone={o.status}>{o.status}</Badge> },
    { key: "date", header: "Fecha", render: (o) => new Date(o.createdAt).toLocaleDateString("es") },
  ];

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Logo className="h-8 w-auto object-contain" />
          <div>
            <h1 className="font-heading text-2xl font-bold">Mis pedidos</h1>
            <p className="text-sm text-foreground-secondary">Historial de tus solicitudes.</p>
          </div>
        </div>

        <DataTable columns={columns} data={orders} getRowId={(o) => o.id} emptyMessage="Todavía no tienes pedidos." />

        <Link href="/" className="inline-flex items-center gap-2 text-primary font-semibold text-sm">
          <ArrowLeft size={16} />
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
