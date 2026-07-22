// Domain types for the Merchant Master admin screen.
// These mirror the DB schema described in the ticket. `category`/`typeLabel`
// style display fields are denormalised for the UI — resolve them from your
// real category service when wiring to the backend.

export type VerificationLevel =
  | 'llm_low'
  | 'llm_medium'
  | 'llm_high'
  | 'user_confirmed'
  | 'multi_user_confirmed';

export type IdentifierType = 'UPI' | 'NEFT' | 'ACCOUNT';

export type MerchantType = 'Need' | 'Want' | 'Saving' | 'Income' | 'Transfer' | 'Other';

/** merchant_identifiers */
export interface MerchantIdentifier {
  id: string;
  type: IdentifierType;
  value: string;      // payment ID value
  createdAt: string;  // ISO or display date
}

/** merchant_aliases */
export interface MerchantAlias {
  id: string;
  rawName: string;            // bank-statement name
  bankSource: string | null;  // optional bank source
  seenCount: number;          // how often this alias was seen
}

/** merchant_category_votes */
export interface CategoryVote {
  systemCategoryId: string;
  category: string;   // display label
  points: number;     // vote weight
  updatedAt: string;
}

/** user_merchant_mappings (per-user, not global) */
export interface UserMerchantMapping {
  merchantKey: string;
  systemCategoryId: string;
  category: string;       // display label
  userCorrected: boolean;
  confirmed: boolean;
  firstSeen: string;      // derived from usage timestamps
  lastSeen: string;
}

/** merchant_profiles + related, joined for the detail view */
export interface MerchantProfile {
  id: string;
  canonicalName: string;         // display name
  upiId: string;                 // legacy primary UPI (also synced to identifiers)
  accountNumber: string;         // legacy account ref
  systemCategoryId: string;      // assigned system category
  category: string;              // display label for systemCategoryId
  type: MerchantType;            // category type mirror (Need/Want/…)
  tags: string[];                // JSON taxonomy tags
  seenCount: number;             // how often this profile was matched
  confidence: number;            // match confidence, 0..1 (legacy / category-ish)
  identityScore: number;         // KED-1110: merchant identity trust 1–5
  categoryScore: number;         // category confidence 1–5
  verificationLevel: VerificationLevel; // legacy; prefer identityScore for identity
  createdAt: string;
  updatedAt: string;

  identifiers: MerchantIdentifier[];
  aliases: MerchantAlias[];
  categoryVotes: CategoryVote[];
  userMappings: UserMerchantMapping[];

  // Computed — count of transactions.merchantProfileId === this.id.
  // Not stored on the profile row; hydrate from an aggregate query.
  transactionCount: number;
}

export interface MerchantMasterStats {
  totalProfiles: number;
  needsReview: number;       // identityScore <= 2 (guess / weak)
  userConfirmed: number;     // identityScore >= 3
  needsCategoryReview: number; // categoryScore <= 2
  categoryConfirmed: number;   // categoryScore >= 3
  withIdentifiers: number;
  duplicateGroups: number;
}
