import { NextResponse } from "next/server";

export async function GET() {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = process.env;

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      {
        error:
          "Google OAuth no está configurado todavía. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local para habilitarlo.",
      },
      { status: 501 }
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
