import { api } from './client';
import { Expert, ExpertFormData } from '@/types';
import { buildPayload } from '@/lib/advisors/form-payload';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB — must match backend multer cap

export { buildPayload };

export const expertsApi = {
  getAll: async (): Promise<Expert[]> => {
    const response = await api.get<{ experts: Expert[] }>('/api/experts/admin/all');
    return response.data.data.experts;
  },

  /**
   * Upload a photo file to the backend. Returns the relative URL
   * (e.g. "/uploads/expert-photos/foo-12345.jpg") to be stored on the Expert row.
   * Throws with a readable message if the file is too large or the wrong type.
   */
  uploadPhoto: async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Photo must be an image file');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error(
        `Photo is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`
      );
    }
    const fd = new FormData();
    fd.append('photo', file);
    const response = await api.post<{ photo: string }>(
      '/api/experts/upload-photo',
      fd,
      // Let the browser set the multipart boundary — explicitly clear the default JSON header
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data.photo;
  },

  create: async (form: ExpertFormData): Promise<Expert> => {
    const response = await api.post<{ expert: Expert }>(
      '/api/experts/create',
      buildPayload(form)
    );
    return response.data.data.expert;
  },

  update: async (id: string, form: ExpertFormData): Promise<Expert> => {
    const response = await api.put<{ expert: Expert }>(
      `/api/experts/update/${id}`,
      buildPayload(form)
    );
    return response.data.data.expert;
  },

  toggle: async (id: string): Promise<Expert> => {
    const response = await api.put<{ expert: Expert }>(`/api/experts/toggle/${id}`);
    return response.data.data.expert;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/experts/delete/${id}`);
  },
};
