import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const ACCESS_COOKIE = "pit_at";

function isPublicApi(pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/products" && method === "GET") return true;
  if (/^\/api\/products\/[^/]+$/.test(pathname) && method === "GET") return true;
  if (pathname === "/api/categories" && method === "GET") return true;
  if (/^\/api\/categories\/[^/]+$/.test(pathname) && method === "GET") return true;
  if (pathname === "/api/orders" && method === "POST") return true;
  if (pathname === "/api/settings" && method === "GET") return true;
  if (pathname === "/api/currency" && method === "GET") return true;
  return false;
}

function dashboardAreaRoles(pathname: string): string[] {
  if (pathname.startsWith("/dashboard/admin")) return ["admin"];
  if (pathname.startsWith("/dashboard/supervisor")) return ["admin", "supervisor"];
  if (pathname.startsWith("/dashboard/encargado")) return ["admin", "encargado"];
  if (pathname.startsWith("/dashboard/operario")) return ["admin", "operario"];
  return ["admin", "supervisor", "encargado", "operario"];
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const session = token ? await verifyAccessToken(token) : null;

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, request.method)) return NextResponse.next();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const allowedRoles = dashboardAreaRoles(pathname);
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/mi-cuenta")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/mi-cuenta", "/mi-cuenta/:path*", "/api/:path*"],
};
