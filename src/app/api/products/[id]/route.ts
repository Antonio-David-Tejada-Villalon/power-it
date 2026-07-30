import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { toClientProduct } from "@/lib/serializers";
import { requireSession, requireRole, handleApiError, ApiAuthError } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { CURRENCIES } from "@/lib/currency";
import {
  isImageUrl,
  isValidSpecs,
  MAX_SPECS_COUNT,
  MAX_SPEC_KEY_LENGTH,
  MAX_SPEC_VALUE_LENGTH,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
} from "@/lib/utils";

const ImageUrlSchema = z
  .string()
  .url()
  .refine(isImageUrl, "La URL debe ser https y apuntar a una imagen (jpg, png, gif, webp, avif o svg)");

const SpecsSchema = z
  .record(z.string(), z.string())
  .refine(
    isValidSpecs,
    `Demasiadas especificaciones o un valor demasiado largo (máx. ${MAX_SPECS_COUNT} especificaciones, ${MAX_SPEC_KEY_LENGTH}/${MAX_SPEC_VALUE_LENGTH} caracteres por clave/valor)`
  );

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await connectDB();
  const product = await Product.findById(id).populate("category", "name slug").lean();
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ product: toClientProduct(product) });
}

const StockOnlySchema = z.object({ stock: z.number().min(0) });

const ProductUpdateSchema = z.object({
  isbn: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z
    .string()
    .max(PRODUCT_DESCRIPTION_MAX_LENGTH, `La descripción no puede superar los ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres`)
    .optional(),
  price: z.number().min(0).optional(),
  currency: z.enum(CURRENCIES).optional(),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().min(0).optional(),
  images: z.array(ImageUrlSchema).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  specs: SpecsSchema.optional(),
  status: z.enum(["activo", "agotado", "descontinuado"]).optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const isEncargado = session.role === "encargado";
    if (isEncargado) {
      if (!hasPermission(session, "products:update_stock")) {
        throw new ApiAuthError(403, "No autorizado");
      }
      const parsed = StockOnlySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "El encargado solo puede actualizar el stock" },
          { status: 400 }
        );
      }
      await connectDB();
      const product = await Product.findByIdAndUpdate(
        id,
        { stock: parsed.data.stock, updatedBy: session.sub },
        { returnDocument: 'after' }
      );
      if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

      await logAudit({
        actorId: session.sub,
        actorEmail: session.email,
        action: "product.update_stock",
        resourceType: "product",
        resourceId: id,
        metadata: { stock: parsed.data.stock },
        request,
      });

      return NextResponse.json({ product: toClientProduct(product) });
    }

    if (!hasPermission(session, "products:write")) {
      throw new ApiAuthError(403, "No autorizado");
    }

    const parsed = ProductUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de producto inválidos" },
        { status: 400 }
      );
    }

    // isbn vacío se limpia con $unset (índice único disperso: dos productos
    // no pueden compartir isbn:"" como si fuera un valor real).
    const { isbn, ...rest } = parsed.data;
    const setFields: Record<string, unknown> = { ...rest, updatedBy: session.sub };
    const unsetFields: Record<string, ""> = {};
    if (isbn !== undefined) {
      if (isbn.trim() === "") unsetFields.isbn = "";
      else setFields.isbn = isbn.trim();
    }

    await connectDB();
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: setFields, ...(Object.keys(unsetFields).length ? { $unset: unsetFields } : {}) },
      { returnDocument: "after" }
    );
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "product.update",
      resourceType: "product",
      resourceId: id,
      metadata: parsed.data,
      request,
    });

    return NextResponse.json({ product: toClientProduct(product) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await params;
    await connectDB();
    const product = await Product.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "product.delete",
      resourceType: "product",
      resourceId: id,
      metadata: { sku: product.sku, name: product.name },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
