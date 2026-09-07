import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { suspectReasonLabel } from "./suspectLabels.ts";

describe("suspectReasonLabel", () => {
  it("renders human labels and never hides a reason", () => {
    assert.equal(suspectReasonLabel("low_confidence"), "low confidence");
    assert.equal(suspectReasonLabel("degenerate_merchant_key"), "degenerate merchant key");
    assert.equal(suspectReasonLabel("contaminated_descriptor"), "contaminated descriptor");
    assert.equal(suspectReasonLabel("category_disagreement"), "category disagreement");
  });
});
