import { describe, expect, it } from "vitest";
import { estimateBatchCostCents } from "./batches";

describe("estimateBatchCostCents", () => {
  it("multiplies fixture run estimate by matrix size", () => {
    expect(estimateBatchCostCents(15, "fixture")).toBe(15 * 61);
  });

  it("uses live pricing when requested", () => {
    expect(estimateBatchCostCents(3, "live")).toBe(3 * 75);
  });
});
