import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { toClientCategory } from "@/lib/serializers";
import { requirePermission, requireRole, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const CategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  order: z.number().optional(),
  status: z.enum(["activa", "inactiva"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("categories:write");
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = CategoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de categoría inválidos" }, { status: 400 });
    }

    await connectDB();
    const category = await Category.findByIdAndUpdate(id, parsed.data, { returnDocument: 'after' });
    if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "category.update",
      resourceType: "category",
      resourceId: id,
      metadata: parsed.data,
      request,
    });

    return NextResponse.json({ category: toClientCategory(category) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await params;
    await connectDB();

    const inUse = await Product.exists({ category: id });
    if (inUse) {
      return NextResponse.json(
        { error: "No se puede eliminar: hay productos en esta categoría" },
        { status: 409 }
      );
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "category.delete",
      resourceType: "category",
      resourceId: id,
      metadata: { name: category.name },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
