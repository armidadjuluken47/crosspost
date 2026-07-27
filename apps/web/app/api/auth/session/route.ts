import { NextResponse } from "next/server";
import { getRequestRole } from "@/lib/auth";

export async function GET(request: Request) {
  return NextResponse.json({
    role: getRequestRole(request),
  });
}
