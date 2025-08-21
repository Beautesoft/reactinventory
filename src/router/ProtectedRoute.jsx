import { Navigate } from 'react-router-dom';
import { Loader2 } from "lucide-react";
import useAuth from '@/hooks/useAuth';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for authentication to initialize before making routing decisions
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;