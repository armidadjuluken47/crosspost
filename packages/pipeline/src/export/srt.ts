export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

/** Format seconds as SRT timestamp: HH:MM:SS,mmm */
export function formatSrtTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(secs)},${pad3(ms)}`;
}

export function segmentsToSrt(segments: TranscriptSegment[]): string {
  const lines: string[] = [];
  let index = 1;

  for (const segment of segments) {
    const text = segment.text?.trim();
    if (!text) continue;
    const start = Number(segment.start);
    const end = Number(segment.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    lines.push(String(index));
    lines.push(`${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}`);
    lines.push(text);
    lines.push("");
    index += 1;
  }

  return lines.join("\n");
}

export function transcriptToSrt(transcript: unknown): string | null {
  if (!transcript || typeof transcript !== "object") return null;
  const segments = (transcript as { segments?: unknown }).segments;
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const normalized = segments
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Record<string, unknown>;
      return {
        start: Number(item.start),
        end: Number(item.end),
        text: String(item.text ?? ""),
      };
    })
    .filter((item): item is TranscriptSegment => Boolean(item));

  const srt = segmentsToSrt(normalized);
  return srt.trim() ? srt : null;
}
