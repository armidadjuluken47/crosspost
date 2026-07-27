import { NextResponse } from "next/server";
import { listWaveSpeedCatalog } from "@crosspost/pipeline";
import {
  filterCatalogForStage,
  searchCatalogModels,
  type ProviderStage,
} from "@crosspost/shared";
import { getServerEnv } from "@/lib/env";

const STAGES = new Set(["image_gen", "video_gen"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage") as Extract<ProviderStage, "image_gen" | "video_gen"> | null;
  const query = searchParams.get("q") ?? "";

  if (!stage || !STAGES.has(stage)) {
    return NextResponse.json(
      { error: "Query param stage must be image_gen or video_gen" },
      { status: 400 },
    );
  }

  try {
    const env = getServerEnv();
    const catalog = await listWaveSpeedCatalog(env);
    const filtered = filterCatalogForStage(catalog, stage);
    const models = searchCatalogModels(filtered, query).slice(0, 100);

    return NextResponse.json({
      stage,
      total: filtered.length,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load WaveSpeed catalog",
      },
      { status: 502 },
    );
  }
}
