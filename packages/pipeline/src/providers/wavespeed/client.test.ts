import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "@crosspost/shared";
import { pollWaveSpeedTask, submitWaveSpeedTask } from "./client";

const env = loadEnv({
  WAVESPEED_API_KEY: "test-key",
  WAVESPEED_API_BASE_URL: "https://api.wavespeed.ai",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("submitWaveSpeedTask", () => {
  it("parses a task submission response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          message: "success",
          data: {
            id: "task-123",
            status: "processing",
            urls: { get: "https://api.wavespeed.ai/api/v3/predictions/task-123/result" },
          },
        }),
      }),
    );

    const result = await submitWaveSpeedTask(env, "google/nano-banana-pro/edit-multi", {
      prompt: "test",
      images: ["https://example.com/a.png"],
    });

    expect(result.taskId).toBe("task-123");
    expect(result.status).toBe("processing");
  });
});

describe("pollWaveSpeedTask", () => {
  it("returns completed outputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          message: "success",
          data: {
            id: "task-123",
            status: "completed",
            outputs: ["https://cdn.example.com/output.png"],
          },
        }),
      }),
    );

    const result = await pollWaveSpeedTask(env, "task-123");
    expect(result.outputs).toEqual(["https://cdn.example.com/output.png"]);
  });
});
