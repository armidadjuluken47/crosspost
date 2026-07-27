import type { AppEnv } from "@crosspost/shared";

export interface TranscriptResult {
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  provider: "fixture" | "openai";
}

export type PlatformKey = "tiktok" | "instagram" | "youtube" | "linkedin";

export type PlatformPack = {
  caption: string;
  hashtags: string;
  hookVariants: string[];
};

export type PlatformVariants = Record<PlatformKey, PlatformPack>;

export interface CaptionResult {
  caption: string;
  hashtags: string;
  hookVariants: string[];
  platformVariants: PlatformVariants;
  provider: "fixture" | "openai";
}

const FIXTURE_TRANSCRIPT =
  "Today I want to share the one SEO mistake that cost me thousands of dollars. Most creators ignore this completely.";

const PLATFORM_KEYS: PlatformKey[] = ["tiktok", "instagram", "youtube", "linkedin"];

function fixtureTranscript(): TranscriptResult {
  return {
    text: FIXTURE_TRANSCRIPT,
    segments: [
      { start: 0, end: 4.2, text: "Today I want to share the one SEO mistake" },
      { start: 4.2, end: 8.5, text: "that cost me thousands of dollars." },
      { start: 8.5, end: 12, text: "Most creators ignore this completely." },
    ],
    provider: "fixture",
  };
}

function fixturePlatformVariants(): PlatformVariants {
  return {
    tiktok: {
      caption:
        "This SEO mistake cost me $15,000 — and almost nobody talks about it. Save this before it gets buried.",
      hashtags: "#seo #marketing #contentcreator #businesstips #growth",
      hookVariants: [
        "This SEO mistake cost me $15,000.",
        "Nobody talks about this SEO strategy.",
        "I wish I knew this years ago.",
        "Stop doing SEO like this in 2026.",
        "This changed how I grow on social.",
      ],
    },
    instagram: {
      caption:
        "The SEO habit that quietly drained $15k from my budget — and the simple fix that reversed it. Save for your next content sprint.",
      hashtags: "#reels #digitalmarketing #seo #creatorlife #growthmarketing",
      hookVariants: [
        "I almost quit SEO after this.",
        "This Reel is for anyone wasting ad spend.",
        "Save this before your next campaign.",
        "The quiet SEO leak nobody audits.",
        "Fix this and your reach compounds.",
      ],
    },
    youtube: {
      caption: "The SEO Mistake That Cost Me $15,000 (And How to Fix It)",
      hashtags: "#Shorts #SEO #MarketingTips #ContentStrategy #YouTubeGrowth",
      hookVariants: [
        "I wasted $15,000 on bad SEO.",
        "This SEO tip changed my channel.",
        "Stop ranking for the wrong keywords.",
        "One SEO fix, massive recovery.",
        "Watch before your next upload.",
      ],
    },
    linkedin: {
      caption:
        "A $15,000 SEO lesson for operators: optimizing for vanity traffic instead of pipeline intent burns budget fast. Here's the framework we use now.",
      hashtags: "#SEO #B2BMarketing #Growth #ContentStrategy #DemandGen",
      hookVariants: [
        "We burned $15k chasing the wrong SEO KPIs.",
        "Vanity traffic is an expensive distraction.",
        "Intent-aligned SEO compounds pipeline.",
        "Operators: audit keyword intent this week.",
        "A practical SEO reset for B2B teams.",
      ],
    },
  };
}

function fixtureCaptions(): CaptionResult {
  const platformVariants = fixturePlatformVariants();
  return {
    caption: platformVariants.tiktok.caption,
    hashtags: platformVariants.tiktok.hashtags,
    hookVariants: platformVariants.tiktok.hookVariants,
    platformVariants,
    provider: "fixture",
  };
}

function normalizePlatformVariants(
  raw: Partial<Record<PlatformKey, Partial<PlatformPack>>> | undefined,
  fallback: PlatformVariants,
): PlatformVariants {
  const out = { ...fallback };
  for (const key of PLATFORM_KEYS) {
    const pack = raw?.[key];
    if (!pack) continue;
    out[key] = {
      caption: typeof pack.caption === "string" ? pack.caption : fallback[key].caption,
      hashtags: typeof pack.hashtags === "string" ? pack.hashtags : fallback[key].hashtags,
      hookVariants: Array.isArray(pack.hookVariants)
        ? pack.hookVariants.map(String)
        : fallback[key].hookVariants,
    };
  }
  return out;
}

function useLiveContentAi(env: AppEnv): boolean {
  return env.CONTENT_AI_MODE === "api" && Boolean(env.OPENAI_API_KEY?.trim());
}

export async function transcribeVideo(
  env: AppEnv,
  _videoBuffer: Buffer,
  _filename: string,
): Promise<TranscriptResult> {
  if (!useLiveContentAi(env)) {
    return fixtureTranscript();
  }

  const apiKey = env.OPENAI_API_KEY!.trim();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(_videoBuffer)]), _filename || "source.mp4");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn(`[content-ai] Whisper failed — using fixture captions. ${message.slice(0, 200)}`);
      return fixtureTranscript();
    }

    const data = (await response.json()) as {
      text?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    return {
      text: data.text ?? "",
      segments: (data.segments ?? []).map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
      })),
      provider: "openai",
    };
  } catch (error) {
    console.warn(
      `[content-ai] Whisper error — using fixture. ${error instanceof Error ? error.message : error}`,
    );
    return fixtureTranscript();
  }
}

export async function generateCaptions(
  env: AppEnv,
  transcript: string,
): Promise<CaptionResult> {
  const baseText = transcript.trim() || FIXTURE_TRANSCRIPT;
  const fallback = fixtureCaptions();

  if (!useLiveContentAi(env)) {
    return fallback;
  }

  const apiKey = env.OPENAI_API_KEY!.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write short-form social captions for four platforms. Return JSON with keys tiktok, instagram, youtube, linkedin. Each value is an object with caption (string), hashtags (string), hookVariants (array of 5 strings). Tone: TikTok casual/viral, Instagram discovery-friendly, YouTube SEO title-style caption, LinkedIn professional/B2B.",
          },
          {
            role: "user",
            content: `Create platform-specific caption packs for this transcript:\n\n${baseText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.warn(`[content-ai] Caption GPT failed — using fixture. ${message.slice(0, 200)}`);
      return fallback;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("[content-ai] Caption GPT empty — using fixture.");
      return fallback;
    }

    const parsed = JSON.parse(content) as Partial<Record<PlatformKey, Partial<PlatformPack>>> & {
      caption?: string;
      hashtags?: string;
      hookVariants?: string[];
    };

    const platformVariants = normalizePlatformVariants(parsed, fallback.platformVariants);
    return {
      caption: platformVariants.tiktok.caption || parsed.caption || fallback.caption,
      hashtags: platformVariants.tiktok.hashtags || parsed.hashtags || fallback.hashtags,
      hookVariants:
        platformVariants.tiktok.hookVariants.length > 0
          ? platformVariants.tiktok.hookVariants
          : parsed.hookVariants ?? fallback.hookVariants,
      platformVariants,
      provider: "openai",
    };
  } catch (error) {
    console.warn(
      `[content-ai] Caption error — using fixture. ${error instanceof Error ? error.message : error}`,
    );
    return fallback;
  }
}
