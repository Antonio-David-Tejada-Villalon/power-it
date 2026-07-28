import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ROLES = ["admin", "supervisor", "encargado", "cliente"] as const;
export type Role = (typeof ROLES)[number];

const AddressSchema = new Schema(
  {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ROLES, default: "cliente", index: true },
    permissions: { type: [String], default: [] },
    phone: String,
    address: AddressSchema,
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    refreshTokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> = models.User ?? model<UserDoc>("User", UserSchema);
