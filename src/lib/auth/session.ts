import { cookies } from "next/headers";
import { signAccessToken, signRefreshToken, verifyAccessToken, type AccessTokenPayload } from "./jwt";
import type { Role } from "@/models/User";

export const ACCESS_COOKIE = "pit_at";
export const REFRESH_COOKIE = "pit_rt";

const isProd = process.env.NODE_ENV === "production";

export async function issueSessionCookies(user: {
  id: string;
  role: Role;
  permissions: string[];
  refreshTokenVersion: number;
  email: string;
}) {
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    // Mongoose devuelve un MongooseArray (prototipo no clonable por
    // structuredClone, que jose usa internamente) — se normaliza a array plano.
    permissions: Array.from(user.permissions),
    email: user.email,
  });
  const refreshToken = await signRefreshToken({
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
  });

  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getSessionUser(): Promise<AccessTokenPayload | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
