import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignmentScoreLabel } from "./assignmentScore.ts";

describe("assignmentScoreLabel", () => {
  it("renders the 1–5 ladder and ignores decimals", () => {
    assert.equal(assignmentScoreLabel(1), "1 — Guess");
    assert.equal(assignmentScoreLabel(5), "5 — Known rule");
    assert.equal(assignmentScoreLabel(null), null);
    assert.equal(assignmentScoreLabel(0.7), null);
  });
});
