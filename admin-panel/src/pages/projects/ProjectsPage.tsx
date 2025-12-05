import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { projectsApi } from '@/api/projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, Image } from 'lucide-react';
import { useState } from 'react';
import { Toast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';

export default function ProjectsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', portfolioId],
    queryFn: () => projectsApi.getByPortfolio(portfolioId!),
    enabled: !!portfolioId,
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', portfolioId] });
      setToast({ message: 'Project deleted successfully', type: 'success' });
    },
    onError: (error: any) => {
      setToast({ 
        message: error?.response?.data?.error || 'Failed to delete project', 
        type: 'error' 
      });
    },
  });

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (!portfolioId) {
    return <div>Portfolio ID is required</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage projects in this portfolio
          </p>
        </div>
        <Link to={`/portfolios/${portfolioId}/projects/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>
                    {project.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Order: {project.order_index}
                      </span>
                      <div className="flex gap-2">
                        <Link to={`/portfolios/${portfolioId}/projects/${project.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(project.id, project.title)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Link to={`/projects/${project.id}/media`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Image className="w-4 h-4 mr-2" />
                        Manage Media
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">No projects yet</p>
                <Link to={`/portfolios/${portfolioId}/projects/new`}>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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

