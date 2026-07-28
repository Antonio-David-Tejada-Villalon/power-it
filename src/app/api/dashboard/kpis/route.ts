import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { requireSession, handleApiError } from "@/lib/auth/guard";

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseRange(params: URLSearchParams): { from: Date; to: Date } {
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : startOfMonth();
  const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : new Date();
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    if (session.role === "encargado") {
      const [pedidosHoy, pedidosAsignados] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startOfDay() } }),
        Order.countDocuments({ assignedTo: session.sub, status: { $ne: "completado" } }),
      ]);
      return NextResponse.json({
        kpis: [
          { label: "Pedidos de hoy", value: pedidosHoy },
          { label: "Pedidos asignados activos", value: pedidosAsignados },
        ],
      });
    }

    const { from, to } = parseRange(request.nextUrl.searchParams);

    const [ventasAgg, pedidosPeriodo, egresosAgg, pedidosCancelados, productosSinStock, usuariosActivos] =
      await Promise.all([
        Order.aggregate([
          { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelado" } } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
        Order.countDocuments({ createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelado" } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: from, $lte: to }, status: "cancelado" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
        Order.countDocuments({ createdAt: { $gte: from, $lte: to }, status: "cancelado" }),
        Product.countDocuments({ stock: 0 }),
        session.role === "admin" ? User.countDocuments({ status: "active" }) : null,
      ]);

    const kpis = [
      { label: "Ventas del período", value: ventasAgg[0]?.total ?? 0, format: "currency" },
      { label: "Pedidos del período", value: pedidosPeriodo },
      { label: "Egresos (cancelados)", value: egresosAgg[0]?.total ?? 0, format: "currency" },
      { label: "Pedidos cancelados", value: pedidosCancelados },
      { label: "Productos sin stock", value: productosSinStock },
    ];

    if (session.role === "admin") {
      kpis.push({ label: "Usuarios activos", value: usuariosActivos ?? 0 });
    }

    return NextResponse.json({ kpis, range: { from: from.toISOString(), to: to.toISOString() } });
  } catch (err) {
    return handleApiError(err);
  }
}
