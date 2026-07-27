import type { AppEnv } from "@crosspost/shared";
import { createLocalAssetStorage } from "./local";
import { createR2AssetStorage } from "./r2";
import type { AssetStorage } from "./local";

export function createAssetStorage(env: AppEnv): AssetStorage {
  if (env.ASSET_STORAGE_MODE === "r2") {
    return createR2AssetStorage(env);
  }

  return createLocalAssetStorage(env);
}

export * from "./local";
export * from "./r2";
