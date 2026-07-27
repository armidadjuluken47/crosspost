import { describe, expect, it } from "vitest";
import { normalizeApifyReelItem, normalizeApifyYouTubeItem } from "./apify-client";

describe("normalizeApifyReelItem", () => {
  it("maps common Apify reel fields", () => {
    const candidate = normalizeApifyReelItem({
      shortCode: "ABC123",
      url: "https://www.instagram.com/reel/ABC123/",
      caption: "Test reel",
      videoViewCount: 12000,
      videoDuration: 8,
      videoUrl: "https://cdn.example/video.mp4",
    });

    expect(candidate).toEqual({
      shortcode: "ABC123",
      reelUrl: "https://www.instagram.com/reel/ABC123/",
      caption: "Test reel",
      viewCount: 12000,
      likeCount: undefined,
      commentCount: undefined,
      durationSeconds: 8,
      videoUrl: "https://cdn.example/video.mp4",
      postedAt: undefined,
      platform: "instagram",
      raw: expect.any(Object),
    });
  });

  it("returns null when shortcode cannot be resolved", () => {
    expect(normalizeApifyReelItem({ caption: "no id" })).toBeNull();
  });

  it("rounds fractional duration and view counts to integers", () => {
    const candidate = normalizeApifyReelItem({
      shortCode: "ABC123",
      videoViewCount: 12000.7,
      videoDuration: 8.079,
    });

    expect(candidate?.viewCount).toBe(12001);
    expect(candidate?.durationSeconds).toBe(8);
  });
});

describe("normalizeApifyYouTubeItem", () => {
  it("does not treat the watch page URL as a downloadable MP4", () => {
    const candidate = normalizeApifyYouTubeItem({
      id: "abc123XYZ",
      url: "https://www.youtube.com/shorts/abc123XYZ",
      title: "Test short",
      viewCount: 9001,
    });

    expect(candidate?.shortcode).toBe("youtube:abc123XYZ");
    expect(candidate?.reelUrl).toContain("abc123XYZ");
    expect(candidate?.videoUrl).toBeUndefined();
    expect(candidate?.viewCount).toBe(9001);
  });

  it("accepts Apify key-value store MP4 URLs", () => {
    const candidate = normalizeApifyYouTubeItem({
      id: "abc123XYZ",
      url: "https://www.youtube.com/shorts/abc123XYZ",
      downloadedFileUrl:
        "https://api.apify.com/v2/key-value-stores/xyz/records/abc123XYZ_clip.mp4",
    });

    expect(candidate?.videoUrl).toContain("key-value-stores");
  });
});
