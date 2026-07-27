import { z } from "zod";

export const IMAGE_ASPECT_RATIOS = ["2:3", "9:16"] as const;
export const IMAGE_RESOLUTIONS = ["1k", "2k", "4k"] as const;

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];
export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number];

export const outputSettingsSchema = z.object({
  imageAspectRatio: z.enum(IMAGE_ASPECT_RATIOS).default("2:3"),
  imageResolution: z.enum(IMAGE_RESOLUTIONS).default("1k"),
  normalizeWidth: z.coerce.number().int().positive().default(1080),
  normalizeHeight: z.coerce.number().int().positive().default(1920),
});

export type OutputSettings = z.infer<typeof outputSettingsSchema>;

export const DEFAULT_OUTPUT_SETTINGS: OutputSettings = {
  imageAspectRatio: "2:3",
  imageResolution: "1k",
  normalizeWidth: 1080,
  normalizeHeight: 1920,
};

export const ENGINE_SETTINGS_OUTPUT_KEY = "output_defaults";

export function parseOutputSettings(value: unknown): OutputSettings {
  return outputSettingsSchema.parse({ ...DEFAULT_OUTPUT_SETTINGS, ...(value as object) });
}
