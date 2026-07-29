import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Order, ORDER_STATUSES } from "@/models/Order";
import { toClientOrder } from "@/lib/serializers";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { requireSession, requireRole, handleApiError, ApiAuthError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { reserveStock, releaseStock } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await connectDB();
  const order = await Order.findOne({ _id: id, deletedAt: null }).lean();
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const isOwner = order.customer?.user && String(order.customer.user) === session.sub;
  const canReadAny = hasPermission(session, "orders:read");
  if (!isOwner && !canReadAny) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({ order: toClientOrder(order) });
}

const OrderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

function toStockItems(order: { items: { product: unknown; quantity: number }[] }) {
  return order.items.map((item) => ({ product: String(item.product), quantity: item.quantity }));
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const isEncargado = session.role === "encargado";
    if (isEncargado && !hasPermission(session, "orders:update_status")) {
      throw new ApiAuthError(403, "No autorizado");
    }
    if (!isEncargado && !hasPermission(session, "orders:write")) {
      throw new ApiAuthError(403, "No autorizado");
    }

    const parsed = OrderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de pedido inválidos" }, { status: 400 });
    }

    const updates = isEncargado ? { status: parsed.data.status } : parsed.data;

    await connectDB();
    const current = await Order.findOne({ _id: id, deletedAt: null });
    if (!current) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    let stockNote: string | undefined;

    if (updates.status && updates.status !== current.status) {
      const wasCancelled = current.status === "cancelado";
      const willBeCancelled = updates.status === "cancelado";

      if (!wasCancelled && willBeCancelled) {
        await releaseStock(toStockItems(current));
        stockNote = "stock liberado (cancelado)";
      } else if (wasCancelled && !willBeCancelled) {
        const reserve = await reserveStock(toStockItems(current));
        if (!reserve.ok) {
          return NextResponse.json(
            { error: "No hay stock suficiente para reactivar este pedido" },
            { status: 409 }
          );
        }
        stockNote = "stock re-reservado (reactivado)";
      }
    }

    const order = await Order.findByIdAndUpdate(id, updates, { returnDocument: "after" });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "order.update",
      resourceType: "order",
      resourceId: id,
      metadata: { ...updates, stockNote },
      request,
    });

    return NextResponse.json({ order: toClientOrder(order) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(["admin", "supervisor"]);
    const { id } = await params;

    await connectDB();
    const order = await Order.findOne({ _id: id, deletedAt: null });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    if (order.status !== "cancelado") {
      await releaseStock(toStockItems(order));
    }

    order.deletedAt = new Date();
    await order.save();

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "order.delete",
      resourceType: "order",
      resourceId: id,
      metadata: { orderNumber: order.orderNumber, status: order.status },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
