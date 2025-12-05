import api from '../lib/api';

export interface Media {
  id: string;
  project_id: string | null;
  portfolio_id: string | null;
  type: string;
  url: string;
  filename: string;
  file_size: number;
  mime_type: string;
  order_index: number;
  created_at: string;
}

export interface UploadMediaData {
  project_id?: string;
  portfolio_id?: string;
  type: string;
  order_index?: number;
}

export const mediaApi = {
  getByProject: async (projectId: string): Promise<Media[]> => {
    const response = await api.get<{ media: Media[] }>(`/media?project_id=${projectId}`);
    return response.data.media;
  },

  getByPortfolio: async (portfolioId: string): Promise<Media[]> => {
    const response = await api.get<{ media: Media[] }>(`/media?portfolio_id=${portfolioId}`);
    return response.data.media;
  },

  upload: async (file: File, data: UploadMediaData): Promise<Media> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);
    if (data.project_id) formData.append('project_id', data.project_id);
    if (data.portfolio_id) formData.append('portfolio_id', data.portfolio_id);
    if (data.order_index !== undefined) formData.append('order_index', data.order_index.toString());

    const response = await api.post<{ media: Media }>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.media;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/media/${id}`);
  },
};

