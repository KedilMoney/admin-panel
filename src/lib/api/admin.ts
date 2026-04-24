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

export const adminApi = {
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
};

