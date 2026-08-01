import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { MAX_CATEGORY_LEVEL } from "@/lib/categoryHierarchy";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // El slug ya no es único global: dos ramas distintas pueden repetir un
    // mismo nombre de subcategoría (ej. "Gaming" bajo Notebooks y bajo PC de
    // Escritorio) — la unicidad real es (parent, slug), ver índice abajo.
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: String,
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    // 1 = categoría raíz, 2 = subcategoría, 3 = tipo/familia. Se calcula
    // siempre en el servidor a partir del padre (nunca se confía en el valor
    // que mande el cliente) — así el árbol nunca queda inconsistente.
    level: { type: Number, enum: Array.from({ length: MAX_CATEGORY_LEVEL }, (_, i) => i + 1), default: 1 },
    image: String,
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["activa", "inactiva"], default: "activa" },
  },
  { timestamps: true }
);

CategorySchema.index({ parent: 1, slug: 1 }, { unique: true });
CategorySchema.index({ parent: 1, order: 1 });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: Types.ObjectId };

export const Category: Model<CategoryDoc> =
  models.Category ?? model<CategoryDoc>("Category", CategorySchema);
