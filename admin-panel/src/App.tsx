import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import PortfoliosPage from './pages/portfolios/PortfoliosPage';
import PortfolioCreatePage from './pages/portfolios/PortfolioCreatePage';
import PortfolioEditPage from './pages/portfolios/PortfolioEditPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectCreatePage from './pages/projects/ProjectCreatePage';
import ProjectEditPage from './pages/projects/ProjectEditPage';
import MediaPage from './pages/media/MediaPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="portfolios" element={<PortfoliosPage />} />
            <Route path="portfolios/new" element={<PortfolioCreatePage />} />
            <Route path="portfolios/:id/edit" element={<PortfolioEditPage />} />
            <Route path="portfolios/:portfolioId/projects" element={<ProjectsPage />} />
            <Route path="portfolios/:portfolioId/projects/new" element={<ProjectCreatePage />} />
            <Route path="portfolios/:portfolioId/projects/:id/edit" element={<ProjectEditPage />} />
            <Route path="projects/:projectId/media" element={<MediaPage />} />
            <Route path="portfolios/:portfolioId/media" element={<MediaPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
