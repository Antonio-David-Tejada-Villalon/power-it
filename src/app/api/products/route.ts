import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { Product, type ProductDoc } from "@/models/Product";
import { toClientProduct } from "@/lib/serializers";
import { requirePermission, handleApiError } from "@/lib/auth/guard";
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

const SpecsSchema = z
  .record(z.string(), z.string())
  .refine(
    isValidSpecs,
    `Demasiadas especificaciones o un valor demasiado largo (máx. ${MAX_SPECS_COUNT} especificaciones, ${MAX_SPEC_KEY_LENGTH}/${MAX_SPEC_VALUE_LENGTH} caracteres por clave/valor)`
  );

const ImageUrlSchema = z
  .string()
  .url()
  .refine(isImageUrl, "La URL debe ser https y apuntar a una imagen (jpg, png, gif, webp, avif o svg)");

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const featured = searchParams.get("featured");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 100)));

  const query: QueryFilter<ProductDoc> = {};
  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (status) query.status = status as ProductDoc["status"];
  if (featured) query.featured = featured === "true";

  const [items, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  return NextResponse.json({
    items: items.map(toClientProduct),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
}

const ProductInputSchema = z.object({
  sku: z.string().min(1),
  isbn: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z
    .string()
    .max(PRODUCT_DESCRIPTION_MAX_LENGTH, `La descripción no puede superar los ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres`)
    .optional()
    .default(""),
  price: z.number().min(0),
  currency: z.enum(CURRENCIES).default("USD"),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().min(0).default(0),
  images: z.array(ImageUrlSchema).default([]),
  category: z.string().min(1),
  brand: z.string().optional(),
  specs: SpecsSchema.default({}),
  status: z.enum(["activo", "agotado", "descontinuado"]).default("activo"),
  featured: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("products:write");
    const body = await request.json().catch(() => null);
    const parsed = ProductInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de producto inválidos" },
        { status: 400 }
      );
    }

    await connectDB();
    const product = await Product.create({
      ...parsed.data,
      createdBy: session.sub,
      updatedBy: session.sub,
    });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "product.create",
      resourceType: "product",
      resourceId: String(product._id),
      metadata: { sku: product.sku, name: product.name },
      request,
    });

    return NextResponse.json({ product: toClientProduct(product) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
