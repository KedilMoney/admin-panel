import axios from 'axios';
import { PlannerIcon, PlannerIconInput } from '@/types';

// Kedil Planner is a separate product with its own API. Its admin routes take the Planner admin key,
// kept in this browser only, never the Tracker admin token.
// No default: a local admin panel must never edit production icons by accident.
export const PLANNER_API_URL = process.env.NEXT_PUBLIC_PLANNER_API_URL || '';
export const PLANNER_KEY_STORAGE = 'planner_admin_key';

export const getPlannerKey = (): string =>
  typeof window !== 'undefined' ? localStorage.getItem(PLANNER_KEY_STORAGE) || '' : '';

export const setPlannerKey = (key: string) => {
  if (typeof window === 'undefined') return;
  if (key) localStorage.setItem(PLANNER_KEY_STORAGE, key);
  else localStorage.removeItem(PLANNER_KEY_STORAGE);
};

const plannerClient = axios.create({ baseURL: PLANNER_API_URL, timeout: 30000 });

plannerClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getPlannerKey()}`;
  return config;
});

/** The Planner API answers { error } on failure. */
export const plannerErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Planner admin key is missing or wrong.';
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
    if (!error.response) return 'Could not reach the Planner API.';
  }
  return 'Something went wrong.';
};

export const isPlannerKeyRejected = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;

export const plannerIconsApi = {
  getAll: async (): Promise<PlannerIcon[]> => {
    const response = await plannerClient.get<{ icons: PlannerIcon[] }>('/api/admin/icons');
    return response.data.icons || [];
  },

  create: async (data: PlannerIconInput): Promise<PlannerIcon> => {
    const response = await plannerClient.post<{ icon: PlannerIcon }>('/api/admin/icons', data);
    return response.data.icon;
  },

  update: async (slug: string, data: Omit<PlannerIconInput, 'slug'>): Promise<PlannerIcon> => {
    const response = await plannerClient.put<{ icon: PlannerIcon }>(`/api/admin/icons/${encodeURIComponent(slug)}`, data);
    return response.data.icon;
  },

  delete: async (slug: string): Promise<void> => {
    await plannerClient.delete(`/api/admin/icons/${encodeURIComponent(slug)}`);
  },
};
