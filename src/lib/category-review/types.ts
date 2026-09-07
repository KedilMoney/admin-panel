export type SuspectReason =
  | "low_confidence"
  | "degenerate_merchant_key"
  | "contaminated_descriptor"
  | "category_disagreement"
  | string;

export interface CategoryReviewSummaryRow {
  name: string;
  transactionCount: number;
  userCount: number;
  suspectCount: number;
}

export interface CategoryReviewSummary {
  categories: CategoryReviewSummaryRow[];
}

export interface CategoryReviewItem {
  transactionId: string;
  userEmail: string | null;
  date: string;
  amount: number;
  type: string;
  categoryName: string;
  descriptor: string;
  decidedBy: string | null;
  confidence: number | null;
  merchantKey: string | null;
  ruleId: string | null;
  payeeName: string | null;
  merchantProfileName: string | null;
  suspectScore: number;
  suspectReasons: SuspectReason[];
}

export interface CategoryReviewList {
  items: CategoryReviewItem[];
  total: number;
  nextCursor: string | null;
}

export interface DiagnosisCheck {
  step: string;
  matched: boolean;
  detail?: Record<string, unknown>;
}

export interface CategoryReviewDiagnosis {
  transactionId?: string;
  rawDescriptor?: string;
  extractedMerchant?: { shop_name?: string | null; remarks?: string | null };
  storedDecision?: {
    source?: string | null;
    confidence?: number | null;
    autoEnrichment?: Record<string, unknown> | null;
  };
  ladderInputs?: DiagnosisCheck[];
}

export interface WhyPanelView {
  rung: string;
  headline: string;
  descriptor: string;
  shopName: string | null;
  confidence: number | null;
  patternCategory: string | null;
  mapping: {
    categoryId: string | null;
    confirmed: boolean | null;
    userCorrected: boolean | null;
  } | null;
  crowd: {
    canonicalName: string | null;
    crowdPoints: number | null;
  } | null;
}
