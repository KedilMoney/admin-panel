import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canPublishAdvisor, draftAdvisorName } from "./drafts.ts";

describe("draftAdvisorName", () => {
  it("reads name from a partial payload", () => {
    assert.equal(draftAdvisorName({ name: "Subramanian", email: "sub@advisor.in" }), "Subramanian");
  });

  it("falls back when the payload has no name", () => {
    assert.equal(draftAdvisorName({ email: "sub@advisor.in" }), "Untitled draft");
    assert.equal(draftAdvisorName(null), "Untitled draft");
  });
});

describe("canPublishAdvisor", () => {
  it("is true only for PENDING advisors", () => {
    assert.equal(canPublishAdvisor({ status: "PENDING", isActive: false }), true);
    assert.equal(canPublishAdvisor({ status: "PUBLISHED", isActive: true }), false);
    assert.equal(canPublishAdvisor({ isActive: false }), false);
  });
});
