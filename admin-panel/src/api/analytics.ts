import api from '../lib/api';

export interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  avgTimeSpent: number;
  viewsOverTime: Array<{ date: string; views: number }>;
  deviceBreakdown: Array<{ device_type: string; count: number }>;
}

export const analyticsApi = {
  getPortfolioAnalytics: async (portfolioId: string): Promise<AnalyticsData> => {
    const response = await api.get<AnalyticsData>(`/analytics/portfolio/${portfolioId}`);
    return response.data;
  },
};

