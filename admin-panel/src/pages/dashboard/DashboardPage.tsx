import { useQuery } from '@tanstack/react-query';
import { portfoliosApi } from '@/api/portfolios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const { data: portfolios, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: portfoliosApi.getAll,
  });

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
        <div>Loading...</div>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Template: {portfolio.template_id}
                    </span>
                    <Link to={`/portfolios/${portfolio.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
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
    </div>
  );
}

