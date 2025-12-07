import api from '../lib/api';

export interface ShareLink {
  shareUrl: string;
  token: string;
  qrCode?: string; // Optional - can be generated on frontend
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
    console.log('[Share API] ========== GENERATE SHARE LINK START ==========');
    console.log('[Share API] Portfolio ID:', portfolioId);
    console.log('[Share API] API URL:', import.meta.env.VITE_API_URL || 'http://localhost:3000/api');
    console.log('[Share API] Full URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/share/${portfolioId}/generate`);
    const startTime = Date.now();
    
    // Check if we have a token
    const token = localStorage.getItem('token');
    console.log('[Share API] Auth token present:', !!token);
    if (token) {
      console.log('[Share API] Token preview:', token.substring(0, 30) + '...');
    }
    
    try {
      console.log('[Share API] About to call api.post()...');
      const response = await api.post<ShareLink>(`/share/${portfolioId}/generate`, data || {});
      const duration = Date.now() - startTime;
      console.log('[Share API] ✅ Share link generated in', duration, 'ms');
      console.log('[Share API] Response data:', response.data);
      console.log('[Share API] ========== GENERATE SHARE LINK SUCCESS ==========');
      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[Share API] ❌ Error generating share link after', duration, 'ms');
      console.error('[Share API] Error object:', error);
      console.error('[Share API] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null,
        request: error.request ? 'Request object exists' : 'No request object',
        timeout: error.code === 'ECONNABORTED',
        networkError: !error.response && !error.request
      });
      console.error('[Share API] ========== GENERATE SHARE LINK ERROR ==========');
      
      // More specific error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - the server took too long to respond');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed - please log in again');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - you do not have permission to share this portfolio');
      } else if (error.response?.status === 404) {
        throw new Error('Portfolio not found');
      } else if (!error.response && !error.request) {
        throw new Error('Network error - could not connect to server. Is the server running?');
      } else if (!error.response) {
        throw new Error('Network error - request was sent but no response received');
      }
      
      throw error;
    }
  },
};

