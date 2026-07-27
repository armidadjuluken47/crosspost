import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export async function loadFixtureImageBuffer(preferredPath?: string): Promise<Buffer> {
  if (preferredPath) {
    const candidates = [
      resolve(process.cwd(), preferredPath),
      resolve(process.cwd(), "../../", preferredPath),
      resolve(process.cwd(), "../../images/hazel/photo_2026-06-08_19-09-27.jpg"),
    ];

    for (const candidate of candidates) {
      try {
        return await readFile(candidate);
      } catch {
        continue;
      }
    }
  }

  return MINIMAL_PNG;
}
