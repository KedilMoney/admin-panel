export interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  country?: string;
  details?: unknown;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  onboardingCompleted?: boolean;
  isActive?: boolean;
}

export interface BankMaster {
  id: number;
  name: string;
  slug: string;
  shortName: string;
  url?: string;
  blob_image?: string;
  imageUrl?: string;
  isGlobal: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  isAutoCreated?: boolean;
  isGlobal?: boolean;
  createdAt?: string;
  updatedAt?: string;
  allocated?: number;
  available?: number;
  activity?: any[];
  assignedHistory?: any[];
  groupId?: string;
  groupName?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  allocatedAmount?: number;
  carryForward?: boolean;
  description?: string;
  imageUrl?: string;
  details?: any;
}

export interface Group {
  id: string;
  name: string;
  isAutoCreated?: boolean;
  isGlobal?: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  details?: any;
}

export interface CategoryGroup {
  id: string;
  name: string;
  isAutoCreated?: boolean;
  allocated?: number;
  available?: number;
  activity?: number;
  categories?: Category[];
}

export interface DashboardData {
  groups: CategoryGroup[];
  uncategorized: {
    amount: number;
    activity: any[];
  };
  summary: {
    assigned: number;
    activity: number;
    available: number;
    credit: number;
    debit: number;
    overspent: number;
    dateRange: {
      fromDate: string;
      toDate: string;
    };
  };
}

export interface Icon {
  id: string;
  slug: string;
  groupTitle?: string;
  imageUrl?: string;
  blob_image?: string;
  searchTags?: string[];
  tags?: string; // Comma-separated tags for display
  isGlobal?: boolean;
  createdAt?: string;
  updatedAt?: string;
  created_by?: string;
  updated_by?: string;
}

export type MerchantMasterRuleType = 'Need' | 'Want' | 'Saving' | 'Savings';

export interface MerchantMasterUpiRule {
  match: string;
  systemCategoryName: string;
  type: MerchantMasterRuleType;
}

export interface MerchantMasterNamePatternRule {
  pattern: string;
  systemCategoryName: string;
  type: MerchantMasterRuleType;
}

export interface MerchantMasterData {
  meta: {
    lastUpdated: string;
    source: string;
    upiSubstringCount: number;
    namePatternCount: number;
    /** Present when API supports it: LLM auto-categorization can append rules server-side. */
    serverAutoTrainingEnabled?: boolean;
  };
  upiSubstrings: MerchantMasterUpiRule[];
  namePatterns: MerchantMasterNamePatternRule[];
}

export interface SystemCategoryOption {
  id: string;
  name: string;
  type: string;
}

export type TrialSession = 'NONE' | 'FIRST_SESSION';

export interface Agency {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  website?: string | null;
}

export interface Expert {
  id: string;
  name: string;
  lastName?: string | null;
  photo?: string | null;
  specialisation: string[];
  city: string;
  bio: string;
  feeModels: string[];
  trialSession: TrialSession;
  certification: string[];
  registrationNo: string[];
  sessionFeeMin: number;
  sessionFeeMax: number;
  experience: number;
  languages: string[];
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  isActive: boolean;
  agency?: Agency | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form-side mirror of Expert. Number fields are strings so the input can be
 * cleared (you can't backspace the last digit when the state is forced to a
 * number — every empty value coerces back to 0). Coerced to numbers in
 * buildPayload before sending to the API.
 */
export interface ExpertFormData {
  name: string;
  lastName: string;
  photo: string;
  specialisation: string[];
  city: string;
  bio: string;
  feeModels: string[];
  trialSession: TrialSession;
  certification: string[];
  registrationNo: string[];
  sessionFeeMin: string;
  sessionFeeMax: string;
  experience: string;
  languages: string[];
  phone: string;
  whatsapp: string;
  website: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  youtube: string;
  hasAgency: boolean;
  agencyName: string;
  agencyType: string;
  agencyDescription: string;
  agencyWebsite: string;
}

export interface MerchantTag {
  value: string;
  count: number;
  isPrimary: boolean;
}

export interface MerchantCategoryVote {
  id: string;
  points: number;
  systemCategory: SystemCategoryOption;
}

export interface MerchantAlias {
  id: string;
  rawName: string;
  bankSource?: string | null;
  seenCount: number;
}

export interface MerchantIdentifier {
  id: string;
  type: 'UPI' | 'NEFT' | 'ACCOUNT';
  value: string;
  createdAt: string;
}

export interface MerchantProfile {
  id: string;
  canonicalName: string;
  upiId?: string | null;
  accountNumber?: string | null;
  type: string;
  tags?: MerchantTag[] | unknown;
  confidence: number;
  verificationLevel: string;
  seenCount: number;
  createdAt: string;
  updatedAt: string;
  systemCategoryId: string;
  systemCategory: SystemCategoryOption;
  categoryVotes?: MerchantCategoryVote[];
  aliases?: MerchantAlias[];
  identifiers?: MerchantIdentifier[];
  _count: {
    aliases: number;
    transactions: number;
    identifiers?: number;
  };
}

export interface MerchantMergeJobResult {
  mergedGroups: number;
  deletedProfiles: number;
}

export interface MerchantAliasCleanupAction {
  type: 'keep' | 'update' | 'delete' | 'merge';
  aliasId?: string;
  sourceAliasId?: string;
  targetAliasId?: string;
  merchantProfileId: string;
  merchantName?: string;
  rawName: string;
  sanitizedName: string | null;
  seenCount?: number;
  bankSource?: string | null;
  reasons: string[];
}

export interface MerchantAliasCleanupCorrection {
  aliasId: string;
  decision: 'accept' | 'skip' | 'keep_original' | 'custom_name' | 'force_delete';
  customName?: string;
  remember?: boolean;
}

export interface MerchantAliasCleanupResult {
  mode: 'dry_run' | 'apply';
  applied: boolean;
  summary: {
    scanned: number;
    kept: number;
    normalized: number;
    deleted: number;
    merged: number;
    ambiguous: number;
  };
  actions: MerchantAliasCleanupAction[];
  changes?: MerchantAliasCleanupAction[];
  protectedCount?: number;
  learnedCount?: number;
  appliedSummary?: {
    scanned: number;
    kept: number;
    normalized: number;
    deleted: number;
    merged: number;
    ambiguous: number;
  };
  samples: {
    normalized: MerchantAliasCleanupAction[];
    deleted: MerchantAliasCleanupAction[];
    merged: MerchantAliasCleanupAction[];
    ambiguous: MerchantAliasCleanupAction[];
  };
}

