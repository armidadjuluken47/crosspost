export const SUBTITLE_STYLES = ["minimal", "bold", "karaoke", "boxed"] as const;

export type SubtitleStyle = (typeof SUBTITLE_STYLES)[number];

export const SUBTITLE_STYLE_LABELS: Record<SubtitleStyle, string> = {
  minimal: "Minimal",
  bold: "Bold",
  karaoke: "Karaoke",
  boxed: "Boxed",
};

export function normalizeSubtitleStyle(value: unknown): SubtitleStyle {
  if (typeof value === "string" && SUBTITLE_STYLES.includes(value as SubtitleStyle)) {
    return value as SubtitleStyle;
  }
  return "minimal";
}
