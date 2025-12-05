import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Users, Clock, TrendingUp, Monitor, Smartphone, Headphones } from 'lucide-react';

interface AnalyticsDashboardProps {
  portfolioId: string;
}

export function AnalyticsDashboard({ portfolioId }: AnalyticsDashboardProps) {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics', portfolioId],
    queryFn: () => analyticsApi.getPortfolioAnalytics(portfolioId),
    enabled: !!portfolioId,
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500">Failed to load analytics</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No analytics data available</div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'vr':
        return <Headphones className="w-5 h-5" />;
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <p className="text-xs text-muted-foreground">All time views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground">Distinct IP addresses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(analytics.avgTimeSpent)}
            </div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Views Over Time */}
      {analytics.viewsOverTime && analytics.viewsOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Views Over Time (Last 30 Days)
            </CardTitle>
            <CardDescription>Daily view count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.viewsOverTime.map((item, index) => {
                const maxViews = Math.max(...analytics.viewsOverTime.map(v => parseInt(v.views)));
                const percentage = maxViews > 0 ? (parseInt(item.views) / maxViews) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 w-24">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div
                        className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {item.views}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Breakdown */}
      {analytics.deviceBreakdown && analytics.deviceBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Views by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.deviceBreakdown.map((device, index) => {
                const total = analytics.deviceBreakdown.reduce((sum, d) => sum + parseInt(d.count), 0);
                const percentage = total > 0 ? (parseInt(device.count) / total) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(device.device_type)}
                      <span className="text-sm font-medium capitalize">
                        {device.device_type || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {device.count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(!analytics.viewsOverTime || analytics.viewsOverTime.length === 0) &&
       (!analytics.deviceBreakdown || analytics.deviceBreakdown.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No detailed analytics data yet. Share your portfolio to start tracking views!
          </CardContent>
        </Card>
      )}
    </div>
  );
}

