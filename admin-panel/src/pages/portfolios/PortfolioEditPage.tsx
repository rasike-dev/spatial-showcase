import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfoliosApi } from '@/api/portfolios';
import type { UpdatePortfolioData } from '@/api/portfolios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';

export default function PortfolioEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!portfolio) {
    return <div>Portfolio not found</div>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      template_id: formData.get('template_id') as string,
      is_public: formData.get('is_public') === 'on',
    });
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-2xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <h1 className="text-3xl font-bold mb-8">Edit Portfolio</h1>

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
              <label htmlFor="template_id" className="block text-sm font-medium mb-1">
                Template
              </label>
              <select
                id="template_id"
                name="template_id"
                defaultValue={portfolio.template_id}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="creative-portfolio">Creative Portfolio</option>
                <option value="tech-showcase">Tech Showcase</option>
                <option value="photography-gallery">Photography Gallery</option>
              </select>
            </div>

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
    </div>
  );
}

