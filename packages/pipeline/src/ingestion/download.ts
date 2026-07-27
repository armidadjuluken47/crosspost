import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { URL } from "node:url";

/** Download a binary URL. Forces IPv4 — Instagram CDN often times out on IPv6 via undici fetch. */
export async function downloadBinary(
  url: string,
  timeoutMs = 60_000,
  options?: { referer?: string; authorization?: string },
): Promise<Buffer> {
  const target = new URL(url);
  // Apify key-value store records need the token on the query string when not authorized.
  if (
    options?.authorization &&
    /api\.apify\.com\/v2\/key-value-stores\//i.test(url) &&
    !target.searchParams.has("token")
  ) {
    const token = options.authorization.replace(/^Bearer\s+/i, "");
    target.searchParams.set("token", token);
  }

  const transport = target.protocol === "http:" ? httpRequest : httpsRequest;

  return new Promise<Buffer>((resolve, reject) => {
    const headers: Record<string, string> = {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      referer: options?.referer ?? "https://www.instagram.com/",
      origin: "https://www.instagram.com",
    };
    if (options?.authorization) {
      headers.authorization = options.authorization.startsWith("Bearer ")
        ? options.authorization
        : `Bearer ${options.authorization}`;
    }

    const req = transport(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        family: 4,
        timeout: timeoutMs,
        headers,
      },
      (response) => {
        const status = response.statusCode ?? 0;

        // Follow one redirect level (CDN / Apify signed URLs sometimes redirect).
        if (status >= 300 && status < 400 && response.headers.location) {
          const next = new URL(response.headers.location, target).toString();
          response.resume();
          downloadBinary(next, timeoutMs, options).then(resolve, reject);
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`Download failed (${status}) for ${url.slice(0, 120)}…`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Download timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}
