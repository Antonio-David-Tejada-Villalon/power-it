import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { issueSessionCookies } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { linkGuestOrdersToUser } from "@/lib/orderLinking";

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
}

export async function GET(request: NextRequest) {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error:
            "Google OAuth no está configurado todavía. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local para habilitarlo.",
        },
        { status: 501 }
      );
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Falta el código de autorización" }, { status: 400 });
    }

    const redirectUri = GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "No se pudo validar con Google" }, { status: 502 });
    }

    const tokenData: GoogleTokenResponse = await tokenRes.json();

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.json({ error: "No se pudo obtener el perfil de Google" }, { status: 502 });
    }

    const profile: GoogleUserInfo = await userInfoRes.json();

    await connectDB();
    let user = await User.findOne({ googleId: profile.sub });
    if (!user) {
      user = await User.findOne({ email: profile.email.toLowerCase() });
    }

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase(),
        googleId: profile.sub,
        provider: "google",
        role: "cliente",
        permissions: permissionsForRole("cliente"),
      });
    } else if (!user.googleId) {
      user.googleId = profile.sub;
      user.provider = "google";
      await user.save();
    }

    const permissions = user.permissions?.length ? user.permissions : permissionsForRole(user.role);

    await issueSessionCookies({
      id: String(user._id),
      role: user.role,
      permissions,
      refreshTokenVersion: user.refreshTokenVersion ?? 0,
      email: user.email,
    });

    await linkGuestOrdersToUser(String(user._id), user.email);

    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      action: "login.google",
      resourceType: "user",
      resourceId: String(user._id),
      request,
    });

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    console.error("[auth/google/callback]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
