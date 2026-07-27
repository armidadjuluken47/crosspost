import { describe, expect, it } from "vitest";
import { formatSrtTimestamp, segmentsToSrt, transcriptToSrt } from "./srt";

describe("segmentsToSrt", () => {
  it("formats timestamps and cues", () => {
    expect(formatSrtTimestamp(0)).toBe("00:00:00,000");
    expect(formatSrtTimestamp(65.5)).toBe("00:01:05,500");

    const srt = segmentsToSrt([
      { start: 0, end: 2.5, text: "Hello world" },
      { start: 2.5, end: 5, text: "Second line" },
    ]);

    expect(srt).toContain("1\n00:00:00,000 --> 00:00:02,500\nHello world");
    expect(srt).toContain("2\n00:00:02,500 --> 00:00:05,000\nSecond line");
  });

  it("reads transcript jsonb shape", () => {
    const srt = transcriptToSrt({
      text: "Hi",
      segments: [{ start: 0, end: 1, text: "Hi" }],
    });
    expect(srt).toContain("Hi");
  });
});
