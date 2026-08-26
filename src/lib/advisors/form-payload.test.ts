import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { feesFromExpert, feesToPayload } from "./fees.ts";
import { issuerSelectValue, parseAdvisorCredentials, validCredentials } from "./credentials.ts";

describe("feesToPayload", () => {
  it("builds feeRows, feeModels, and min/max from the three fee inputs", () => {
    const payload = feesToPayload({
      fixedFee: "5000",
      auaPercent: "1.0",
      consultationFee: "2500",
      freeSession: "Yes",
    });
    assert.deepEqual(payload.feeModels, ["Fixed fee", "AUA-based", "Consultation"]);
    assert.equal(payload.sessionFeeMin, 2500);
    assert.equal(payload.sessionFeeMax, 5000);
    assert.equal(payload.trialSession, "FIRST_SESSION");
    assert.deepEqual(payload.feeRows, [
      { label: "One-time plan or review", value: "₹5,000" },
      { label: "Ongoing advisory", value: "1.0% p.a." },
      { label: "Per session", value: "₹2,500" },
      { label: "First session", value: "Free" },
    ]);
  });
});

describe("feesFromExpert", () => {
  it("round-trips feeRows back into the three inputs", () => {
    const fees = feesFromExpert({
      feeRows: [
        { label: "One-time plan or review", value: "₹5,000" },
        { label: "Ongoing advisory", value: "1.0% p.a." },
        { label: "Per session", value: "₹2,500" },
        { label: "First session", value: "Free" },
      ],
      trialSession: "NONE",
    });
    assert.deepEqual(fees, {
      fixedFee: "5000",
      auaPercent: "1.0",
      consultationFee: "2500",
      freeSession: "Yes",
    });
  });
});

describe("parseAdvisorCredentials", () => {
  it("reads issuer/role/number and falls back to legacy tags", () => {
    const rows = parseAdvisorCredentials(
      [{ name: "NISM", meta: "Series X-A" }],
      [{ label: "SEBI", value: "INA000012345" }]
    );
    assert.equal(validCredentials(rows).length, 2);
    assert.equal(rows[0].issuer, "NISM");
    assert.equal(rows[1].number, "INA000012345");
  });

  it("keeps unknown issuers so Others can show the original name", () => {
    const rows = parseAdvisorCredentials([
      { issuer: "NISM Mutual Fund Certified", role: "NISM Mutual Fund Certified" },
      { issuer: "IRDAI", role: "Insurance Advisor" },
    ]);
    assert.equal(issuerSelectValue(rows[0].issuer), "Other");
    assert.equal(rows[0].issuer, "NISM Mutual Fund Certified");
    assert.equal(rows[1].issuer, "IRDAI");
  });
});
