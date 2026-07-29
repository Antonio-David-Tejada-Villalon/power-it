import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/models/User";

const DEV_ACCESS_SECRET = "dev-access-secret-change-me";
const DEV_REFRESH_SECRET = "dev-refresh-secret-change-me";

// En producción, un secreto ausente o igual al default de desarrollo
// permitiría forjar sesiones (el valor por defecto queda expuesto en el
// repo público). Falla fuerte en vez de firmar/verificar en silencio con
// un secreto predecible.
function resolveSecret(envVar: string, devDefault: string): Uint8Array {
  const value = process.env[envVar];
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && (!value || value === devDefault)) {
    throw new Error(
      `${envVar} no está configurado con un secreto real en producción (falta o usa el valor de desarrollo por defecto).`
    );
  }
  return new TextEncoder().encode(value ?? devDefault);
}

let accessSecret: Uint8Array | null = null;
function getAccessSecret(): Uint8Array {
  accessSecret ??= resolveSecret("JWT_ACCESS_SECRET", DEV_ACCESS_SECRET);
  return accessSecret;
}

let refreshSecret: Uint8Array | null = null;
function getRefreshSecret(): Uint8Array {
  refreshSecret ??= resolveSecret("JWT_REFRESH_SECRET", DEV_REFRESH_SECRET);
  return refreshSecret;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  permissions: string[];
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  const secret = getAccessSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  const secret = getRefreshSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}
