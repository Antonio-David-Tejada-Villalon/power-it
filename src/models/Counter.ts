import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Contador atómico genérico (ej. numeración de pedidos). `key` identifica
// la secuencia; el incremento vía $inc es una única operación atómica de
// Mongo, sin la condición de carrera de "leer un count y sumarle 1".
const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export type CounterDoc = InferSchemaType<typeof CounterSchema>;

export const Counter: Model<CounterDoc> =
  models.Counter ?? model<CounterDoc>("Counter", CounterSchema);
