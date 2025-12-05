import api from '../lib/api';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  preview_image_url: string | null;
  config: {
    scenes?: string[];
    layout?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      background?: string;
    };
    features?: string[];
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const templatesApi = {
  getAll: async (): Promise<Template[]> => {
    const response = await api.get<{ templates: Template[] }>('/templates');
    return response.data.templates;
  },

  getById: async (id: string): Promise<Template> => {
    const response = await api.get<{ template: Template }>(`/templates/${id}`);
    return response.data.template;
  },
};

