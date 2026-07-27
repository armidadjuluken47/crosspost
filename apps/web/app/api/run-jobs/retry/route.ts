import { NextResponse } from "next/server";
import { releaseStaleRunJobs, retryRunJob } from "@crosspost/pipeline";
import { retryRunJobSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = retryRunJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid retry payload",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const db = getDb();
    await releaseStaleRunJobs(db);
    const job = await retryRunJob(db, parsed.data.id, parsed.data.requestedBy ?? "dashboard");

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry job" },
      { status: 500 },
    );
  }
}
