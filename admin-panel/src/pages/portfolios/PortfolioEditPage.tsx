import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfoliosApi } from '@/api/portfolios';
import type { UpdatePortfolioData } from '@/api/portfolios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { TemplateSelector } from '@/components/templates/TemplateSelector';
import { TemplateCustomizer } from '@/components/templates/TemplateCustomizer';
import { ShareDialog } from '@/components/share/ShareDialog';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Share2, BarChart3 } from 'lucide-react';

export default function PortfolioEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const navigateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => portfoliosApi.getById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdatePortfolioData) => {
      console.log('[PortfolioEdit] Starting update with data:', data);
      const result = await portfoliosApi.update(id!, data);
      console.log('[PortfolioEdit] Update completed, received:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[PortfolioEdit] onSuccess called with:', data);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
      setToast({ message: 'Portfolio updated successfully!', type: 'success' });
      // Navigate back after a short delay to show the success message
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      navigateTimeoutRef.current = setTimeout(() => {
        console.log('[PortfolioEdit] Navigating to /portfolios...');
        try {
          navigate('/portfolios', { replace: true });
        } catch (error) {
          console.error('[PortfolioEdit] Navigation error:', error);
          // Fallback: use window.location
          window.location.href = '/portfolios';
        }
      }, 1500);
    },
    onError: (error: any) => {
      console.error('Update failed:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to update portfolio';
      setToast({ message: errorMessage, type: 'error' });
    },
  });

  // Cleanup timeout on unmount - MUST be before any conditional logic
  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, []);

  // Update state when portfolio data loads - MUST be before any conditional logic
  useEffect(() => {
    if (portfolio) {
      setSelectedTemplateId(portfolio.template_id);
      setSettings(portfolio.settings || {});
    }
  }, [portfolio]);

  // Render loading state - but hooks are already called above
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Render error state - but hooks are already called above
  if (!portfolio) {
    return <div>Portfolio not found</div>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      template_id: selectedTemplateId,
      settings: settings,
      is_public: formData.get('is_public') === 'on',
    });
  };

  return (
    <div className="max-w-2xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Portfolio</h1>
        {id && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Portfolio
            </Button>
          </div>
        )}
      </div>

      {/* Analytics Dashboard - Always render to maintain hook order */}
      {id && (
        <div className={`mb-8 ${showAnalytics ? '' : 'hidden'}`}>
          <AnalyticsDashboard portfolioId={id} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Details</CardTitle>
          <CardDescription>Update your portfolio information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title *
              </label>
              <Input
                id="title"
                name="title"
                defaultValue={portfolio.title}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={portfolio.description || ''}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <TemplateSelector
                selectedTemplateId={selectedTemplateId}
                onSelect={setSelectedTemplateId}
                disabled={mutation.isPending}
              />
            </div>

            {/* Template Customizer - Always render to maintain hook order */}
            <TemplateCustomizer
              templateId={selectedTemplateId || ''}
              settings={settings}
              onSettingsChange={setSettings}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                name="is_public"
                defaultChecked={portfolio.is_public}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_public" className="text-sm font-medium">
                Make portfolio public
              </label>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/portfolios')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
                {mutation.isPending ? 'Saving...' : mutation.isSuccess ? 'Saved!' : 'Save Changes'}
              </Button>
              {mutation.isSuccess && (
                <Button
                  type="button"
                  onClick={() => navigate('/portfolios')}
                >
                  Back to Portfolios
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Share Dialog Modal */}
      {showShareDialog && id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ShareDialog
              portfolioId={id}
              onClose={() => setShowShareDialog(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

