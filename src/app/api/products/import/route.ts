import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requirePermission, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

const VALID_STATUS = ["activo", "agotado", "descontinuado"] as const;

const RowSchema = z.object({
  SKU: z.union([z.string(), z.number()]).optional(),
  ISBN: z.union([z.string(), z.number()]).optional(),
  Nombre: z.string().optional(),
  Slug: z.string().optional(),
  Descripcion: z.string().optional(),
  Precio: z.union([z.string(), z.number()]).optional(),
  PrecioComparacion: z.union([z.string(), z.number()]).optional(),
  Stock: z.union([z.string(), z.number()]).optional(),
  Categoria: z.string().optional(),
  Marca: z.string().optional(),
  Imagenes: z.string().optional(),
  Especificaciones: z.string().optional(),
  Estado: z.string().optional(),
  Destacado: z.string().optional(),
});

const BodySchema = z.object({ items: z.array(RowSchema).min(1).max(2000) });

function toNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseSpecs(raw?: string): Record<string, string> {
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const pair of raw.split(";")) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function parseImages(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseFeatured(raw?: string): boolean {
  if (!raw) return false;
  return ["si", "sí", "true", "1", "yes"].includes(raw.trim().toLowerCase());
}

function isDuplicateKeyError(err: unknown): err is { keyValue?: Record<string, unknown> } {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("products:write");
    const body = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Formato de archivo inválido" }, { status: 400 });
    }

    await connectDB();
    const categories = await Category.find({}).lean();
    const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));

    let created = 0;
    let updated = 0;
    const errors: { row: number; sku?: string; message: string }[] = [];

    for (let i = 0; i < parsed.data.items.length; i++) {
      const row = parsed.data.items[i];
      const rowNum = i + 2; // fila 1 = encabezado

      const sku = row.SKU !== undefined ? String(row.SKU).trim().toUpperCase() : "";
      const name = row.Nombre?.trim() ?? "";
      const price = toNumber(row.Precio);
      const categoryName = row.Categoria?.trim() ?? "";

      const isBlankRow = !sku && !name && !categoryName && price === undefined;
      if (isBlankRow) continue;

      if (!sku) {
        errors.push({ row: rowNum, message: "Falta SKU" });
        continue;
      }
      if (!name) {
        errors.push({ row: rowNum, sku, message: "Falta Nombre" });
        continue;
      }
      if (price === undefined) {
        errors.push({ row: rowNum, sku, message: "Precio inválido o faltante" });
        continue;
      }
      if (!categoryName) {
        errors.push({ row: rowNum, sku, message: "Falta Categoria" });
        continue;
      }

      const category = categoryByName.get(categoryName.toLowerCase());
      if (!category) {
        errors.push({ row: rowNum, sku, message: `La categoría "${categoryName}" no existe` });
        continue;
      }

      const statusRaw = row.Estado?.trim().toLowerCase();
      if (statusRaw && !VALID_STATUS.includes(statusRaw as (typeof VALID_STATUS)[number])) {
        errors.push({
          row: rowNum,
          sku,
          message: `Estado "${row.Estado}" inválido (usar activo, agotado o descontinuado)`,
        });
        continue;
      }

      const stock = toNumber(row.Stock) ?? 0;
      const compareAtPrice = toNumber(row.PrecioComparacion);
      const isbnRaw = row.ISBN !== undefined ? String(row.ISBN).trim() : "";
      const slug = row.Slug?.trim() || slugify(name);

      const fields = {
        name,
        slug,
        description: row.Descripcion?.trim() ?? "",
        price,
        compareAtPrice,
        stock,
        images: parseImages(row.Imagenes),
        category: category._id,
        brand: row.Marca?.trim() || undefined,
        specs: parseSpecs(row.Especificaciones),
        status: (statusRaw as (typeof VALID_STATUS)[number]) ?? "activo",
        featured: parseFeatured(row.Destacado),
        updatedBy: session.sub,
      };

      try {
        const existing = await Product.findOne({ sku });
        if (existing) {
          const setFields: Record<string, unknown> = { ...fields };
          const unsetFields: Record<string, ""> = {};
          if (isbnRaw === "") unsetFields.isbn = "";
          else setFields.isbn = isbnRaw;

          await Product.updateOne(
            { _id: existing._id },
            { $set: setFields, ...(Object.keys(unsetFields).length ? { $unset: unsetFields } : {}) }
          );
          updated++;
        } else {
          await Product.create({
            sku,
            ...fields,
            isbn: isbnRaw || undefined,
            createdBy: session.sub,
          });
          created++;
        }
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          const field = err.keyValue ? Object.keys(err.keyValue)[0] : "campo único";
          errors.push({ row: rowNum, sku, message: `Ya existe un producto con ese ${field}` });
        } else {
          console.error("[products/import] fila", rowNum, err);
          errors.push({ row: rowNum, sku, message: "Error al guardar la fila" });
        }
      }
    }

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "product.bulk_import",
      resourceType: "product",
      metadata: { created, updated, errorCount: errors.length },
      request,
    });

    return NextResponse.json({ created, updated, errors });
  } catch (err) {
    return handleApiError(err);
  }
}
