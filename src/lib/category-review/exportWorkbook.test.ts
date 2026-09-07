import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportModel } from "./exportWorkbook.ts";

describe("buildExportModel", () => {
  it("builds Decisions and Summary sheets for the current view", () => {
    const model = buildExportModel({
      categoryName: "Investment Returns",
      items: [
        {
          userEmail: "a@x.com",
          date: "2025-10-18",
          amount: 94999,
          type: "CREDIT",
          categoryName: "Investment Returns",
          descriptor: "Se/ICIC/raisesecur/Mutu 0097695162091 AT 40623",
          decidedBy: "LLM",
          confidence: 0.7,
          merchantKey: "name:se",
          suspectReasons: ["low_confidence", "degenerate_merchant_key"],
          suspectScore: 2,
        },
      ],
      summary: {
        transactionCount: 1,
        userCount: 1,
        suspectCount: 1,
      },
    });

    assert.deepEqual(model.sheetNames, ["Decisions", "Summary"]);
    assert.deepEqual(model.decisions.headers, [
      "User email",
      "Date",
      "Amount",
      "Type",
      "Category",
      "Bank descriptor",
      "Decided by",
      "Confidence",
      "Merchant key",
      "Suspect score",
      "Suspect reasons",
    ]);
    assert.equal(model.decisions.rows[0][2], 94999);
    assert.equal(model.decisions.rows[0][10], "low confidence; degenerate merchant key");
    assert.equal(model.summary.rows[0][1], "Investment Returns");
    assert.ok(model.summary.legend.some((line) => /low confidence/i.test(line)));
    assert.equal(model.freezeHeader, true);
    assert.equal(model.autoFilter, true);
    assert.equal(model.fontName, "Arial");
  });
});
