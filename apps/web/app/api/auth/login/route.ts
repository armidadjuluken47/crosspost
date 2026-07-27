import { NextResponse } from "next/server";
import { credentialsToRole } from "@/lib/auth";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const password = process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) {
    return NextResponse.json({ error: "Dashboard auth is not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const supplied = typeof body.password === "string" ? body.password : "";
    const next = typeof body.next === "string" && body.next.startsWith("/") ? body.next : "/";

    const role = credentialsToRole(username || undefined, supplied);
    if (!role) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = await createSessionToken(role);
    const response = NextResponse.json({ ok: true, role, redirect: next });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
  }
}
