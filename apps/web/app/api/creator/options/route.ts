import { NextResponse } from "next/server";
import { isExpressSwapAvailable } from "@crosspost/pipeline";
import { getServerEnv } from "@/lib/env";
import { SUBTITLE_STYLES, SUBTITLE_STYLE_LABELS, SWAP_TIERS, SWAP_TIER_LABELS } from "@crosspost/shared";

export async function GET() {
  const env = getServerEnv();
  const expressAvailable = isExpressSwapAvailable(env);

  return NextResponse.json({
    swapTiers: SWAP_TIERS.map((id) => ({
      id,
      label: SWAP_TIER_LABELS[id],
      available: id === "quality" ? true : expressAvailable,
    })),
    subtitleStyles: SUBTITLE_STYLES.map((id) => ({
      id,
      label: SUBTITLE_STYLE_LABELS[id],
    })),
  });
}
