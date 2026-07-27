import { describe, expect, it } from "vitest";
import {
  isProviderFetchableUrl,
  redactMediaUrlsForAudit,
  storageKeyFromMediaUrl,
} from "./resolve-media-url";

describe("isProviderFetchableUrl", () => {
  it("accepts public https URLs and data URIs", () => {
    expect(isProviderFetchableUrl("https://cdn.example.com/face.jpg")).toBe(true);
    expect(isProviderFetchableUrl("data:image/png;base64,aaa")).toBe(true);
  });

  it("rejects localhost and relative asset paths", () => {
    expect(isProviderFetchableUrl("/api/assets/models/x.jpg")).toBe(false);
    expect(isProviderFetchableUrl("http://127.0.0.1:3000/api/assets/models/x.jpg")).toBe(false);
    expect(isProviderFetchableUrl("http://localhost:3000/api/assets/models/x.jpg")).toBe(false);
    expect(isProviderFetchableUrl("local://models/x.jpg")).toBe(false);
  });
});

describe("storageKeyFromMediaUrl", () => {
  it("parses relative, local, and R2 URLs", () => {
    expect(storageKeyFromMediaUrl("/api/assets/models/foo/ref.jpg")).toBe("models/foo/ref.jpg");
    expect(storageKeyFromMediaUrl("local://models/foo/ref.jpg")).toBe("models/foo/ref.jpg");
    expect(
      storageKeyFromMediaUrl("http://127.0.0.1:3000/api/assets/models/foo/ref.jpg"),
    ).toBe("models/foo/ref.jpg");
    expect(
      storageKeyFromMediaUrl("https://pub.example.r2.dev/models/foo/ref.jpg", {
        R2_PUBLIC_BASE_URL: "https://pub.example.r2.dev",
      } as never),
    ).toBe("models/foo/ref.jpg");
  });
});

describe("redactMediaUrlsForAudit", () => {
  it("omits long data URIs", () => {
    const long = `data:image/jpeg;base64,${"a".repeat(200)}`;
    const redacted = redactMediaUrlsForAudit({ images: [long] });
    expect(redacted.images[0]).toContain("[omitted");
    expect(redacted.images[0].length).toBeLessThan(80);
  });
});
