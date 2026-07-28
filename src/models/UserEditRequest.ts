import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { ROLES } from "./User";

const ChangesSchema = new Schema(
  {
    name: String,
    role: { type: String, enum: ROLES },
    status: { type: String, enum: ["active", "suspended"] },
    passwordHash: String,
  },
  { _id: false }
);

const UserEditRequestSchema = new Schema(
  {
    targetUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedByRole: { type: String, enum: ROLES, required: true },
    changes: { type: ChangesSchema, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "deleted"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewReason: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

export type UserEditRequestDoc = InferSchemaType<typeof UserEditRequestSchema> & { _id: Types.ObjectId };

export const UserEditRequest: Model<UserEditRequestDoc> =
  models.UserEditRequest ?? model<UserEditRequestDoc>("UserEditRequest", UserEditRequestSchema);
