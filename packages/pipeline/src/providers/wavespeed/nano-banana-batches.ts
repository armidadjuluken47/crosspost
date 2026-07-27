export const NANO_BANANA_EDIT_MULTI_BATCH_SIZE = 2;

export function isNanoBananaEditMulti(providerModel: string): boolean {
  return providerModel.includes("nano-banana") && providerModel.includes("edit-multi");
}

export function isNanoBanana2Edit(providerModel: string): boolean {
  return providerModel.includes("nano-banana-2") && providerModel.includes("/edit");
}

/** WaveSpeed edit-multi only accepts num_images=2 per request. */
export function planNanoBananaEditMultiBatches(candidateCount: number): number[] {
  if (candidateCount <= 0) return [];

  const batches: number[] = [];
  let remaining = candidateCount;

  while (remaining > 0) {
    batches.push(NANO_BANANA_EDIT_MULTI_BATCH_SIZE);
    remaining -= NANO_BANANA_EDIT_MULTI_BATCH_SIZE;
  }

  return batches;
}

export function planImageCandidateBatches(providerModel: string, candidateCount: number): number[] {
  if (isNanoBananaEditMulti(providerModel)) {
    return planNanoBananaEditMultiBatches(candidateCount);
  }

  if (isNanoBanana2Edit(providerModel)) {
    return Array.from({ length: candidateCount }, () => 1);
  }

  return [candidateCount];
}
