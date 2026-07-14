import { useMutation, useQuery } from '@tanstack/react-query';
import { enricherApi } from '@/lib/api/enricher';
import type { EnricherApplyDecision, EnricherDomain, EnricherSuggestion } from '@/types';

export const useEnricherLatest = (domain: EnricherDomain) =>
  useQuery({
    queryKey: ['enricher', 'latest', domain],
    queryFn: () => enricherApi.getLatest(domain),
    staleTime: 60_000,
  });

export const useEnricherScan = () =>
  useMutation({
    mutationFn: ({ domain, limit }: { domain: EnricherDomain; limit?: number }) =>
      enricherApi.scan(domain, limit),
  });

export const useEnricherApply = () =>
  useMutation({
    mutationFn: (args: {
      domain: EnricherDomain;
      suggestions: EnricherSuggestion[];
      decisions: EnricherApplyDecision[];
    }) => enricherApi.apply(args),
  });
