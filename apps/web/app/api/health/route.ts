import { NextResponse } from "next/server";
import { buildHealthReport } from "@crosspost/pipeline";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  const env = getServerEnv();
  const report = await buildHealthReport(env);
  return NextResponse.json(report, {
    status: report.status === "error" ? 503 : 200,
  });
}
