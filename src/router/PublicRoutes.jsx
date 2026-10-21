import useAuth from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from "lucide-react";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-svh w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

export default PublicRoute;