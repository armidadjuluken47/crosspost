import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Prefer monorepo .env over stale shell exports (e.g. old Stripe prod_ IDs).
// Never let .env override NODE_ENV — that breaks `next build` (404 / Html prerender error).
const nodeEnv = process.env.NODE_ENV;
loadEnv({ path: resolve(process.cwd(), "../../.env"), override: true });
if (nodeEnv !== undefined) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: nodeEnv,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

const nextConfig: NextConfig = {
  transpilePackages: ["@crosspost/shared", "@crosspost/db", "@crosspost/pipeline", "@crosspost/content-ai"],
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  env: {
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD ?? "",
  },
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/health": ["./node_modules/ffmpeg-static/**/*"],
    "/api/**/*": ["./node_modules/ffmpeg-static/**/*"],
  },
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
