import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { UpdateProjectData } from '@/api/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order_index: z.number().int().min(0),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectEditPage() {
  const navigate = useNavigate();
  const { portfolioId, id } = useParams<{ portfolioId: string; id: string }>();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  useEffect(() => {
    if (project) {
      reset({
        title: project.title,
        description: project.description || '',
        order_index: project.order_index,
      });
    }
  }, [project, reset]);

  const mutation = useMutation({
    mutationFn: (data: UpdateProjectData) => projectsApi.update(id!, data),
    onSuccess: (updatedProject) => {
      console.log('Project updated successfully:', updatedProject);
      queryClient.invalidateQueries({ queryKey: ['projects', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setToast({ message: 'Project updated successfully!', type: 'success' });
      // Navigate to project list after showing success message
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      navigateTimeoutRef.current = setTimeout(() => {
        console.log('[ProjectEdit] Navigating to projects list...');
        try {
          navigate(`/portfolios/${portfolioId}/projects`, { replace: true });
        } catch (error) {
          console.error('[ProjectEdit] Navigation error:', error);
          window.location.href = `/portfolios/${portfolioId}/projects`;
        }
      }, 1500);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update project';
      console.error('Error updating project:', error);
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
    mutation.mutate(data);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  if (!portfolioId) {
    return <div>Portfolio ID is required</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Project</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Update project information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Update the project information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                Order Index
              </label>
              <Input
                id="order_index"
                type="number"
                {...register('order_index', { valueAsNumber: true })}
                placeholder="0"
                min={0}
                className={errors.order_index ? 'border-red-500' : ''}
              />
              {errors.order_index && (
                <p className="text-red-500 text-sm mt-1">{errors.order_index.message}</p>
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
                {mutation.isPending ? 'Saving...' : mutation.isSuccess ? 'Saved!' : 'Save Changes'}
              </Button>
              {mutation.isSuccess && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/portfolios/${portfolioId}/projects`)}
                >
                  Back to Projects
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

