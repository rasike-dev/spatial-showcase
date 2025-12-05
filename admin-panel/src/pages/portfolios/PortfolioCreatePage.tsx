import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { portfoliosApi } from '@/api/portfolios';
import type { CreatePortfolioData } from '@/api/portfolios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { TemplateSelector } from '@/components/templates/TemplateSelector';

const portfolioSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  template_id: z.string().default('creative-portfolio'),
});

type PortfolioFormData = z.infer<typeof portfolioSchema>;

export default function PortfolioCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      template_id: 'creative-portfolio',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreatePortfolioData) => portfoliosApi.create(data),
    onSuccess: (portfolio) => {
      console.log('Portfolio created successfully:', portfolio);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setToast({ message: 'Portfolio created successfully!', type: 'success' });
      // Navigate to portfolio list after showing success message
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      navigateTimeoutRef.current = setTimeout(() => {
        console.log('[PortfolioCreate] Navigating to /portfolios...');
        try {
          navigate('/portfolios', { replace: true });
        } catch (error) {
          console.error('[PortfolioCreate] Navigation error:', error);
          // Fallback: use window.location
          window.location.href = '/portfolios';
        }
      }, 1500);
    },
    onError: (error: any) => {
      console.error('Create failed:', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to create portfolio';
      setToast({ message: errorMessage, type: 'error' });
    },
  });

  const onSubmit = (data: PortfolioFormData) => {
    mutation.mutate(data as CreatePortfolioData);
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
      <h1 className="text-3xl font-bold mb-8">Create New Portfolio</h1>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Details</CardTitle>
          <CardDescription>Enter the basic information for your portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title *
              </label>
              <Input
                id="title"
                {...register('title')}
                placeholder="My Portfolio"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="A brief description of your portfolio"
              />
            </div>

            <div>
              <TemplateSelector
                selectedTemplateId={watch('template_id')}
                onSelect={(templateId) => setValue('template_id', templateId)}
                disabled={mutation.isPending}
              />
              {errors.template_id && (
                <p className="text-red-500 text-sm mt-1">{errors.template_id.message}</p>
              )}
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
                {mutation.isPending ? 'Creating...' : mutation.isSuccess ? 'Created!' : 'Create Portfolio'}
              </Button>
              {mutation.isSuccess && (
                <Button
                  type="button"
                  onClick={() => navigate('/portfolios')}
                >
                  View Portfolios
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

