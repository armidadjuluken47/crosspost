export type ImageInputRole = "face" | "body" | "scenery";

export interface ImageInputSlotDefinition {
  slot: number;
  role: ImageInputRole;
  label: string;
}

export interface LabeledImageInput extends ImageInputSlotDefinition {
  url: string;
}

/** Default Switch / Emman method — stored as settings-friendly config for Part 3. */
export const DEFAULT_IMAGE_INPUT_SLOTS: ImageInputSlotDefinition[] = [
  { slot: 1, role: "face", label: "Face" },
  { slot: 2, role: "face", label: "Face" },
  { slot: 3, role: "face", label: "Face" },
  { slot: 4, role: "body", label: "Body" },
  { slot: 5, role: "scenery", label: "Scenery" },
];

export const IMAGE_CANDIDATES_PER_CALL = 4;

export function buildLabeledImageInputs(input: {
  referenceImageUrls: string[];
  sourceFirstFrameUrl: string;
  slots?: ImageInputSlotDefinition[];
}): LabeledImageInput[] {
  const slots = input.slots ?? DEFAULT_IMAGE_INPUT_SLOTS;
  const refs = input.referenceImageUrls.filter(Boolean).slice(0, 3);
  const firstFrame = input.sourceFirstFrameUrl;

  if (!firstFrame) {
    throw new Error("Source first frame URL is required for image generation");
  }

  while (refs.length < 3) {
    const fallback = refs[refs.length - 1] ?? firstFrame;
    refs.push(fallback);
  }

  const urlByRole: Record<ImageInputRole, string[]> = {
    face: refs,
    body: [firstFrame],
    scenery: [firstFrame],
  };

  let faceIndex = 0;

  return slots.map((slot) => {
    let url: string;
    if (slot.role === "face") {
      url = urlByRole.face[faceIndex] ?? refs[0]!;
      faceIndex += 1;
    } else {
      url = urlByRole[slot.role][0]!;
    }

    return { ...slot, url };
  });
}

export function imageUrlsFromLabeledInputs(inputs: LabeledImageInput[]): string[] {
  return inputs.map((row) => row.url);
}

export function parseLabeledInputsFromStagePayload(
  payload: Record<string, unknown> | null | undefined,
): ImageInputSlotDefinition[] {
  if (!payload) return [];

  const topLevel = payload.labeled_inputs;
  const rows = Array.isArray(topLevel)
    ? topLevel
    : (() => {
        const batches = payload.batches;
        if (!Array.isArray(batches) || batches.length === 0) return null;
        const firstBatch = batches[0];
        if (!firstBatch || typeof firstBatch !== "object") return null;
        const nested = (firstBatch as Record<string, unknown>).labeled_inputs;
        return Array.isArray(nested) ? nested : null;
      })();

  if (!rows) return [];

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const slot = Number(record.slot);
      if (!slot) return null;
      return {
        slot,
        role: String(record.role ?? "") as ImageInputRole,
        label: String(record.label ?? ""),
      };
    })
    .filter((row): row is ImageInputSlotDefinition => Boolean(row));
}
