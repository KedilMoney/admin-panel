import type { SuspectReason } from "./types";

const LABELS: Record<string, string> = {
  low_confidence: "low confidence",
  degenerate_merchant_key: "degenerate merchant key",
  contaminated_descriptor: "contaminated descriptor",
  category_disagreement: "category disagreement",
};

export function suspectReasonLabel(reason: SuspectReason): string {
  return LABELS[reason] ?? String(reason).replace(/_/g, " ");
}
