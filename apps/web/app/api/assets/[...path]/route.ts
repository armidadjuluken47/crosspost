import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createAssetStorage } from "@crosspost/pipeline";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const key = path.join("/");
    const env = getServerEnv();
    const candidates = [
      join(process.cwd(), env.LOCAL_ASSET_STORAGE_DIR, key),
      join(process.cwd(), "../..", env.LOCAL_ASSET_STORAGE_DIR, key),
    ];

    let buffer: Buffer | null = null;
    for (const filePath of candidates) {
      try {
        buffer = await readFile(filePath);
        break;
      } catch {
        continue;
      }
    }

    if (!buffer && env.ASSET_STORAGE_MODE === "r2") {
      try {
        const storage = createAssetStorage(env);
        buffer = await storage.getObject(key);
      } catch {
        buffer = null;
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const ext = key.split(".").pop()?.toLowerCase() ?? "bin";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
