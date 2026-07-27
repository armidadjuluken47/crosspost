import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminOnlyApiRoute, isPublicPath, resolveDashboardRole } from "@/lib/auth";

const CREATOR_PREFIXES = ["/create", "/projects", "/account", "/batches", "/pricing", "/discover"];

function isCreatorPath(pathname: string): boolean {
  return CREATOR_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isProtectedApiPath(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/api/creator/")) return false;
  if (pathname === "/api/health") return false;
  if (pathname === "/api/ship-readiness") return false;
  if (pathname.startsWith("/api/assets")) return false;
  if (pathname.startsWith("/api/stripe/webhook")) return false;
  if (pathname.startsWith("/api/stripe/plans")) return false;
  if (pathname.startsWith("/api/stripe/create-checkout")) return false;
  if (pathname.startsWith("/api/stripe/portal")) return false;
  if (pathname.startsWith("/api/auth/login")) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD?.trim();
  const { pathname } = request.nextUrl;

  if (pathname === "/" || isPublicPath(pathname) || isCreatorPath(pathname)) {
    return NextResponse.next();
  }

  const requiresDashboardAuth =
    Boolean(password) && (isAdminPath(pathname) || isProtectedApiPath(pathname));

  if (!requiresDashboardAuth) {
    return NextResponse.next();
  }

  const role = await resolveDashboardRole(request);
  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (pathname === "/login") {
      return NextResponse.next();
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next") || "/admin";
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (
    pathname.startsWith("/api/") &&
    isAdminOnlyApiRoute(request.method, pathname) &&
    role !== "admin"
  ) {
    return NextResponse.json({ error: "Admin role required for this action" }, { status: 403 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-crosspost-role", role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|logo).*)"],
};
