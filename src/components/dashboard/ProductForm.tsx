"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wand2, ScanBarcode } from "lucide-react";
import { slugify } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

interface ProductFormProps {
  productId?: string;
}

interface SpecRow {
  key: string;
  value: string;
}

const emptyForm = {
  sku: "",
  isbn: "",
  name: "",
  slug: "",
  description: "",
  price: 0,
  stock: 0,
  images: "",
  category: "",
  brand: "",
  status: "activo" as Product["status"],
  featured: false,
};

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Los lectores de código de barras escriben como si fuera un teclado y
  // terminan con Enter — evitamos que eso envíe el formulario de una y en
  // cambio saltamos al siguiente campo, igual que haría un cajero.
  const handleScanKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nameInputRef.current?.focus();
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.items ?? []));
  }, []);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        const p: Product = data.product;
        setForm({
          sku: p.sku,
          isbn: p.isbn ?? "",
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          stock: p.stock,
          images: p.images.join(", "),
          category: typeof p.category === "object" ? p.category.id : p.category,
          brand: p.brand ?? "",
          status: p.status,
          featured: p.featured,
        });
        setSpecs(Object.entries(p.specs ?? {}).map(([key, value]) => ({ key, value })));
      });
  }, [productId]);

  const updateSpec = (index: number, field: "key" | "value", value: string) => {
    setSpecs((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeSpec = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      images: form.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      specs: Object.fromEntries(
        specs
          .map(({ key, value }) => [key.trim(), value.trim()])
          .filter(([key]) => key.length > 0)
      ),
    };

    const res = await fetch(productId ? `/api/products/${productId}` : "/api/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar el producto");
      return;
    }

    router.push("/dashboard/admin/productos");
    router.refresh();
  };

  const inputClass =
    "w-full px-4 py-3 bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl outline-none transition-all text-sm";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 bg-card border border-[color:var(--glass-border)] rounded-2xl p-8">
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold">SKU</label>
          <input
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            placeholder="Ej: LAP-001"
            className={inputClass}
          />
          <p className="text-xs text-foreground-secondary">
            Código único interno del producto. Usa letras, números y guiones, sin espacios (ej: categoría-###).
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Slug</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, slug: slugify(f.name) }))}
              disabled={!form.name}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-40 disabled:hover:text-primary"
            >
              <Wand2 size={12} />
              Generar desde nombre
            </button>
          </div>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="Ej: laptop-pro-14"
            className={inputClass}
          />
          <p className="text-xs text-foreground-secondary">
            Identificador para la URL del producto: minúsculas, sin espacios ni acentos, separado por guiones.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">ISBN / Código de barras</label>
        <div className="relative">
          <ScanBarcode
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary pointer-events-none"
          />
          <input
            value={form.isbn}
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
            onKeyDown={handleScanKeyDown}
            placeholder="Ej: 9781234567897 — escanea o escribe el código"
            className={`${inputClass} pl-11`}
          />
        </div>
        <p className="text-xs text-foreground-secondary">
          Opcional. Puedes escribirlo a mano o usar un lector de código de barras USB: funciona como un teclado, escanea
          y el código se completa solo.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">Nombre</label>
        <input
          required
          ref={nameInputRef}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Precio</label>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Stock</label>
          <input
            required
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Categoría</label>
          <select
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecciona...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Marca</label>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputClass} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">Imágenes (URLs separadas por coma)</label>
        <input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Estado</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Product["status"] })}
            className={inputClass}
          >
            <option value="activo">Activo</option>
            <option value="agotado">Agotado</option>
            <option value="descontinuado">Descontinuado</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold pb-3">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Producto destacado
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">Especificaciones</label>
          <button
            type="button"
            onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>

        {specs.length === 0 && (
          <p className="text-xs text-foreground-secondary">
            Sin especificaciones (ej: CPU, RAM, Material...).
          </p>
        )}

        <div className="space-y-2">
          {specs.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                placeholder="Clave (ej: RAM)"
                value={row.key}
                onChange={(e) => updateSpec(index, "key", e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Valor (ej: 16GB)"
                value={row.value}
                onChange={(e) => updateSpec(index, "value", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeSpec(index)}
                className="px-3 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl font-bold transition-colors"
      >
        {saving ? "Guardando..." : productId ? "Guardar cambios" : "Crear producto"}
      </button>
    </form>
  );
}
