import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { requireRole, handleApiError } from "@/lib/auth/guard";

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

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

    const results = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelado" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          sku: { $first: "$items.sku" },
          name: { $first: "$items.name" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
    ]);

    const items = results.map((r) => ({
      productId: String(r._id),
      sku: r.sku,
      name: r.name,
      unitsSold: r.unitsSold,
      revenue: r.revenue,
      image: r.product?.[0]?.images?.[0] ?? null,
    }));

    return NextResponse.json({ items, range: { from: from.toISOString(), to: to.toISOString() } });
  } catch (err) {
    return handleApiError(err);
  }
}
