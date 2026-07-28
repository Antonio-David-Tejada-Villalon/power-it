"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { cn } from "@/lib/utils";
import type { UserEditRequest } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/auth/hierarchy";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  deleted: "Eliminada",
};

type Action = "approve" | "reject" | "delete";

const ACTION_COPY: Record<Action, { title: string; description: string; confirmLabel: string; tone: "default" | "danger" }> = {
  approve: {
    title: "Aprobar solicitud",
    description: "Los cambios propuestos se aplicarán al usuario de inmediato.",
    confirmLabel: "Aprobar",
    tone: "default",
  },
  reject: {
    title: "Rechazar solicitud",
    description: "El usuario que la solicitó verá que fue rechazada, sin aplicar ningún cambio.",
    confirmLabel: "Rechazar",
    tone: "danger",
  },
  delete: {
    title: "Eliminar solicitud",
    description: "La solicitud se descarta por completo, sin aplicar cambios.",
    confirmLabel: "Eliminar",
    tone: "danger",
  },
};

function ChangesSummary({ request }: { request: UserEditRequest }) {
  const parts: string[] = [];
  if (request.changes.name) parts.push(`Nombre: ${request.changes.name}`);
  if (request.changes.role) parts.push(`Rol: ${ROLE_LABELS[request.changes.role]}`);
  if (request.changes.status) parts.push(`Estado: ${request.changes.status === "active" ? "Activo" : "Suspendido"}`);
  if (request.changes.password) parts.push("Contraseña: (nueva)");
  if (parts.length === 0) return <span className="text-foreground-secondary">—</span>;
  return (
    <ul className="space-y-0.5">
      {parts.map((p) => (
        <li key={p} className="text-xs">
          {p}
        </li>
      ))}
    </ul>
  );
}

export function RequestsManager() {
  const [requests, setRequests] = useState<UserEditRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "deleted" | "todos">("pending");
  const [pendingAction, setPendingAction] = useState<{ id: string; action: Action } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/user-requests")
      .then((res) => res.json())
      .then((data) => setRequests(data.items ?? []));
  };

  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  const filtered = statusFilter === "todos" ? requests : requests.filter((r) => r.status === statusFilter);

  const handleReview = async (reason: string) => {
    if (!pendingAction) return;
    setError(null);
    const res = await fetch(`/api/user-requests/${pendingAction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: pendingAction.action, reason }),
    });
    setPendingAction(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar la solicitud");
      return;
    }
    load();
  };

  const columns: Column<UserEditRequest>[] = [
    {
      key: "requester",
      header: "Solicitante",
      render: (r) => (
        <div>
          <p className="font-semibold flex items-center gap-2">
            {r.requestedBy.name}
            {r.isMine && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">TUYA</span>}
          </p>
          <p className="text-xs text-foreground-secondary">{ROLE_LABELS[r.requestedBy.role]}</p>
        </div>
      ),
    },
    {
      key: "target",
      header: "Sobre el usuario",
      render: (r) => (
        <div>
          <p className="font-medium">{r.targetUser.name}</p>
          <p className="text-xs text-foreground-secondary">{r.targetUser.email}</p>
        </div>
      ),
    },
    { key: "changes", header: "Cambios propuestos", render: (r) => <ChangesSummary request={r} /> },
    {
      key: "reason",
      header: "Motivo",
      render: (r) => (
        <p className="text-xs text-foreground-secondary max-w-[16rem]" title={r.reason}>
          {r.reason}
        </p>
      ),
    },
    { key: "status", header: "Estado", render: (r) => <Badge tone={r.status === "pending" ? "pendiente" : undefined}>{STATUS_LABELS[r.status]}</Badge> },
    {
      key: "review",
      header: "Revisión",
      render: (r) =>
        r.status === "pending" ? (
          <span className="text-foreground-secondary text-xs">—</span>
        ) : (
          <div className="text-xs">
            <p className="font-medium">{r.reviewedBy?.name ?? "—"}</p>
            <p className="text-foreground-secondary max-w-[14rem]" title={r.reviewReason}>
              {r.reviewReason}
            </p>
          </div>
        ),
    },
    { key: "date", header: "Fecha", render: (r) => new Date(r.createdAt).toLocaleString("es") },
    {
      key: "actions",
      header: "",
      render: (r) =>
        r.canReview ? (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={() => setPendingAction({ id: r.id, action: "approve" })}
              className="p-2 rounded-lg hover:bg-success/10 text-success"
              aria-label="Aprobar"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setPendingAction({ id: r.id, action: "reject" })}
              className="p-2 rounded-lg hover:bg-warning/10 text-warning"
              aria-label="Rechazar"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => setPendingAction({ id: r.id, action: "delete" })}
              className="p-2 rounded-lg hover:bg-danger/10 text-danger"
              aria-label="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : null,
      className: "text-right",
    },
  ];

  const tabs: { key: typeof statusFilter; label: string }[] = [
    { key: "todos", label: "Todas" },
    { key: "pending", label: "Pendientes" },
    { key: "approved", label: "Aprobadas" },
    { key: "rejected", label: "Rechazadas" },
    { key: "deleted", label: "Eliminadas" },
  ];

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5",
              statusFilter === tab.key ? "bg-primary text-white" : "bg-black/5 dark:bg-white/5 hover:bg-primary/10"
            )}
          >
            {tab.label}
            <span className={cn("text-[10px]", statusFilter === tab.key ? "text-white/70" : "text-foreground-secondary")}>
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>
      <DataTable columns={columns} data={filtered} getRowId={(r) => r.id} emptyMessage="No hay solicitudes en este estado." />
      <ReasonDialog
        open={pendingAction !== null}
        title={pendingAction ? ACTION_COPY[pendingAction.action].title : ""}
        description={pendingAction ? ACTION_COPY[pendingAction.action].description : ""}
        confirmLabel={pendingAction ? ACTION_COPY[pendingAction.action].confirmLabel : "Confirmar"}
        tone={pendingAction ? ACTION_COPY[pendingAction.action].tone : "default"}
        reasonLabel="Motivo de la decisión"
        onConfirm={handleReview}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
