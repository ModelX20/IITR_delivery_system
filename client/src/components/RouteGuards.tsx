import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from './Spinner';

/** Pages that need login. Unauthenticated users go to /login and come back afterwards. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Login/register: logged-in users are sent to the shop instead. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
