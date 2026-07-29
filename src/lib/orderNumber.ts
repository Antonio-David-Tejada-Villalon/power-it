import { Counter } from "@/models/Counter";
import { Order } from "@/models/Order";

const ORDER_COUNTER_KEY = "orderNumber";

interface MongoDuplicateKeyError {
  code: number;
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

// La primera vez que se pide un número de pedido (el contador todavía no
// existe), lo arranca después del último `orderNumber` ya creado, para no
// colisionar con pedidos generados antes de este cambio.
async function bootstrapCounter(): Promise<void> {
  const exists = await Counter.exists({ key: ORDER_COUNTER_KEY });
  if (exists) return;

  const last = await Order.findOne().sort({ createdAt: -1 }).select("orderNumber").lean();
  const lastSeq = last?.orderNumber ? parseInt(last.orderNumber.replace(/\D/g, ""), 10) || 0 : 0;

  try {
    await Counter.create({ key: ORDER_COUNTER_KEY, seq: lastSeq });
  } catch (err) {
    // Otra request concurrente ya lo inicializó primero: no es un error real.
    if (!isDuplicateKeyError(err)) throw err;
  }
}

/** Número de pedido único y secuencial (`PWR-000123`), generado con un
 * `$inc` atómico — a diferencia de `Order.countDocuments() + 1`, dos
 * checkouts simultáneos nunca pueden recibir el mismo número. */
export async function nextOrderNumber(): Promise<string> {
  await bootstrapCounter();
  const counter = await Counter.findOneAndUpdate(
    { key: ORDER_COUNTER_KEY },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `PWR-${String(counter.seq).padStart(6, "0")}`;
}
