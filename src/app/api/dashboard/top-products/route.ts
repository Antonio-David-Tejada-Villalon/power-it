import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { requireRole, handleApiError } from "@/lib/auth/guard";
import { getExchangeRates } from "@/lib/exchangeRates";
import { convertAmount, isCurrency, type Currency } from "@/lib/currency";

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Moneda de referencia del dashboard de Resumen — el negocio opera en
// Argentina, así que el ranking se ve en pesos sin importar en qué moneda
// se haya cargado cada pedido.
const REPORTING_CURRENCY: Currency = "ARS";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin", "supervisor"]);
    await connectDB();

    const params = request.nextUrl.searchParams;
    const fromParam = params.get("from");
    const toParam = params.get("to");
    const from = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : startOfMonth();
    const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : new Date();
    const limit = Math.min(50, Number(params.get("limit") ?? 10));

    // Se agrupa por (producto, moneda) porque un mismo producto puede
    // haberse vendido en más de una moneda si cambió su precio/moneda entre
    // pedidos; cada bucket de moneda se convierte a la moneda de referencia
    // antes de sumarlos.
    const results = await Order.aggregate([
      { $match: { deletedAt: null, createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelado" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { product: "$items.product", currency: "$currency" },
          sku: { $first: "$items.sku" },
          name: { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.subtotal" },
        },
      },
    ]);

    const rates = await getExchangeRates();
    const byProduct = new Map<string, { sku: string; name: string; unitsSold: number; revenueARS: number }>();

    for (const r of results) {
      const productId = String(r._id.product);
      const currency: Currency = isCurrency(r._id.currency) ? r._id.currency : "USD";
      const revenueARS = convertAmount(r.revenue, currency, REPORTING_CURRENCY, rates);

      const existing = byProduct.get(productId);
      if (existing) {
        existing.unitsSold += r.unitsSold;
        existing.revenueARS += revenueARS;
      } else {
        byProduct.set(productId, { sku: r.sku, name: r.name, unitsSold: r.unitsSold, revenueARS });
      }
    }

    const top = Array.from(byProduct.entries())
      .sort((a, b) => b[1].unitsSold - a[1].unitsSold)
      .slice(0, limit);

    const products = await Product.find({ _id: { $in: top.map(([id]) => id) } })
      .select("images")
      .lean();
    const imageById = new Map(products.map((p) => [String(p._id), p.images?.[0] ?? null]));

    const items = top.map(([productId, data]) => ({
      productId,
      sku: data.sku,
      name: data.name,
      unitsSold: data.unitsSold,
      revenue: data.revenueARS,
      image: imageById.get(productId) ?? null,
    }));

    return NextResponse.json({ items, range: { from: from.toISOString(), to: to.toISOString() } });
  } catch (err) {
    return handleApiError(err);
  }
}
