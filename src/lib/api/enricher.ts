import { api } from './client';
import type {
  EnricherApplyDecision,
  EnricherApplyResult,
  EnricherDomain,
  EnricherScanResult,
  EnricherSuggestion,
} from '@/types';

export const enricherApi = {
  scan: async (domain: EnricherDomain, limit?: number): Promise<EnricherScanResult> => {
    const response = await api.post<EnricherScanResult>('/api/admin/enricher/scan', {
      domain,
      limit,
    });
    return response.data.data;
  },

  apply: async (args: {
    domain: EnricherDomain;
    suggestions: EnricherSuggestion[];
    decisions: EnricherApplyDecision[];
  }): Promise<EnricherApplyResult> => {
    const response = await api.post<EnricherApplyResult>('/api/admin/enricher/apply', args);
    return response.data.data;
  },
};
