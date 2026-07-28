import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SettingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    siteName: { type: String, default: "Power IT" },
    contactEmail: { type: String, default: "ventas@powerit.local" },
    heroBanner: {
      title: { type: String, default: "Tecnología que impulsa tu mundo." },
      subtitle: {
        type: String,
        default:
          "Computadoras, hardware, periféricos y tecnología de última generación.",
      },
      image: String,
    },
    checkout: {
      allowGuestCheckout: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, _id: false }
);

export type SettingsDoc = InferSchemaType<typeof SettingsSchema> & { _id: string };

export const Settings: Model<SettingsDoc> =
  models.Settings ?? model<SettingsDoc>("Settings", SettingsSchema);

export async function getSettings() {
  const existing = await Settings.findById("global");
  if (existing) return existing;
  return Settings.create({ _id: "global" });
}
