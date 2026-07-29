import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import type { QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { Order, type OrderDoc } from "@/models/Order";
import { Product } from "@/models/Product";
import { toClientOrder } from "@/lib/serializers";
import { getSessionUser } from "@/lib/auth/session";
import { requirePermission, handleApiError } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { reserveStock } from "@/lib/inventory";
import { nextOrderNumber } from "@/lib/orderNumber";
import type { Currency } from "@/lib/currency";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("orders:read").catch(async (err) => {
      // Un cliente autenticado puede ver solo sus propios pedidos (?own=true)
      const own = request.nextUrl.searchParams.get("own");
      const fallbackSession = await getSessionUser();
      if (own === "true" && fallbackSession && hasPermission(fallbackSession, "orders:own:read")) {
        return fallbackSession;
      }
      throw err;
    });

    await connectDB();
    const own = request.nextUrl.searchParams.get("own") === "true";
    const status = request.nextUrl.searchParams.get("status");

    const query: QueryFilter<OrderDoc> = { deletedAt: null };
    if (own) query["customer.user"] = session.sub;
    if (status) query.status = status as OrderDoc["status"];
    if (session.role === "encargado" && !own) query.status = { $ne: "cancelado" };

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ items: orders.map(toClientOrder) });
  } catch (err) {
    return handleApiError(err);
  }
}

const OrderItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1),
});

const OrderInputSchema = z.object({
  items: z.array(OrderItemInput).min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = OrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de pedido inválidos" }, { status: 400 });
  }

  await connectDB();
  const session = await getSessionUser();

  const products = await Product.find({
    _id: { $in: parsed.data.items.map((i) => i.productId) },
  });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let items;
  let orderCurrency: Currency;
  try {
    items = parsed.data.items.map(({ productId, quantity }) => {
      const product = productMap.get(productId);
      if (!product) throw new Error(`Producto ${productId} no encontrado`);
      const subtotal = product.price * quantity;
      return {
        product: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        quantity,
        subtotal,
        currency: product.currency,
      };
    });

    // Un pedido no puede mezclar monedas: el total solo tiene sentido si
    // todos los items se suman en la misma unidad.
    const currencies = new Set(items.map((i) => i.currency));
    if (currencies.size > 1) {
      throw new Error(
        "Los productos del pedido tienen monedas distintas; no se pueden combinar en un mismo pedido."
      );
    }
    orderCurrency = items[0].currency;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Producto no encontrado" },
      { status: 400 }
    );
  }

  const stockItems = items.map((item) => ({ product: String(item.product), quantity: item.quantity }));
  const reserve = await reserveStock(stockItems);
  if (!reserve.ok) {
    const failedProduct = productMap.get(reserve.productId);
    return NextResponse.json(
      { error: `Sin stock suficiente para "${failedProduct?.name ?? "producto"}"` },
      { status: 409 }
    );
  }

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);

  let order;
  try {
    const orderNumber = await nextOrderNumber();
    order = await Order.create({
      orderNumber,
      customer: {
        user: session?.sub ?? null,
        name: parsed.data.customer.name,
        email: parsed.data.customer.email,
        phone: parsed.data.customer.phone,
      },
      items,
      currency: orderCurrency,
      subtotal,
      total: subtotal,
      notes: parsed.data.notes,
      source: "web",
    });
  } catch (err) {
    const { releaseStock } = await import("@/lib/inventory");
    await releaseStock(stockItems);
    console.error("[orders/create]", err);
    Sentry.captureException(err);
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
  }

  await logAudit({
    actorId: session?.sub,
    actorEmail: session?.email ?? parsed.data.customer.email,
    action: "order.create",
    resourceType: "order",
    resourceId: String(order._id),
    metadata: { orderNumber: order.orderNumber, total: order.total, stockReserved: stockItems },
    request,
  });

  return NextResponse.json({ order: toClientOrder(order) }, { status: 201 });
}
