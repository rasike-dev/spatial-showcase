import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfoliosApi } from '@/api/portfolios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, FolderOpen, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Toast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { ShareDialog } from '@/components/share/ShareDialog';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sharePortfolioId, setSharePortfolioId] = useState<string | null>(null);

  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: portfoliosApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: portfoliosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setToast({ message: 'Portfolio deleted successfully', type: 'success' });
    },
    onError: (error: any) => {
      setToast({ 
        message: error?.response?.data?.error || 'Failed to delete portfolio', 
        type: 'error' 
      });
    },
  });

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your VR portfolios
          </p>
        </div>
        <Link to="/portfolios/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios && portfolios.length > 0 ? (
            portfolios.map((portfolio) => (
              <Card key={portfolio.id}>
                <CardHeader>
                  <CardTitle>{portfolio.title}</CardTitle>
                  <CardDescription>
                    {portfolio.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Template: {portfolio.template_id || 'Not set'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSharePortfolioId(portfolio.id)}
                          className="flex items-center gap-1"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </Button>
                        <Link to={`/portfolios/${portfolio.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(portfolio.id, portfolio.title)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Link to={`/portfolios/${portfolio.id}/projects`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        View Projects
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">No portfolios yet</p>
                <Link to="/portfolios/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Portfolio
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

      {/* Share Dialog Modal */}
      {sharePortfolioId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ShareDialog
              portfolioId={sharePortfolioId}
              onClose={() => setSharePortfolioId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

