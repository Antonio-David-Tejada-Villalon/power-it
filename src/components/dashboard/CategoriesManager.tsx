"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { slugify } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoriesManager({ canDelete }: { canDelete: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; status: Category["status"] }>({
    name: "",
    status: "activa",
  });
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  const load = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.items ?? []));
  };

  useEffect(load, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la categoría");
      return;
    }
    setName("");
    load();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditDraft({ name: c.name, status: c.status });
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editDraft.name, slug: slugify(editDraft.name), status: editDraft.status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar la categoría");
      return;
    }
    setEditingId(null);
    load();
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === categories.length ? new Set() : new Set(categories.map((c) => c.id))));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const failures: string[] = [];
    for (const id of pendingDelete) {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const cat = categories.find((c) => c.id === id);
        failures.push(`${cat?.name ?? id}: ${data.error ?? "no se pudo eliminar"}`);
      }
    }
    setDeleteErrors(failures);
    setSelected(new Set());
    setPendingDelete(null);
    load();
  };

  const columns: Column<Category>[] = [];

  if (canDelete) {
    columns.push({
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={categories.length > 0 && selected.size === categories.length}
          onChange={toggleSelectAll}
          className="accent-primary"
        />
      ),
      render: (c) => (
        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} className="accent-primary" />
      ),
    });
  }

  columns.push(
    {
      key: "name",
      header: "Nombre",
      render: (c) =>
        editingId === c.id ? (
          <input
            autoFocus
            value={editDraft.name}
            onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
            className="px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary w-full"
          />
        ) : (
          <span className="font-semibold">{c.name}</span>
        ),
    },
    { key: "slug", header: "Slug", render: (c) => c.slug },
    {
      key: "status",
      header: "Estado",
      render: (c) =>
        editingId === c.id ? (
          <select
            value={editDraft.status}
            onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value as Category["status"] }))}
            className="px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="activa">Activa</option>
            <option value="inactiva">Inactiva</option>
          </select>
        ) : (
          <Badge tone={c.status}>{c.status}</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (c) =>
        editingId === c.id ? (
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => saveEdit(c.id)} className="p-2 rounded-lg hover:bg-success/10 text-success">
              <Check size={16} />
            </button>
            <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => startEdit(c)} className="p-2 rounded-lg hover:bg-primary/10 text-primary">
              <Pencil size={16} />
            </button>
            {canDelete && (
              <button onClick={() => setPendingDelete([c.id])} className="p-2 rounded-lg hover:bg-danger/10 text-danger">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      className: "text-right",
    }
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría (ej: Monitores)"
          className="flex-1 px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm"
        />
        <button className="px-5 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-hover transition-colors">
          <Plus size={18} />
          Agregar
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
      {deleteErrors.length > 0 && (
        <div className="text-sm text-danger bg-danger/10 rounded-xl p-3 space-y-1">
          {deleteErrors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      {canDelete && selected.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-primary">{selected.size} seleccionada(s)</p>
          <button
            onClick={() => setPendingDelete(Array.from(selected))}
            className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 transition-colors"
          >
            <Trash2 size={14} />
            Eliminar seleccionadas
          </button>
        </div>
      )}

      <DataTable columns={columns} data={categories} getRowId={(c) => c.id} emptyMessage="Sin categorías todavía." />

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Eliminar ${pendingDelete?.length ?? 0} categoría(s)`}
        description="Esta acción no se puede deshacer. Las categorías que tengan productos asociados no se podrán eliminar."
        tone="danger"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
