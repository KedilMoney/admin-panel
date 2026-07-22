import { api } from './client';
import type {
  EnricherApplyDecision,
  EnricherApplyResult,
  EnricherDomain,
  StoredEnricherScan,
} from '@/types';

const ENRICHER_TIMEOUT_MS = 180_000;

export const enricherApi = {
  getLatest: async (domain: EnricherDomain): Promise<StoredEnricherScan | null> => {
    const response = await api.get<StoredEnricherScan | null>(
      `/api/admin/enricher/latest?domain=${encodeURIComponent(domain)}`
    );
    return response.data.data;
  },

  scan: async (domain: EnricherDomain, limit?: number): Promise<StoredEnricherScan> => {
    const response = await api.post<StoredEnricherScan>(
      '/api/admin/enricher/scan',
      { domain, limit },
      { timeout: ENRICHER_TIMEOUT_MS }
    );
    return response.data.data;
  },

  apply: async (args: {
    domain: EnricherDomain;
    suggestions: StoredEnricherScan['result']['suggestions'];
    decisions: EnricherApplyDecision[];
  }): Promise<EnricherApplyResult> => {
    const response = await api.post<EnricherApplyResult>('/api/admin/enricher/apply', args, {
      timeout: ENRICHER_TIMEOUT_MS,
    });
    return response.data.data;
  },

  getQueueStats: async (domain: EnricherDomain) => {
    const response = await api.get<import('@/types').EnricherQueueStats>(
      `/api/admin/enricher/queue-stats?domain=${encodeURIComponent(domain)}`
    );
    return response.data.data;
  },

  rebuildQueue: async (domain?: EnricherDomain) => {
    const response = await api.post<{ domains: EnricherDomain[]; syncedProfiles: number }>(
      '/api/admin/enricher/rebuild-queue',
      domain ? { domain } : {}
    );
    return response.data.data;
  },
};
