import api from '../lib/api';

export interface ShareLink {
  shareUrl: string;
  token: string;
  qrCode: string;
  expiresAt: string | null;
}

export interface GenerateShareLinkData {
  expires_in_days?: number;
  password?: string;
}

export const shareApi = {
  getByToken: async (token: string) => {
    const response = await api.get(`/share/${token}`);
    return response.data;
  },

  generate: async (portfolioId: string, data?: GenerateShareLinkData): Promise<ShareLink> => {
    const response = await api.post<ShareLink>(`/share/${portfolioId}/generate`, data || {});
    return response.data;
  },
};

