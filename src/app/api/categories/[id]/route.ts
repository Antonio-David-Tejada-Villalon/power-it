import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { toClientCategory } from "@/lib/serializers";
import { requirePermission, requireRole, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import {
  resolveLevelForParent,
  isSameOrDescendant,
  recomputeDescendantLevels,
  getSubtreeDepth,
  CategoryTreeError,
} from "@/lib/categoryTree";
import { MAX_CATEGORY_LEVEL } from "@/lib/categoryHierarchy";

type Params = { params: Promise<{ id: string }> };

const CategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  parent: z.string().nullable().optional(),
  image: z.string().optional(),
  order: z.number().optional(),
  status: z.enum(["activa", "inactiva"]).optional(),
});

/** El índice único real es (parent, slug) — el mensaje genérico de
 * handleApiError diría "ese parent", así que este caso puntual se
 * intercepta antes para dar un mensaje que tenga sentido para quien lo lee. */
function isDuplicateSlugError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000 &&
    "slug" in ((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("categories:write");
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = CategoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de categoría inválidos" },
        { status: 400 }
      );
    }

    await connectDB();
    const { parent, ...rest } = parsed.data;
    const updates: Record<string, unknown> = { ...rest };
    const isReparenting = parent !== undefined;

    if (isReparenting) {
      if (parent) {
        if (parent === id) {
          return NextResponse.json({ error: "Una categoría no puede ser su propio padre" }, { status: 400 });
        }
        if (await isSameOrDescendant(parent, id)) {
          return NextResponse.json(
            { error: "No se puede mover una categoría dentro de su propia subrama" },
            { status: 400 }
          );
        }
      }

      try {
        updates.level = await resolveLevelForParent(parent ?? null);
      } catch (err) {
        if (err instanceof CategoryTreeError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }

      const subtreeDepth = await getSubtreeDepth(id);
      if ((updates.level as number) - 1 + subtreeDepth > MAX_CATEGORY_LEVEL) {
        return NextResponse.json(
          {
            error: `No se puede mover acá: esta categoría tiene subcategorías propias y superaría el máximo de ${MAX_CATEGORY_LEVEL} niveles`,
          },
          { status: 400 }
        );
      }

      updates.parent = parent ?? null;
    }

    let category;
    try {
      category = await Category.findByIdAndUpdate(id, updates, { returnDocument: "after" });
    } catch (err) {
      if (isDuplicateSlugError(err)) {
        return NextResponse.json(
          { error: "Ya existe una categoría con ese nombre en el mismo nivel" },
          { status: 409 }
        );
      }
      throw err;
    }
    if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    if (isReparenting) {
      await recomputeDescendantLevels(id, category.level);
    }

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

    const hasChildren = await Category.exists({ parent: id });
    if (hasChildren) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene subcategorías. Eliminá o reubicá esas primero." },
        { status: 409 }
      );
    }

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
