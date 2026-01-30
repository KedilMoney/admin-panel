import { api } from './client';

export type DocIssueStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface DocIssueUser {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export interface DocIssue {
  id: string;
  userId: string;
  status: DocIssueStatus;
  failureReason: string;
  errorDetails: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  documentPath: string | null;
  fileName: string;
  fileType: string;
  fileSizeBytes: number | null;
  userComments: string | null;
  createdAt: string;
  updatedAt: string;
  user: DocIssueUser;
}

export interface DocIssuesListParams {
  search?: string;
  status?: DocIssueStatus;
  page?: number;
  limit?: number;
}

export interface DocIssuesListResponse {
  issues: DocIssue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const docIssuesApi = {
  getAll: async (params?: DocIssuesListParams): Promise<DocIssuesListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const response = await api.get<DocIssuesListResponse>(
      `/api/doc-issues/admin/all${query ? `?${query}` : ''}`
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<DocIssue> => {
    const response = await api.get<DocIssue>(`/api/doc-issues/${id}`);
    return response.data.data;
  },

  updateStatus: async (id: string, status: DocIssueStatus): Promise<void> => {
    await api.patch(`/api/doc-issues/${id}/status`, { status });
  },
};
