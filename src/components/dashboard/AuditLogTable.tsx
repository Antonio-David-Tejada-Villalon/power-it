"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Search, X } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { exportAuditToExcel, exportAuditToPDF, type AuditLogRow } from "@/lib/auditExport";

const RESOURCE_TYPES = ["todos", "product", "category", "order", "user", "user_edit_request", "settings"];

const emptyFilters = { action: "", actor: "", resourceType: "todos", from: "", to: "" };

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.resourceType !== "todos") params.set("resourceType", filters.resourceType);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    fetch(`/api/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setLogs(data.items ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Refetch al cambiar filtros; el indicador de carga es parte del mismo flujo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const inputClass =
    "px-3 py-2 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  const columns: Column<AuditLogRow>[] = [
    { key: "action", header: "Acción", render: (l) => <span className="font-semibold">{l.action}</span> },
    { key: "actor", header: "Usuario", render: (l) => l.actorEmail },
    {
      key: "resource",
      header: "Recurso",
      render: (l) => `${l.resourceType}${l.resourceId ? ` #${l.resourceId.slice(-6)}` : ""}`,
    },
    { key: "date", header: "Fecha", render: (l) => new Date(l.createdAt).toLocaleString("es") },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Acción</label>
            <input
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              placeholder="ej: order.update"
              className={`${inputClass} w-full`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Usuario</label>
            <input
              value={filters.actor}
              onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
              placeholder="email"
              className={`${inputClass} w-full`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Recurso</label>
            <select
              value={filters.resourceType}
              onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
              className={`${inputClass} w-full`}
            >
              {RESOURCE_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Desde</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className={`${inputClass} w-full`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Hasta</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className={`${inputClass} w-full`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => setFilters(emptyFilters)}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground-secondary hover:text-foreground"
          >
            <X size={14} />
            Limpiar filtros
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-secondary flex items-center gap-1">
              <Search size={12} />
              {loading ? "Buscando..." : `${logs.length} resultado(s)`}
            </span>
            <button
              onClick={() => exportAuditToExcel(logs, "Auditoria_PowerIT")}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-success/10 text-success rounded-lg text-xs font-semibold hover:bg-success/20 transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              onClick={() => exportAuditToPDF(logs, "Auditoria_PowerIT")}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-danger/10 text-danger rounded-lg text-xs font-semibold hover:bg-danger/20 transition-colors disabled:opacity-40"
            >
              <FileText size={14} />
              PDF
            </button>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={logs} getRowId={(l) => l.id} emptyMessage="Sin actividad registrada para estos filtros." />
    </div>
  );
}
