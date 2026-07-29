import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { CURRENCIES } from "@/lib/currency";

const ProductSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    isbn: { type: String, trim: true, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    // Moneda en la que se cargó `price` (y `compareAtPrice`). "USD" por
    // default para no reinterpretar silenciosamente los productos ya
    // existentes, cargados antes de que este campo existiera.
    currency: { type: String, enum: CURRENCIES, default: "USD" },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    images: { type: [String], default: [] },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    brand: { type: String, index: true },
    specs: { type: Map, of: String, default: {} },
    status: {
      type: String,
      enum: ["activo", "agotado", "descontinuado"],
      default: "activo",
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", description: "text" });
ProductSchema.index({ category: 1, status: 1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: Types.ObjectId };

export const Product: Model<ProductDoc> =
  models.Product ?? model<ProductDoc>("Product", ProductSchema);
