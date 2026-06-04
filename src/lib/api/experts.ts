import { api } from './client';
import { Expert, ExpertFormData } from '@/types';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB — must match backend multer cap

/**
 * Build the JSON payload sent to /api/experts/create or /update/:id.
 * Photo is expected to be a URL returned by uploadPhoto() — never a base64 data URL.
 * Number fields are coerced from strings here so the form can keep them as
 * strings (needed to allow clearing the input).
 */
function buildPayload(form: ExpertFormData) {
  return {
    name: form.name,
    lastName: form.lastName || null,
    photo: form.photo || null,
    specialisation: form.specialisation.map((s) => s.trim()).filter(Boolean),
    city: form.city,
    bio: form.bio,
    feeModels: form.feeModels.map((f) => f.trim()).filter(Boolean),
    trialSession: form.trialSession,
    certification: form.certification.map((c) => c.trim()).filter(Boolean),
    registrationNo: form.registrationNo.map((r) => r.trim()).filter(Boolean),
    sessionFeeMin: Number(form.sessionFeeMin) || 0,
    sessionFeeMax: Number(form.sessionFeeMax) || 0,
    experience: Number(form.experience) || 0,
    languages: form.languages.map((l) => l.trim()).filter(Boolean),
    phone: form.phone || null,
    whatsapp: form.whatsapp || null,
    website: form.website || null,
    linkedin: form.linkedin || null,
    instagram: form.instagram || null,
    facebook: form.facebook || null,
    youtube: form.youtube || null,
    agency: form.hasAgency
      ? {
          name: form.agencyName,
          type: form.agencyType,
          description: form.agencyDescription || null,
          website: form.agencyWebsite || null,
        }
      : null,
  };
}

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
