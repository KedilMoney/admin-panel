import { suspectReasonLabel } from "./suspectLabels";
import type { CategoryReviewItem } from "./types";

export interface ExportSummary {
  transactionCount: number;
  userCount: number;
  suspectCount: number;
}

export interface ExportModel {
  sheetNames: ["Decisions", "Summary"];
  decisions: {
    headers: string[];
    rows: Array<Array<string | number | null>>;
  };
  summary: {
    rows: Array<Array<string | number>>;
    legend: string[];
  };
  freezeHeader: true;
  autoFilter: true;
  fontName: "Arial";
}

const DECISION_HEADERS = [
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
];

const LEGEND = [
  "low confidence — enrichment confidence below 0.80",
  "degenerate merchant key — key has no usable identity",
  "contaminated descriptor — spliced statement head before the real body",
  "category disagreement — transaction category differs from the merchant profile",
];

export function buildExportModel(args: {
  categoryName: string;
  items: Array<
    Pick<
      CategoryReviewItem,
      | "userEmail"
      | "date"
      | "amount"
      | "type"
      | "categoryName"
      | "descriptor"
      | "decidedBy"
      | "confidence"
      | "merchantKey"
      | "suspectReasons"
      | "suspectScore"
    >
  >;
  summary: ExportSummary;
}): ExportModel {
  return {
    sheetNames: ["Decisions", "Summary"],
    decisions: {
      headers: DECISION_HEADERS,
      rows: args.items.map((item) => [
        item.userEmail,
        item.date,
        item.amount,
        item.type,
        item.categoryName,
        item.descriptor,
        item.decidedBy,
        item.confidence,
        item.merchantKey,
        item.suspectScore,
        item.suspectReasons.map(suspectReasonLabel).join("; "),
      ]),
    },
    summary: {
      rows: [
        ["Category", args.categoryName],
        ["Transactions", args.summary.transactionCount],
        ["Users", args.summary.userCount],
        ["Suspects", args.summary.suspectCount],
      ],
      legend: LEGEND,
    },
    freezeHeader: true,
    autoFilter: true,
    fontName: "Arial",
  };
}
