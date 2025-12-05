import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FolderKanban, Settings, LogOut } from 'lucide-react';

export default function DashboardLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Spatial Showcase</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Admin Panel</p>
        </div>

        <nav className="px-4 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/portfolios"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FolderKanban className="w-5 h-5" />
            <span>Portfolios</span>
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <p className="text-sm font-medium">{user?.name || user?.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.subscription_tier}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}

