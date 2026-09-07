import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatWhyPanel } from "./whyPanel.ts";

const baseItem = {
  transactionId: "txn-1",
  decidedBy: "LLM",
  confidence: 0.7,
  descriptor: "UPI-CR GROWW",
  merchantKey: "name:groww",
};

describe("formatWhyPanel", () => {
  it("says no reasoning was stored for an LLM decision", () => {
    const view = formatWhyPanel(baseItem, {
      storedDecision: {
        source: "LLM",
        confidence: 0.7,
        autoEnrichment: { shop_name: "Groww" },
      },
      extractedMerchant: { shop_name: "Groww", remarks: null },
      ladderInputs: [],
    });

    assert.equal(view.rung, "LLM");
    assert.match(view.headline, /no reasoning was stored/i);
    assert.equal(view.shopName, "Groww");
    assert.equal(view.descriptor, "UPI-CR GROWW");
    assert.equal(view.confidence, 0.7);
  });

  it("names the Regex match and confidence", () => {
    const view = formatWhyPanel(
      {
        ...baseItem,
        decidedBy: "Regex",
        confidence: 0.99,
        descriptor: "ACH MUTUAL FUND ICICI PRUDENTIAL",
      },
      {
        storedDecision: { source: "Regex", confidence: 0.99, autoEnrichment: {} },
        extractedMerchant: { shop_name: "MUTUAL FUND", remarks: null },
        ladderInputs: [
          {
            step: "merchant_master_phase_a",
            matched: true,
            detail: { systemCategoryName: "Investment Returns", type: "income" },
          },
        ],
      }
    );

    assert.equal(view.rung, "Regex");
    assert.match(view.headline, /MUTUAL FUND/);
    assert.match(view.headline, /0\.99/);
    assert.equal(view.patternCategory, "Investment Returns");
  });

  it("shows cache mapping confirmed and user-corrected flags", () => {
    const view = formatWhyPanel(
      { ...baseItem, decidedBy: "Cache" },
      {
        storedDecision: { source: "Cache", confidence: 0.95, autoEnrichment: {} },
        extractedMerchant: { shop_name: "Groww", remarks: null },
        ladderInputs: [
          {
            step: "user_merchant_mapping",
            matched: true,
            detail: {
              categoryId: "cat-1",
              confirmed: true,
              userCorrected: false,
            },
          },
        ],
      }
    );

    assert.equal(view.rung, "Cache");
    assert.equal(view.mapping?.confirmed, true);
    assert.equal(view.mapping?.userCorrected, false);
    assert.equal(view.mapping?.categoryId, "cat-1");
  });

  it("shows crowd merchant profile name and votes", () => {
    const view = formatWhyPanel(
      { ...baseItem, decidedBy: "Crowd" },
      {
        storedDecision: { source: "Crowd", confidence: 0.8, autoEnrichment: {} },
        extractedMerchant: { shop_name: "Swiggy", remarks: null },
        ladderInputs: [
          {
            step: "merchant_profile_crowd",
            matched: true,
            detail: {
              canonicalName: "Swiggy",
              crowdPoints: 12,
              crowdSystemCategoryId: "sys-food",
            },
          },
        ],
      }
    );

    assert.equal(view.rung, "Crowd");
    assert.equal(view.crowd?.canonicalName, "Swiggy");
    assert.equal(view.crowd?.crowdPoints, 12);
  });
});
