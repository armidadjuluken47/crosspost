import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export type DashboardRole = "admin" | "operator";

const ADMIN_USERNAMES = new Set(["admin", "amve"]);

export function credentialsToRole(username: string | undefined, password: string): DashboardRole | null {
  const adminPassword = process.env.DASHBOARD_PASSWORD?.trim();
  if (!adminPassword) return "admin";

  const operatorPassword = process.env.OPERATOR_PASSWORD?.trim() || adminPassword;

  if (password === adminPassword && (!username || ADMIN_USERNAMES.has(username.toLowerCase()))) {
    return "admin";
  }

  if (password === operatorPassword && username?.toLowerCase() === "operator") {
    return "operator";
  }

  if (password === adminPassword) {
    return "admin";
  }

  return null;
}

export async function resolveDashboardRole(request: NextRequest): Promise<DashboardRole | null> {
  const adminPassword = process.env.DASHBOARD_PASSWORD?.trim();
  if (!adminPassword) return "admin";

  const operatorPassword = process.env.OPERATOR_PASSWORD?.trim() || adminPassword;
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (cookie) {
    const session = await verifySessionToken(cookie);
    if (session) return session.role;

    // Legacy cookie values from before the login page (raw password).
    if (cookie === adminPassword) return "admin";
    if (cookie === operatorPassword && operatorPassword !== adminPassword) return "operator";
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [username, supplied] = decoded.split(":");
    return credentialsToRole(username, supplied ?? "");
  }

  return null;
}

export async function isAuthorized(request: NextRequest): Promise<boolean> {
  return (await resolveDashboardRole(request)) !== null;
}

export function getRequestRole(request: Request | NextRequest): DashboardRole {
  const headerRole = request.headers.get("x-crosspost-role");
  if (headerRole === "admin" || headerRole === "operator") {
    return headerRole;
  }

  return "admin";
}

export function requireAdmin(request: Request): Response | null {
  if (getRequestRole(request) !== "admin") {
    return Response.json(
      { error: "Admin role required for this action" },
      { status: 403 },
    );
  }

  return null;
}

const ADMIN_ONLY_POST_PREFIXES = [
  "/api/prompts",
  "/api/batches",
  "/api/admin/",
  "/api/models/",
  "/api/runs/demo",
  "/api/ingestion/fixture",
];

export function isAdminOnlyApiRoute(method: string, pathname: string): boolean {
  if (method !== "POST" && method !== "PATCH" && method !== "DELETE") {
    return false;
  }

  if (pathname.match(/^\/api\/prompts\/\d+\/activate$/)) {
    return true;
  }

  if (pathname.match(/^\/api\/models\/\d+\/references\/\d+$/)) {
    return method === "PATCH";
  }

  if (pathname.match(/^\/api\/models\/\d+$/)) {
    return method === "PATCH" || method === "DELETE";
  }

  if (pathname.match(/^\/api\/sources\/\d+$/)) {
    return method === "DELETE";
  }

  return ADMIN_ONLY_POST_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/health" ||
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/stripe/plans"
  );
}
