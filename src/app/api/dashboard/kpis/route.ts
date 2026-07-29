import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { requireSession, handleApiError } from "@/lib/auth/guard";
import { getExchangeRates } from "@/lib/exchangeRates";
import { convertAmount, isCurrency, type Currency } from "@/lib/currency";

/** Los pedidos pueden estar en distintas monedas — se agrupan por moneda y
 * se convierten todas a USD (moneda de referencia del dashboard) antes de
 * sumarlas, para que el KPI final sea un solo número con sentido. */
async function sumAcrossCurrencies(buckets: { _id: string | null; total: number }[]): Promise<number> {
  const rates = await getExchangeRates();
  return buckets.reduce((acc, b) => {
    const currency: Currency = b._id && isCurrency(b._id) ? b._id : "USD";
    return acc + convertAmount(b.total, currency, "USD", rates);
  }, 0);
}

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

// Un pedido eliminado (soft-delete, ver DATA-03) no debe seguir contando en
// ningún KPI ni ranking — el registro sobrevive solo para Auditoría.
const NOT_DELETED = { deletedAt: null };

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
        Order.countDocuments({ ...NOT_DELETED, createdAt: { $gte: startOfDay() } }),
        Order.countDocuments({ ...NOT_DELETED, assignedTo: session.sub, status: { $ne: "completado" } }),
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
          { $match: { ...NOT_DELETED, createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelado" } } },
          { $group: { _id: "$currency", total: { $sum: "$total" } } },
        ]),
        Order.countDocuments({ ...NOT_DELETED, createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelado" } }),
        Order.aggregate([
          { $match: { ...NOT_DELETED, createdAt: { $gte: from, $lte: to }, status: "cancelado" } },
          { $group: { _id: "$currency", total: { $sum: "$total" } } },
        ]),
        Order.countDocuments({ ...NOT_DELETED, createdAt: { $gte: from, $lte: to }, status: "cancelado" }),
        Product.countDocuments({ stock: 0 }),
        session.role === "admin" ? User.countDocuments({ status: "active" }) : null,
      ]);

    const [ventas, egresos] = await Promise.all([
      sumAcrossCurrencies(ventasAgg),
      sumAcrossCurrencies(egresosAgg),
    ]);

    const kpis = [
      { label: "Ventas del período (USD)", value: ventas, format: "currency" },
      { label: "Pedidos del período", value: pedidosPeriodo },
      { label: "Egresos (cancelados, USD)", value: egresos, format: "currency" },
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
