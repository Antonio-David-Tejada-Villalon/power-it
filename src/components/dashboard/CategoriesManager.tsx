"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Check, X, FolderTree } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { slugify, cn } from "@/lib/utils";
import {
  buildChildrenMap,
  getDescendantIds,
  CATEGORY_LEVEL_LABELS,
  MAX_CATEGORY_LEVEL,
} from "@/lib/categoryHierarchy";
import type { Category } from "@/lib/types";

interface NewCategoryDraft {
  name: string;
  description: string;
  image: string;
}

interface EditDraft {
  name: string;
  description: string;
  image: string;
  status: Category["status"];
  order: number;
  parent: string | null;
}

const emptyDraft: NewCategoryDraft = { name: "", description: "", image: "" };

const inputClass =
  "w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-lg outline-none transition-all text-sm";

export function CategoriesManager({ canDelete }: { canDelete: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined);
  const [newDraft, setNewDraft] = useState<NewCategoryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.items ?? []));
  };

  useEffect(load, []);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const childrenMap = useMemo(() => buildChildrenMap(categories), [categories]);
  const roots = childrenMap.get(null) ?? [];

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(categories.filter((c) => (childrenMap.get(c.id) ?? []).length > 0).map((c) => c.id)));
  };
  const collapseAll = () => setExpanded(new Set());

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForms = () => {
    setAddingUnder(undefined);
    setNewDraft(emptyDraft);
    setEditingId(null);
    setEditDraft(null);
    setError(null);
  };

  const handleCreate = async (e: FormEvent, parentId: string | null) => {
    e.preventDefault();
    if (!newDraft.name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newDraft.name.trim(),
        slug: slugify(newDraft.name),
        description: newDraft.description.trim() || undefined,
        image: newDraft.image.trim() || undefined,
        parent: parentId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la categoría");
      return;
    }
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    resetForms();
    load();
  };

  const startEdit = (category: Category) => {
    setAddingUnder(undefined);
    setEditingId(category.id);
    setEditDraft({
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
      status: category.status,
      order: category.order,
      parent: category.parent,
    });
  };

  const saveEdit = async (id: string) => {
    if (!editDraft || !editDraft.name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editDraft.name.trim(),
        slug: slugify(editDraft.name),
        description: editDraft.description.trim() || undefined,
        image: editDraft.image.trim() || undefined,
        status: editDraft.status,
        order: editDraft.order,
        parent: editDraft.parent,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo actualizar la categoría");
      return;
    }
    resetForms();
    load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const failures: string[] = [];
    for (const id of pendingDelete) {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const cat = categoriesById.get(id);
        failures.push(`${cat?.name ?? id}: ${data.error ?? "no se pudo eliminar"}`);
      }
    }
    setDeleteErrors(failures);
    setSelected(new Set());
    setPendingDelete(null);
    load();
  };

  // Opciones válidas para "mover a" al editar: no puede ser la propia
  // categoría, ninguno de sus descendientes (ciclo), ni una de nivel 3 (ya
  // no admite hijos).
  const validParentOptions = (excludeId: string) => {
    const descendants = getDescendantIds(excludeId, childrenMap);
    return categories.filter((c) => c.id !== excludeId && !descendants.has(c.id) && c.level < MAX_CATEGORY_LEVEL);
  };

  const renderNewForm = (parentId: string | null, depth: number) => (
    <form
      onSubmit={(e) => handleCreate(e, parentId)}
      className="flex flex-wrap items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl"
      style={{ marginLeft: depth * 1.5 + "rem" }}
    >
      <input
        autoFocus
        required
        value={newDraft.name}
        onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
        placeholder={parentId ? "Nombre de la subcategoría" : "Nombre de la categoría"}
        className={cn(inputClass, "flex-1 min-w-[180px]")}
      />
      <input
        value={newDraft.image}
        onChange={(e) => setNewDraft((d) => ({ ...d, image: e.target.value }))}
        placeholder="Imagen (URL, opcional)"
        className={cn(inputClass, "flex-1 min-w-[180px]")}
      />
      <input
        value={newDraft.description}
        onChange={(e) => setNewDraft((d) => ({ ...d, description: e.target.value }))}
        placeholder="Descripción (opcional)"
        className={cn(inputClass, "flex-[2] min-w-[220px]")}
      />
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        Crear
      </button>
      <button
        type="button"
        onClick={resetForms}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        Cancelar
      </button>
    </form>
  );

  const renderEditForm = (category: Category) => {
    if (!editDraft) return null;
    return (
      <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Nombre</label>
            <input
              autoFocus
              value={editDraft.name}
              onChange={(e) => setEditDraft((d) => d && { ...d, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Mover a</label>
            <select
              value={editDraft.parent ?? ""}
              onChange={(e) => setEditDraft((d) => d && { ...d, parent: e.target.value || null })}
              className={inputClass}
            >
              <option value="">— Nivel superior (Categoría) —</option>
              {validParentOptions(category.id).map((c) => (
                <option key={c.id} value={c.id}>
                  {"— ".repeat(c.level - 1)}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Imagen (URL)</label>
            <input
              value={editDraft.image}
              onChange={(e) => setEditDraft((d) => d && { ...d, image: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Orden</label>
            <input
              type="number"
              value={editDraft.order}
              onChange={(e) => setEditDraft((d) => d && { ...d, order: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground-secondary">Descripción</label>
            <input
              value={editDraft.description}
              onChange={(e) => setEditDraft((d) => d && { ...d, description: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground-secondary">Estado</label>
            <select
              value={editDraft.status}
              onChange={(e) => setEditDraft((d) => d && { ...d, status: e.target.value as Category["status"] })}
              className={inputClass}
            >
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => saveEdit(category.id)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
          >
            <Check size={14} />
            Guardar
          </button>
          <button
            onClick={resetForms}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={14} />
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderNode = (category: Category, depth: number) => {
    const children = childrenMap.get(category.id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(category.id);
    const isEditing = editingId === category.id;
    const canAddChild = category.level < MAX_CATEGORY_LEVEL;

    return (
      <div key={category.id} className="space-y-1.5">
        {isEditing ? (
          <div style={{ marginLeft: depth * 1.5 + "rem" }}>{renderEditForm(category)}</div>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group"
            style={{ marginLeft: depth * 1.5 + "rem" }}
          >
            <button
              onClick={() => hasChildren && toggleExpand(category.id)}
              className={cn("p-0.5 rounded text-foreground-secondary", !hasChildren && "opacity-0 pointer-events-none")}
              aria-label="Expandir"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {canDelete && (
              <input
                type="checkbox"
                checked={selected.has(category.id)}
                onChange={() => toggleSelected(category.id)}
                className="accent-primary"
              />
            )}

            <span className="font-semibold text-sm">{category.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-foreground-secondary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
              {CATEGORY_LEVEL_LABELS[category.level]}
            </span>
            {hasChildren && (
              <span className="text-[10px] text-foreground-secondary">
                {children.length} subcategoría{children.length === 1 ? "" : "s"}
              </span>
            )}
            <Badge tone={category.status}>{category.status}</Badge>

            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {canAddChild && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditDraft(null);
                    setNewDraft(emptyDraft);
                    setAddingUnder(category.id);
                    setExpanded((prev) => new Set(prev).add(category.id));
                  }}
                  title="Agregar subcategoría"
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                >
                  <Plus size={15} />
                </button>
              )}
              <button
                onClick={() => startEdit(category)}
                title="Editar"
                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
              >
                <Pencil size={15} />
              </button>
              {canDelete && (
                <button
                  onClick={() => setPendingDelete([category.id])}
                  disabled={hasChildren}
                  title={hasChildren ? "Eliminá primero sus subcategorías" : "Eliminar"}
                  className="p-1.5 rounded-lg hover:bg-danger/10 text-danger disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {addingUnder === category.id && renderNewForm(category.id, depth + 1)}

        {isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingId(null);
              setEditDraft(null);
              setNewDraft(emptyDraft);
              setAddingUnder(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            <Plus size={16} />
            Nueva categoría
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold text-foreground-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Colapsar todo
          </button>
        </div>

        {canDelete && selected.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
            <p className="text-sm font-semibold text-primary">{selected.size} seleccionada(s)</p>
            <button
              onClick={() => setPendingDelete(Array.from(selected))}
              className="flex items-center gap-2 px-3 py-1.5 bg-danger text-white rounded-lg text-xs font-semibold hover:bg-danger/90 transition-colors"
            >
              <Trash2 size={13} />
              Eliminar seleccionadas
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {deleteErrors.length > 0 && (
        <div className="text-sm text-danger bg-danger/10 rounded-xl p-3 space-y-1">
          {deleteErrors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      {addingUnder === null && renderNewForm(null, 0)}

      <div className="bg-card border border-[color:var(--glass-border)] rounded-2xl p-3 space-y-1.5">
        {roots.length === 0 ? (
          <div className="py-12 text-center text-foreground-secondary space-y-2">
            <FolderTree size={32} className="mx-auto opacity-50" />
            <p className="text-sm">Sin categorías todavía.</p>
          </div>
        ) : (
          roots.map((category) => renderNode(category, 0))
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Eliminar ${pendingDelete?.length ?? 0} categoría(s)`}
        description="Esta acción no se puede deshacer. Las categorías que tengan productos o subcategorías asociadas no se podrán eliminar."
        tone="danger"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
