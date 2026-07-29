import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { toClientProduct } from "@/lib/serializers";
import { requireSession, handleApiError } from "@/lib/auth/guard";

/**
 * Carrito guardado del lado del servidor para clientes logueados — así no
 * se pierde al cambiar de dispositivo o borrar el navegador. Los invitados
 * siguen dependiendo solo de localStorage (no hay forma de identificarlos).
 */
export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const cart = await Cart.findOne({ user: session.sub }).populate("items.product").lean();
    const items = (cart?.items ?? [])
      .filter((item) => item.product)
      .map((item) => ({ ...toClientProduct(item.product), cantidad: item.quantity }));

    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

const SaveCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().min(1),
    })
  ),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = SaveCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de carrito inválidos" }, { status: 400 });
    }

    await connectDB();
    await Cart.findOneAndUpdate(
      { user: session.sub },
      { items: parsed.data.items.map((i) => ({ product: i.productId, quantity: i.quantity })) },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
