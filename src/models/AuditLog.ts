import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId };

export const AuditLog: Model<AuditLogDoc> =
  models.AuditLog ?? model<AuditLogDoc>("AuditLog", AuditLogSchema);
