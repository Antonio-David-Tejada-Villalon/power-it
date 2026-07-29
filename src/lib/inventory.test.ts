import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { reserveStock, releaseStock } from "@/lib/inventory";

// Instancia de Mongo propia y aislada para este archivo (no toca la del dev
// server ni la de producción): se levanta una vez y se tira al terminar.
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function makeProduct(stock: number) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const category = await Category.create({ name: "Categoría de prueba", slug: `cat-${unique}` });
  return Product.create({
    sku: `SKU-${unique}`,
    name: "Producto de prueba",
    slug: `producto-${unique}`,
    price: 100,
    stock,
    category: category._id,
  });
}

describe("reserveStock", () => {
  it("descuenta stock cuando hay suficiente", async () => {
    const product = await makeProduct(10);
    const result = await reserveStock([{ product: String(product._id), quantity: 3 }]);

    expect(result.ok).toBe(true);
    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(7);
  });

  it("falla sin tocar el stock si no alcanza", async () => {
    const product = await makeProduct(2);
    const result = await reserveStock([{ product: String(product._id), quantity: 5 }]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.productId).toBe(String(product._id));
    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(2);
  });

  it("revierte los items ya descontados si un item posterior del mismo pedido falla", async () => {
    const productA = await makeProduct(10);
    const productB = await makeProduct(1);

    const result = await reserveStock([
      { product: String(productA._id), quantity: 5 },
      { product: String(productB._id), quantity: 5 }, // stock insuficiente
    ]);

    expect(result.ok).toBe(false);
    const updatedA = await Product.findById(productA._id);
    const updatedB = await Product.findById(productB._id);
    expect(updatedA!.stock).toBe(10); // revertido a su valor original
    expect(updatedB!.stock).toBe(1); // nunca se tocó
  });

  it("bajo reservas concurrentes nunca vende más unidades que el stock disponible", async () => {
    const product = await makeProduct(5);

    const attempts = await Promise.all(
      Array.from({ length: 10 }, () => reserveStock([{ product: String(product._id), quantity: 1 }]))
    );

    const successes = attempts.filter((r) => r.ok).length;
    expect(successes).toBe(5);

    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(0);
  });
});

describe("releaseStock", () => {
  it("devuelve stock reservado", async () => {
    const product = await makeProduct(5);
    await releaseStock([{ product: String(product._id), quantity: 3 }]);

    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(8);
  });
});
