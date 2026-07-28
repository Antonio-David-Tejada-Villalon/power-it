"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, Save, Download } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { exportProductsToExcel } from "@/lib/productImportExport";
import type { Product } from "@/lib/types";

interface ProductsTableProps {
  canWrite: boolean;
  canDelete: boolean;
  stockOnly?: boolean;
  editPathPrefix?: string;
  selectable?: boolean;
  reloadToken?: number;
}

const currency = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

export function ProductsTable({
  canWrite,
  canDelete,
  stockOnly,
  editPathPrefix,
  selectable,
  reloadToken,
}: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    fetch("/api/products?limit=200")
      .then((res) => res.json())
      .then((data) => setProducts(data.items ?? []));
  };

  useEffect(load, [reloadToken]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  };

  const handleSaveStock = async (id: string) => {
    const stock = stockDrafts[id];
    if (stock === undefined) return;
    setSavingId(id);
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock }),
    });
    setSavingId(null);
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
    setSelected((prev) => (prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))));
  };

  const handleExportAll = () => exportProductsToExcel(products, "Productos_PowerIT");
  const handleExportSelected = () =>
    exportProductsToExcel(
      products.filter((p) => selected.has(p.id)),
      "Productos_PowerIT_Seleccion"
    );

  const columns: Column<Product>[] = [];

  if (selectable) {
    columns.push({
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={products.length > 0 && selected.size === products.length}
          onChange={toggleSelectAll}
          className="accent-primary"
        />
      ),
      render: (p) => (
        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelected(p.id)} className="accent-primary" />
      ),
    });
  }

  columns.push(
    {
      key: "product",
      header: "Producto",
      render: (p) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface flex-shrink-0">
            {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" />}
          </div>
          <div>
            <p className="font-semibold line-clamp-1">{p.name}</p>
            <p className="text-xs text-foreground-secondary">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoría",
      render: (p) => (typeof p.category === "object" ? p.category.name : "—"),
    },
    { key: "price", header: "Precio", render: (p) => currency.format(p.price) },
    {
      key: "stock",
      header: "Stock",
      render: (p) =>
        stockOnly ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              defaultValue={p.stock}
              onChange={(e) => setStockDrafts((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
              className="w-20 px-2 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => handleSaveStock(p.id)}
              disabled={savingId === p.id}
              className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
            >
              <Save size={14} />
            </button>
          </div>
        ) : (
          p.stock
        ),
    },
    { key: "status", header: "Estado", render: (p) => <Badge tone={p.status}>{p.status}</Badge> },
  );

  if (canWrite && !stockOnly) {
    columns.push({
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex items-center gap-2 justify-end">
          <Link
            href={`${editPathPrefix ?? "/dashboard/admin/productos"}/${p.id}/editar`}
            className="p-2 rounded-lg hover:bg-primary/10 text-primary"
          >
            <Pencil size={16} />
          </Link>
          {canDelete && (
            <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      className: "text-right",
    });
  }

  return (
    <div className="space-y-4">
      {selectable && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-foreground-secondary">
            {selected.size > 0 ? `${selected.size} seleccionado(s)` : `${products.length} producto(s)`}
          </p>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={handleExportSelected}
                className="flex items-center gap-1.5 px-3 py-2 bg-success/10 text-success rounded-lg text-xs font-semibold hover:bg-success/20 transition-colors"
              >
                <Download size={14} />
                Exportar seleccionados
              </button>
            )}
            <button
              onClick={handleExportAll}
              disabled={products.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"
            >
              <Download size={14} />
              Exportar todos
            </button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={products} getRowId={(p) => p.id} emptyMessage="Sin productos todavía." />
    </div>
  );
}
