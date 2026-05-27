export interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  details?: any;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
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

export type FeeModel = 'FEE_ONLY' | 'COMMISSION' | 'BOTH';
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
  specialisation: string;
  city: string;
  bio: string;
  feeModel: FeeModel;
  trialSession: TrialSession;
  certification: string;
  registrationNo?: string | null;
  sessionFeeMin: number;
  sessionFeeMax: number;
  experience: number;
  languages: string[];
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
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
  specialisation: string;
  city: string;
  bio: string;
  feeModel: FeeModel;
  trialSession: TrialSession;
  certification: string;
  registrationNo: string;
  sessionFeeMin: string;
  sessionFeeMax: string;
  experience: string;
  languages: string[];
  phone: string;
  whatsapp: string;
  website: string;
  hasAgency: boolean;
  agencyName: string;
  agencyType: string;
  agencyDescription: string;
  agencyWebsite: string;
}

export interface MerchantProfile {
  id: string;
  canonicalName: string;
  upiId?: string | null;
  accountNumber?: string | null;
  type: string;
  confidence: number;
  verificationLevel: string;
  seenCount: number;
  createdAt: string;
  updatedAt: string;
  systemCategoryId: string;
  systemCategory: SystemCategoryOption;
  _count: {
    aliases: number;
    transactions: number;
  };
}

