import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docIssuesApi, DocIssueStatus, DocIssuesListParams } from '@/lib/api/docIssues';

export const docIssuesQueryKey = (params?: DocIssuesListParams) =>
  ['docIssues', params?.search ?? '', params?.status ?? '', params?.page ?? 1, params?.limit ?? 20] as const;

export const useDocIssues = (params?: DocIssuesListParams) => {
  return useQuery({
    queryKey: docIssuesQueryKey(params),
    queryFn: () => docIssuesApi.getAll(params),
  });
};

export const useUpdateDocIssueStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocIssueStatus }) =>
      docIssuesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docIssues'] });
    },
  });
};
