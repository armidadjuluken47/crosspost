import { NextResponse } from "next/server";
import { listExceptions, updateException } from "@crosspost/pipeline";
import { exceptionStatusSchema, updateExceptionSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const stageParam = searchParams.get("stage");
    const batchIdParam = searchParams.get("batchId");
    const modelIdParam = searchParams.get("modelId");
    const status = statusParam ? exceptionStatusSchema.parse(statusParam) : undefined;
    const batchId = batchIdParam ? Number(batchIdParam) : undefined;
    const modelId = modelIdParam ? Number(modelIdParam) : undefined;

    const db = getDb();
    const exceptions = await listExceptions(
      db,
      {
        status,
        stage: stageParam ?? undefined,
        batchId: Number.isFinite(batchId) ? batchId : undefined,
        modelId: Number.isFinite(modelId) ? modelId : undefined,
      },
      50,
    );

    return NextResponse.json({ exceptions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list exceptions" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateExceptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid exception update",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const exception = await updateException(db, parsed.data);

    return NextResponse.json({ exception });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update exception" },
      { status: 500 },
    );
  }
}
