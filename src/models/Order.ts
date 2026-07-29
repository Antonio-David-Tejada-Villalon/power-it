import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { CURRENCIES } from "@/lib/currency";

export const ORDER_STATUSES = [
  "pendiente",
  "confirmado",
  "en_proceso",
  "enviado",
  "completado",
  "cancelado",
] as const;

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      user: { type: Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
    },
    items: { type: [OrderItemSchema], required: true },
    // Todos los items de un mismo pedido comparten moneda (se valida al
    // crear el pedido); "USD" por default para pedidos previos a este campo.
    currency: { type: String, enum: CURRENCIES, default: "USD" },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pendiente", index: true },
    paymentStatus: {
      type: String,
      enum: ["pendiente", "pagado", "fallido"],
      default: "pendiente",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
    source: { type: String, enum: ["web", "admin"], default: "web" },
  },
  { timestamps: true }
);

OrderSchema.index({ "customer.user": 1 });
OrderSchema.index({ createdAt: -1 });

export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: Types.ObjectId };

export const Order: Model<OrderDoc> = models.Order ?? model<OrderDoc>("Order", OrderSchema);
