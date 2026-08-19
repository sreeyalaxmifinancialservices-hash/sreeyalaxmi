import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function verifyJwtEdge(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    const headerData = JSON.parse(base64UrlDecode(header));
    if (headerData.alg !== "HS256") return null;

    const payloadData = JSON.parse(base64UrlDecode(payload));

    if (payloadData.exp && payloadData.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payloadData as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

const publicRoutes = ["/", "/login", "/api/auth/login", "/api/auth/logout"];
const authRoutes = ["/login"];

function getDashboardRoute(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "staff":
      return "/staff/dashboard";
    case "leader":
      return "/leader/dashboard";
    default:
      return "/login";
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (/\.\w+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const token = request.cookies.get("token")?.value;
    if (token && authRoutes.some((route) => pathname.startsWith(route))) {
      const decoded = verifyJwtEdge(token, process.env.JWT_SECRET || "") as JWTPayload | null;
      if (decoded?.role) {
        return NextResponse.redirect(new URL(getDashboardRoute(decoded.role), request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const decoded = verifyJwtEdge(token, process.env.JWT_SECRET || "") as JWTPayload | null;

  if (!decoded?.role) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  const role = decoded.role;

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(getDashboardRoute(role), request.url));
  }

  if (pathname.startsWith("/staff") && !["admin", "staff"].includes(role)) {
    return NextResponse.redirect(new URL(getDashboardRoute(role), request.url));
  }

  if (pathname.startsWith("/leader") && !["admin", "leader"].includes(role)) {
    return NextResponse.redirect(new URL(getDashboardRoute(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
