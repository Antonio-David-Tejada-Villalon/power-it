import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { toClientCategory } from "@/lib/serializers";
import { requirePermission, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

export async function GET() {
  await connectDB();
  const categories = await Category.find({}).sort({ order: 1, name: 1 }).lean();
  return NextResponse.json({ items: categories.map(toClientCategory) });
}

const CategoryInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
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
      return NextResponse.json({ error: "Datos de categoría inválidos" }, { status: 400 });
    }

    await connectDB();
    const category = await Category.create(parsed.data);

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "category.create",
      resourceType: "category",
      resourceId: String(category._id),
      metadata: { name: category.name },
      request,
    });

    return NextResponse.json({ category: toClientCategory(category) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
