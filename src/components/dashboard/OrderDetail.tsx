"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { STATUSES, STATUS_LABELS } from "@/components/dashboard/OrdersTable";
import type { Order } from "@/lib/types";

const currency = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

interface OrderDetailProps {
  orderId: string;
  canDelete?: boolean;
  listPath?: string;
}

export function OrderDetail({ orderId, canDelete, listPath = "/dashboard/admin/pedidos" }: OrderDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => setOrder(data.order ?? null));
  };

  useEffect(load, [orderId]);

  const applyStatusChange = async (status: string) => {
    setError(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar el pedido");
    }
    setPendingStatus(null);
    load();
  };

  const handleDelete = async () => {
    await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    setConfirmDelete(false);
    router.push(listPath);
    router.refresh();
  };

  if (!order) return <p className="text-foreground-secondary">Cargando pedido...</p>;

  const units = order.items.reduce((acc, item) => acc + item.quantity, 0);
  const stockReserved = order.status !== "cancelado";

  const statusDialog = pendingStatus
    ? pendingStatus === "cancelado"
      ? {
          title: `Cancelar pedido ${order.orderNumber}`,
          description: `Se devolverán ${units} unidad(es) al stock. Podrás reactivarlo más tarde.`,
          tone: "danger" as const,
        }
      : order.status === "cancelado"
        ? {
            title: `Reactivar pedido ${order.orderNumber}`,
            description: `Se descontarán ${units} unidad(es) del stock nuevamente (si hay disponibilidad).`,
            tone: "default" as const,
          }
        : {
            title: `Cambiar estado de ${order.orderNumber}`,
            description: `Pasará de "${STATUS_LABELS[order.status]}" a "${STATUS_LABELS[pendingStatus]}".`,
            tone: "default" as const,
          }
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">{order.orderNumber}</h2>
            <p className="text-sm text-foreground-secondary">
              {order.customer.name} · {order.customer.email}
              {order.customer.phone ? ` · ${order.customer.phone}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={order.status}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="px-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {canDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-2 text-xs">
          <PackageCheck size={14} className={stockReserved ? "text-primary" : "text-foreground-secondary"} />
          <span className="text-foreground-secondary">
            {stockReserved
              ? `${units} unidad(es) reservada(s) del stock mientras este pedido esté activo.`
              : "Sin impacto en stock (pedido cancelado)."}
          </span>
        </div>

        <div className="divide-y divide-[color:var(--glass-border)]">
          {order.items.map((item) => (
            <div key={item.sku} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-foreground-secondary text-xs">{item.sku}</p>
              </div>
              <p>
                {item.quantity} × {currency.format(item.price)} = <strong>{currency.format(item.subtotal)}</strong>
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[color:var(--glass-border)]">
          <span className="font-semibold">Total</span>
          <span className="font-heading text-2xl font-bold text-primary">{currency.format(order.total)}</span>
        </div>

        {order.notes && (
          <p className="text-sm text-foreground-secondary">
            <strong>Notas:</strong> {order.notes}
          </p>
        )}

        <Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge>
      </div>

      {statusDialog && (
        <ConfirmDialog
          open={!!pendingStatus}
          title={statusDialog.title}
          description={statusDialog.description}
          tone={statusDialog.tone}
          confirmLabel="Cambiar estado"
          onConfirm={() => pendingStatus && applyStatusChange(pendingStatus)}
          onCancel={() => setPendingStatus(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Eliminar pedido ${order.orderNumber}`}
        description={`Esta acción no se puede deshacer.${stockReserved ? ` Se devolverán ${units} unidad(es) al stock.` : ""}`}
        tone="danger"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
