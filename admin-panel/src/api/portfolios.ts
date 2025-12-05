import api from '../lib/api';

export interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  template_id: string;
  settings: Record<string, any>;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePortfolioData {
  title: string;
  description?: string;
  template_id?: string;
  settings?: Record<string, any>;
}

export interface UpdatePortfolioData {
  title?: string;
  description?: string;
  template_id?: string;
  settings?: Record<string, any>;
  is_public?: boolean;
}

export const portfoliosApi = {
  getAll: async (): Promise<Portfolio[]> => {
    const response = await api.get<{ portfolios: Portfolio[] }>('/portfolios');
    return response.data.portfolios;
  },

  getById: async (id: string): Promise<Portfolio> => {
    const response = await api.get<{ portfolio: Portfolio }>(`/portfolios/${id}`);
    return response.data.portfolio;
  },

  create: async (data: CreatePortfolioData): Promise<Portfolio> => {
    const response = await api.post<{ portfolio: Portfolio }>('/portfolios', data);
    return response.data.portfolio;
  },

  update: async (id: string, data: UpdatePortfolioData): Promise<Portfolio> => {
    console.log('[PortfoliosAPI] Updating portfolio:', id, data);
    try {
      const response = await api.put<{ portfolio: Portfolio }>(`/portfolios/${id}`, data);
      console.log('[PortfoliosAPI] Update response received:', response.data);
      return response.data.portfolio;
    } catch (error: any) {
      console.error('[PortfoliosAPI] Update error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/portfolios/${id}`);
  },
};

