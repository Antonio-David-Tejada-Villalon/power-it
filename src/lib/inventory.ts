import mongoose from "mongoose";
import { Product } from "@/models/Product";

export interface StockItem {
  product: string;
  quantity: number;
}

export type ReserveResult = { ok: true } | { ok: false; productId: string };

class InsufficientStockError extends Error {
  constructor(public readonly productId: string) {
    super(`Stock insuficiente para el producto ${productId}`);
  }
}

/**
 * Descuenta stock por item dentro de una transacción real (guard $gte evita
 * negativos). Si algún item falla por stock insuficiente, toda la
 * transacción se aborta y ningún item queda afectado — Atlas despliega
 * siempre como replica set (incluso el tier M0 gratuito), así que las
 * transacciones ACID están disponibles tanto en producción como en local
 * (ver src/lib/db.ts, que levanta mongodb-memory-server como replica set).
 */
export async function reserveStock(items: StockItem[]): Promise<ReserveResult> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of items) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session }
        );
        if (!updated) throw new InsufficientStockError(item.product);
      }
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, productId: err.productId };
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/** Devuelve stock reservado (al cancelar o eliminar un pedido activo). */
export async function releaseStock(items: StockItem[]): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Promise.all(
        items.map((item) =>
          Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { session })
        )
      );
    });
  } finally {
    await session.endSession();
  }
}
