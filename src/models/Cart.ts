import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

// Carrito guardado del lado del servidor para clientes logueados: sobrevive
// a un cambio de dispositivo o a que se borre el localStorage del navegador.
// Los invitados (sin cuenta) siguen dependiendo solo de localStorage.
const CartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

export type CartDoc = InferSchemaType<typeof CartSchema> & { _id: Types.ObjectId };

export const Cart: Model<CartDoc> = models.Cart ?? model<CartDoc>("Cart", CartSchema);
