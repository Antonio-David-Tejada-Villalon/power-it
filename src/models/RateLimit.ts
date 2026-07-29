import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Contador de ventana fija para rate limiting (ver src/lib/auth/rateLimit.ts).
// `key` ya incluye el bucket de tiempo, así que cada documento representa una
// sola ventana; el índice TTL lo limpia solo, sin necesidad de un cron aparte.
const RateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDoc = InferSchemaType<typeof RateLimitSchema>;

export const RateLimit: Model<RateLimitDoc> =
  models.RateLimit ?? model<RateLimitDoc>("RateLimit", RateLimitSchema);
