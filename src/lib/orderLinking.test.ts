import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { linkGuestOrdersToUser } from "@/lib/orderLinking";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function makeGuestOrder(email: string, orderNumber: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const category = await Category.create({ name: "Categoría de prueba", slug: `cat-${unique}` });
  const product = await Product.create({
    sku: `SKU-${unique}`,
    name: "Producto de prueba",
    slug: `producto-${unique}`,
    price: 100,
    stock: 10,
    category: category._id,
  });

  return Order.create({
    orderNumber,
    customer: { user: null, name: "Invitado", email },
    items: [{ product: product._id, sku: product.sku, name: product.name, price: 100, quantity: 1, subtotal: 100 }],
    currency: "USD",
    subtotal: 100,
    total: 100,
  });
}

describe("linkGuestOrdersToUser", () => {
  it("vincula los pedidos de invitado que coinciden por email exacto", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    await makeGuestOrder("cliente@example.com", "ORD-LINK-1");

    const modified = await linkGuestOrdersToUser(userId, "cliente@example.com");
    expect(modified).toBe(1);

    const order = await Order.findOne({ orderNumber: "ORD-LINK-1" });
    expect(String(order?.customer?.user)).toBe(userId);
  });

  it("vincula sin importar mayúsculas/minúsculas del email", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    await makeGuestOrder("Mayus@Example.com", "ORD-LINK-2");

    const modified = await linkGuestOrdersToUser(userId, "mayus@example.com");
    expect(modified).toBe(1);

    const order = await Order.findOne({ orderNumber: "ORD-LINK-2" });
    expect(String(order?.customer?.user)).toBe(userId);
  });

  it("no toca pedidos que ya pertenecen a otro usuario", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    const order = await makeGuestOrder("con-cuenta@example.com", "ORD-LINK-3");
    order.customer!.user = otherUserId;
    await order.save();

    const newUserId = new mongoose.Types.ObjectId().toString();
    const modified = await linkGuestOrdersToUser(newUserId, "con-cuenta@example.com");
    expect(modified).toBe(0);

    const unchanged = await Order.findOne({ orderNumber: "ORD-LINK-3" });
    expect(String(unchanged?.customer?.user)).toBe(String(otherUserId));
  });

  it("no vincula pedidos de otro email", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    await makeGuestOrder("otro@example.com", "ORD-LINK-4");

    const modified = await linkGuestOrdersToUser(userId, "distinto@example.com");
    expect(modified).toBe(0);
  });
});
