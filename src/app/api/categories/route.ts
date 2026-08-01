import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { toClientCategory } from "@/lib/serializers";
import { requirePermission, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { resolveLevelForParent, CategoryTreeError } from "@/lib/categoryTree";

export async function GET() {
  await connectDB();
  const categories = await Category.find({}).sort({ level: 1, order: 1, name: 1 }).lean();
  return NextResponse.json({ items: categories.map(toClientCategory) });
}

const CategoryInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  parent: z.string().nullable().optional(),
  image: z.string().optional(),
  order: z.number().default(0),
  status: z.enum(["activa", "inactiva"]).default("activa"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("categories:write");
    const body = await request.json().catch(() => null);
    const parsed = CategoryInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de categoría inválidos" },
        { status: 400 }
      );
    }

    await connectDB();
    const { parent, ...rest } = parsed.data;

    let level: number;
    try {
      level = await resolveLevelForParent(parent ?? null);
    } catch (err) {
      if (err instanceof CategoryTreeError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    let category;
    try {
      category = await Category.create({ ...rest, parent: parent ?? null, level });
    } catch (err) {
      if (isDuplicateSlugError(err)) {
        return NextResponse.json(
          { error: "Ya existe una categoría con ese nombre en el mismo nivel" },
          { status: 409 }
        );
      }
      throw err;
    }

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "category.create",
      resourceType: "category",
      resourceId: String(category._id),
      metadata: { name: category.name, parent, level },
      request,
    });

    return NextResponse.json({ category: toClientCategory(category) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

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
