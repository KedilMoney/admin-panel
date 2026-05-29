import { api } from './client';

export type BudgetTemplateCategoryType = 'need' | 'want' | 'saving';

export interface BudgetTemplateCategory {
  name: string;
  type: BudgetTemplateCategoryType;
}

export interface BudgetTemplateGroup {
  name: string;
  categories: BudgetTemplateCategory[];
}

export interface AdminOnboardingUser {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  onboardingCompleted: boolean;
  currentStep: number;
  completed: boolean;
  lastStep?: number | null;
  abandoned: boolean;
  totalDuration?: number | null;
  step1Entered: boolean;
  step1Completed: boolean;
  step1Skipped: boolean;
  step1Duration?: number | null;
  step2Entered: boolean;
  step2Completed: boolean;
  step2Skipped: boolean;
  step2Duration?: number | null;
  step3Entered: boolean;
  step3Completed: boolean;
  step3Skipped: boolean;
  step3Duration?: number | null;
  step4Entered: boolean;
  step4Completed: boolean;
  step4Skipped: boolean;
  step4Duration?: number | null;
}

export interface NameUsageRow {
  normalizedName: string;
  name: string;
  distinctUsers: number;
  totalRecords: number;
}

export interface SystemCategoryTagRow {
  categoryName: string;
  tags: string[];
}

export interface SystemCategoryTagsPayload {
  categories: SystemCategoryTagRow[];
}

export type AutoCatApplyMode = 'sync' | 'async';

export interface AutoCatApplyResponseData {
  mode: AutoCatApplyMode;
  jobId?: string;
  jobIds?: string[];
  totalTransactions: number;
}

export interface AutoCatJobStatusData {
  id: string | number;
  state: string;
  progress: unknown;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface AutoCatQueueStatsData {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface DebugClearCategoryPayeeResponseData {
  updatedCount: number;
  scope: 'selected' | 'all';
}

export interface UserStats {
  totalUsers: number;
  activeNow: number;
  newThisWeek: number;
  newThisMonth: number;
  dau: number;
  wau: number;
  mau: number;
  onboardingCompletedCount: number;
  onboardingCompletionRate: number;
  lastLoginAt: string | null;
  signupTrend: { date: string; count: number }[];
}

export const adminApi = {
  getUserStats: async (): Promise<UserStats> => {
    const response = await api.get<UserStats>('/api/admin/user-stats');
    return response.data.data;
  },

  getOnboarding: async (): Promise<AdminOnboardingUser[]> => {
    const response = await api.get<AdminOnboardingUser[]>('/api/admin/onboarding');
    return response.data.data;
  },

  getCategoryUsage: async (): Promise<NameUsageRow[]> => {
    const response = await api.get<NameUsageRow[]>('/api/admin/category-usage');
    return response.data.data;
  },

  getGroupUsage: async (): Promise<NameUsageRow[]> => {
    const response = await api.get<NameUsageRow[]>('/api/admin/group-usage');
    return response.data.data;
  },

  getBudgetTemplate: async (): Promise<BudgetTemplateGroup[]> => {
    const response = await api.get<BudgetTemplateGroup[]>('/api/admin/budget-template');
    return response.data.data;
  },

  updateBudgetTemplate: async (
    template: BudgetTemplateGroup[]
  ): Promise<BudgetTemplateGroup[]> => {
    const response = await api.put<BudgetTemplateGroup[]>('/api/admin/budget-template', { template });
    return response.data.data;
  },

  getCategoryTags: async (): Promise<SystemCategoryTagsPayload> => {
    const response = await api.get<SystemCategoryTagsPayload>('/api/admin/category-tags');
    return response.data.data;
  },

  updateCategoryTags: async (
    categories: SystemCategoryTagRow[]
  ): Promise<SystemCategoryTagsPayload> => {
    const response = await api.put<SystemCategoryTagsPayload>('/api/admin/category-tags', {
      categories,
    });
    return response.data.data;
  },

  debugClearCategoryPayee: async (): Promise<DebugClearCategoryPayeeResponseData> => {
    const response = await api.post<DebugClearCategoryPayeeResponseData>(
      '/api/transactions/debug/clear-category-payee',
      {}
    );
    return response.data.data;
  },

  debugAutoCategorizeAll: async (): Promise<AutoCatApplyResponseData> => {
    const response = await api.post<AutoCatApplyResponseData>(
      '/api/transactions/debug/auto-categorize-all',
      {
        forceAsync: true,
        forceRecategorize: true,
      }
    );
    return response.data.data;
  },

  getAutoCatJobStatus: async (jobId: string): Promise<AutoCatJobStatusData> => {
    const response = await api.get<AutoCatJobStatusData>(
      `/api/transactions/auto-cat-job/${encodeURIComponent(jobId)}`
    );
    return response.data.data;
  },

  getAutoCatQueueStats: async (): Promise<AutoCatQueueStatsData> => {
    const response = await api.get<AutoCatQueueStatsData>(
      '/api/transactions/auto-cat-queue-stats'
    );
    return response.data.data;
  },
};

