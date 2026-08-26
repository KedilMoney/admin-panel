export type FeeForm = {
  fixedFee: string;
  auaPercent: string;
  consultationFee: string;
  freeSession: "Yes" | "No";
};

export type FeeRow = { label: string; value: string };

export type FeePayload = {
  feeModels: string[];
  feeRows: FeeRow[];
  sessionFeeMin: number;
  sessionFeeMax: number;
  trialSession: "NONE" | "FIRST_SESSION";
};

function rupeeAmount(raw: string): number {
  const n = Number(String(raw).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function auaAmount(raw: string): string {
  const n = String(raw).replace(/%\s*p\.a\.?/i, "").trim();
  return n;
}

export function feesToPayload(fees: FeeForm): FeePayload {
  const feeRows: FeeRow[] = [];
  const feeModels: string[] = [];
  if (fees.fixedFee.trim()) {
    feeModels.push("Fixed fee");
    feeRows.push({
      label: "One-time plan or review",
      value: `₹${Number(fees.fixedFee).toLocaleString("en-IN")}`,
    });
  }
  if (fees.auaPercent.trim()) {
    feeModels.push("AUA-based");
    feeRows.push({ label: "Ongoing advisory", value: `${fees.auaPercent}% p.a.` });
  }
  if (fees.consultationFee.trim()) {
    feeModels.push("Consultation");
    feeRows.push({
      label: "Per session",
      value: `₹${Number(fees.consultationFee).toLocaleString("en-IN")}`,
    });
  }
  if (fees.freeSession === "Yes") {
    feeRows.push({ label: "First session", value: "Free" });
  }

  const rupeeFees = [fees.fixedFee, fees.consultationFee].map(rupeeAmount).filter((n) => n > 0);
  return {
    feeModels,
    feeRows,
    sessionFeeMin: rupeeFees.length ? Math.min(...rupeeFees) : 0,
    sessionFeeMax: rupeeFees.length ? Math.max(...rupeeFees) : 0,
    trialSession: fees.freeSession === "Yes" ? "FIRST_SESSION" : "NONE",
  };
}

export function feesFromExpert(expert: {
  feeRows?: FeeRow[] | null;
  trialSession?: string | null;
  feeModels?: string[];
  sessionFeeMin?: number;
  sessionFeeMax?: number;
}): FeeForm {
  const rows = Array.isArray(expert.feeRows) ? expert.feeRows : [];
  let fixedFee = "";
  let auaPercent = "";
  let consultationFee = "";
  let freeSession: "Yes" | "No" = expert.trialSession === "FIRST_SESSION" ? "Yes" : "No";

  for (const row of rows) {
    if (row.label === "One-time plan or review") {
      const n = rupeeAmount(row.value);
      if (n) fixedFee = String(n);
    } else if (row.label === "Ongoing advisory") {
      auaPercent = auaAmount(row.value);
    } else if (row.label === "Per session") {
      const n = rupeeAmount(row.value);
      if (n) consultationFee = String(n);
    } else if (row.label === "First session" && row.value.trim().toLowerCase() === "free") {
      freeSession = "Yes";
    }
  }

  if (!fixedFee && !auaPercent && !consultationFee) {
    const models = (expert.feeModels || []).map((m) => m.toLowerCase());
    const min = expert.sessionFeeMin ?? 0;
    const max = expert.sessionFeeMax ?? 0;
    if (models.some((m) => m.includes("fixed")) && min > 0) fixedFee = String(min);
    if (models.some((m) => m.includes("aua"))) auaPercent = auaPercent;
    if (models.some((m) => m.includes("consult")) && max > 0) consultationFee = String(max);
    if (!fixedFee && !consultationFee && min > 0) consultationFee = String(min);
  }

  return { fixedFee, auaPercent, consultationFee, freeSession };
}
