import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { CreateProjectData } from '@/api/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order_index: z.number().int().min(0),
  panel_count: z.number().int().min(1).max(20), // 1-20 panels per room/level
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      order_index: 0,
      panel_count: 1, // Default: 1 panel per room/level
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateProjectData) => projectsApi.create(data),
    onSuccess: (project) => {
      console.log('Project created successfully:', project);
      queryClient.invalidateQueries({ queryKey: ['projects', portfolioId] });
      setToast({ message: 'Project created successfully!', type: 'success' });
      // Navigate to project list after showing success message
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      navigateTimeoutRef.current = setTimeout(() => {
        console.log('[ProjectCreate] Navigating to projects list...');
        try {
          navigate(`/portfolios/${portfolioId}/projects`, { replace: true });
        } catch (error) {
          console.error('[ProjectCreate] Navigation error:', error);
          window.location.href = `/portfolios/${portfolioId}/projects`;
        }
      }, 1500);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to create project';
      console.error('Error creating project:', error);
      setToast({ message: errorMessage, type: 'error' });
    },
  });

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, []);

  const onSubmit = (data: ProjectFormData) => {
    if (!portfolioId) {
      setToast({ message: 'Portfolio ID is required', type: 'error' });
      return;
    }
    mutation.mutate({
      portfolio_id: portfolioId,
      ...data,
    });
  };

  if (!portfolioId) {
    return <div>Portfolio ID is required</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Add a new project to this portfolio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Enter the project information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title *
              </label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter project title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="Enter project description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="order_index" className="block text-sm font-medium mb-2">
                Order Index <span className="text-gray-500 text-xs">(for multiple levels/rooms)</span>
              </label>
              <Input
                id="order_index"
                type="number"
                {...register('order_index', { valueAsNumber: true })}
                placeholder="0"
                min={0}
                className={errors.order_index ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Set the order of this project/room. Lower numbers appear first.
              </p>
              {errors.order_index && (
                <p className="text-red-500 text-sm mt-1">{errors.order_index.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="panel_count" className="block text-sm font-medium mb-2">
                Number of Panels per Room/Level
              </label>
              <Input
                id="panel_count"
                type="number"
                {...register('panel_count', { valueAsNumber: true })}
                placeholder="1"
                min={1}
                max={20}
                className={errors.panel_count ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                <strong>Important:</strong> This should equal the number of media items you'll add to this project.
                Each media item = one panel. Set this to match your media count (1-20).
              </p>
              {errors.panel_count && (
                <p className="text-red-500 text-sm mt-1">{errors.panel_count.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/portfolios/${portfolioId}/projects`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
                {mutation.isPending ? 'Creating...' : mutation.isSuccess ? 'Created!' : 'Create Project'}
              </Button>
              {mutation.isSuccess && (
                <Button
                  type="button"
                  onClick={() => navigate(`/portfolios/${portfolioId}/projects`)}
                >
                  View Projects
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

