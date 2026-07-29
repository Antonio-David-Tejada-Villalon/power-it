import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Un solo documento por `base` (hoy solo usamos "USD"). `rates` guarda el
// valor de cada moneda soportada respecto a esa base.
const ExchangeRateSchema = new Schema({
  base: { type: String, required: true, unique: true },
  rates: { type: Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, required: true },
});

export type ExchangeRateDoc = InferSchemaType<typeof ExchangeRateSchema>;

export const ExchangeRate: Model<ExchangeRateDoc> =
  models.ExchangeRate ?? model<ExchangeRateDoc>("ExchangeRate", ExchangeRateSchema);
