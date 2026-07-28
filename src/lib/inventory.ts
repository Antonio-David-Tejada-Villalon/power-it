import { Product } from "@/models/Product";

export interface StockItem {
  product: string;
  quantity: number;
}

export type ReserveResult = { ok: true } | { ok: false; productId: string };

/**
 * Descuenta stock por item de forma atómica (guard $gte evita negativos).
 * Si algún item falla por stock insuficiente, revierte los ya descontados
 * en esta misma llamada (no hay transacciones: mongodb-memory-server corre
 * standalone, sin replica set).
 */
export async function reserveStock(items: StockItem[]): Promise<ReserveResult> {
  const decremented: StockItem[] = [];

  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );

    if (!updated) {
      for (const done of decremented) {
        await Product.findByIdAndUpdate(done.product, { $inc: { stock: done.quantity } });
      }
      return { ok: false, productId: item.product };
    }

    decremented.push(item);
  }

  return { ok: true };
}

/** Devuelve stock reservado (al cancelar o eliminar un pedido activo). */
export async function releaseStock(items: StockItem[]): Promise<void> {
  await Promise.all(
    items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }))
  );
}
