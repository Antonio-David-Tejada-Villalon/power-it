import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: String,
    parent: { type: Schema.Types.ObjectId, ref: "Category" },
    image: String,
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["activa", "inactiva"], default: "activa" },
  },
  { timestamps: true }
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: Types.ObjectId };

export const Category: Model<CategoryDoc> =
  models.Category ?? model<CategoryDoc>("Category", CategorySchema);
