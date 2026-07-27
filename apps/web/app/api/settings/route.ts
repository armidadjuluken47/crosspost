import { NextResponse } from "next/server";
import {
  getOutputSettings,
  getProviderSelection,
  listAllProviderConfigs,
  saveOutputSettings,
  saveProviderSelection,
  validateEngineProviderSelection,
} from "@crosspost/pipeline";
import {
  groupProvidersByStage,
  outputSettingsSchema,
  providerDefinitionSchema,
  providerSelectionSchema,
} from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

function withNormalizeDimensions(settings: ReturnType<typeof outputSettingsSchema.parse>) {
  if (settings.imageAspectRatio === "9:16") {
    return { ...settings, normalizeWidth: 1080, normalizeHeight: 1920 };
  }

  return { ...settings, normalizeWidth: 1080, normalizeHeight: 1620 };
}

export async function GET() {
  const db = getDb();
  const [settings, providers, selection] = await Promise.all([
    getOutputSettings(db),
    listAllProviderConfigs(db),
    getProviderSelection(db),
  ]);

  return NextResponse.json({
    settings,
    providers: groupProvidersByStage(providers),
    selection,
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const db = getDb();
  let settings = await getOutputSettings(db);
  let selection = await getProviderSelection(db);

  if (body.settings !== undefined) {
    const parsed = outputSettingsSchema.safeParse(body.settings);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid output settings", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    settings = await saveOutputSettings(db, withNormalizeDimensions(parsed.data));
  }

  if (body.selection !== undefined) {
    const parsed = providerSelectionSchema.safeParse(body.selection);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid provider selection", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let providersPayload: ReturnType<typeof providerDefinitionSchema.parse>[] | undefined;
    if (body.providers !== undefined) {
      const providersParsed = providerDefinitionSchema.array().safeParse(body.providers);
      if (!providersParsed.success) {
        return NextResponse.json(
          { error: "Invalid providers", details: providersParsed.error.flatten() },
          { status: 400 },
        );
      }
      providersPayload = providersParsed.data;
    }

    try {
      if (providersPayload) {
        await validateEngineProviderSelection(getServerEnv(), providersPayload, parsed.data);
      }
      selection = await saveProviderSelection(db, parsed.data, providersPayload);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid provider selection" },
        { status: 400 },
      );
    }
  }

  const providers = await listAllProviderConfigs(db);

  return NextResponse.json({
    settings,
    selection,
    providers: groupProvidersByStage(providers),
  });
}
