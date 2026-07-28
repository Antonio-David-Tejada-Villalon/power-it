import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/models/Settings";
import { requireRole, handleApiError } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";

export async function GET() {
  await connectDB();
  const settings = await getSettings();
  return NextResponse.json({
    settings: {
      siteName: settings.siteName,
      contactEmail: settings.contactEmail,
      heroBanner: settings.heroBanner,
      checkout: settings.checkout,
    },
  });
}

const SettingsUpdateSchema = z.object({
  siteName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  heroBanner: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      image: z.string().optional(),
    })
    .optional(),
  checkout: z.object({ allowGuestCheckout: z.boolean() }).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json().catch(() => null);
    const parsed = SettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de configuración inválidos" }, { status: 400 });
    }

    await connectDB();
    const settings = await getSettings();
    Object.assign(settings, parsed.data, { updatedBy: session.sub });
    await settings.save();

    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action: "settings.update",
      resourceType: "settings",
      resourceId: "global",
      metadata: parsed.data,
      request,
    });

    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}
