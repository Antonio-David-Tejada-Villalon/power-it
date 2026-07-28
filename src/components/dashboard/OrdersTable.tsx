"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface OrdersTableProps {
  canUpdateStatus: boolean;
  canDelete?: boolean;
  detailPathPrefix?: string;
}

export const STATUSES = ["pendiente", "confirmado", "en_proceso", "enviado", "completado", "cancelado"] as const;

export const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_proceso: "En proceso",
  enviado: "Enviado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const currency = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

type PendingAction =
  | { type: "status"; orderId: string; from: string; to: string }
  | { type: "delete"; ids: string[] };

function statusChangeMessage(order: Order, to: string): { title: string; description: string; tone: "default" | "danger" } {
  const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
  const from = STATUS_LABELS[order.status] ?? order.status;
  const toLabel = STATUS_LABELS[to] ?? to;

  if (to === "cancelado") {
    return {
      title: `Cancelar pedido ${order.orderNumber}`,
      description: `Se devolverán ${units} unidad(es) al stock de los productos de este pedido. Podrás reactivarlo más tarde si es necesario.`,
      tone: "danger",
    };
  }
  if (order.status === "cancelado") {
    return {
      title: `Reactivar pedido ${order.orderNumber}`,
      description: `Se descontarán ${units} unidad(es) del stock nuevamente (si hay disponibilidad) y el pedido pasará a "${toLabel}".`,
      tone: "default",
    };
  }
  return {
    title: `Cambiar estado de ${order.orderNumber}`,
    description: `El pedido pasará de "${from}" a "${toLabel}".`,
    tone: "default",
  };
}

export function OrdersTable({ canUpdateStatus, canDelete, detailPathPrefix = "/dashboard/admin/pedidos" }: OrdersTableProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const load = () => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.items ?? []));
  };
  useEffect(load, []);
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length };
    for (const s of STATUSES) c[s] = orders.filter((o) => o.status === s).length;
    return c;
  }, [orders]);

  const filtered = useMemo(
    () => (activeTab === "todos" ? orders : orders.filter((o) => o.status === activeTab)),
    [orders, activeTab]
  );

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const allSelected = filtered.every((o) => prev.has(o.id));
      if (allSelected) return new Set();
      return new Set(filtered.map((o) => o.id));
    });
  };

  const handleStatusChange = (order: Order, to: string) => {
    if (to === order.status) return;
    setPending({ type: "status", orderId: order.id, from: order.status, to });
  };

  const handleDeleteOne = (id: string) => setPending({ type: "delete", ids: [id] });
  const handleDeleteSelected = () => setPending({ type: "delete", ids: Array.from(selected) });

  const confirmPending = async () => {
    if (!pending) return;
    setError(null);

    if (pending.type === "status") {
      const res = await fetch(`/api/orders/${pending.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pending.to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo actualizar el pedido");
      }
    } else {
      for (const id of pending.ids) {
        await fetch(`/api/orders/${id}`, { method: "DELETE" });
      }
      setSelected(new Set());
    }

    setPending(null);
    load();
  };

  const dialogContent = useMemo(() => {
    if (!pending) return null;
    if (pending.type === "status") {
      const order = orders.find((o) => o.id === pending.orderId);
      if (!order) return null;
      return { ...statusChangeMessage(order, pending.to), confirmLabel: "Cambiar estado" };
    }
    const activeCount = orders.filter((o) => pending.ids.includes(o.id) && o.status !== "cancelado").length;
    return {
      title: `Eliminar ${pending.ids.length} pedido(s)`,
      description: `Esta acción no se puede deshacer.${
        activeCount > 0 ? ` Se devolverán al stock las unidades reservadas de ${activeCount} pedido(s) activo(s).` : ""
      }`,
      tone: "danger" as const,
      confirmLabel: "Eliminar",
    };
  }, [pending, orders]);

  const columns: Column<Order>[] = [];

  if (canDelete) {
    columns.push({
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={filtered.length > 0 && filtered.every((o) => selected.has(o.id))}
          onChange={toggleSelectAll}
          className="accent-primary"
        />
      ),
      render: (o) => (
        <input
          type="checkbox"
          checked={selected.has(o.id)}
          onChange={() => toggleSelected(o.id)}
          className="accent-primary"
        />
      ),
    });
  }

  columns.push(
    {
      key: "orderNumber",
      header: "Pedido",
      render: (o) => (
        <Link href={`${detailPathPrefix}/${o.id}`} className="font-semibold text-primary hover:underline">
          {o.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (o) => (
        <div>
          <p className="font-medium">{o.customer.name}</p>
          <p className="text-xs text-foreground-secondary">{o.customer.email}</p>
        </div>
      ),
    },
    { key: "items", header: "Items", render: (o) => `${o.items.length} producto(s)` },
    { key: "total", header: "Total", render: (o) => currency.format(o.total) },
    {
      key: "status",
      header: "Estado",
      render: (o) =>
        canUpdateStatus ? (
          <select
            value={o.status}
            onChange={(e) => handleStatusChange(o, e.target.value)}
            className="px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        ) : (
          <Badge tone={o.status}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Fecha",
      render: (o) => new Date(o.createdAt).toLocaleDateString("es"),
    }
  );

  if (canDelete) {
    columns.push({
      key: "actions",
      header: "",
      render: (o) => (
        <button onClick={() => handleDeleteOne(o.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger">
          <Trash2 size={16} />
        </button>
      ),
      className: "text-right",
    });
  }

  const tabs = [{ key: "todos", label: "Todos" }, ...STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] }))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5",
              activeTab === tab.key ? "bg-primary text-white" : "bg-black/5 dark:bg-white/5 hover:bg-primary/10"
            )}
          >
            {tab.label}
            <span className={cn("text-[10px]", activeTab === tab.key ? "text-white/70" : "text-foreground-secondary")}>
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {canDelete && selected.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-primary">{selected.size} seleccionado(s)</p>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 transition-colors"
          >
            <Trash2 size={14} />
            Eliminar seleccionados
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(o) => o.id}
        emptyMessage="Sin pedidos en esta categoría."
      />

      {dialogContent && (
        <ConfirmDialog
          open={!!pending}
          title={dialogContent.title}
          description={dialogContent.description}
          tone={dialogContent.tone}
          confirmLabel={dialogContent.confirmLabel}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
