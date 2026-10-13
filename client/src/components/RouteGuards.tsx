import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME, type Role } from '@iitr/shared';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from './Spinner';

/**
 * Pages that need login and one of the given roles.
 * Logged-out users go to /login (and come back afterwards); other roles go to their own home.
 * This is only for navigation: the server enforces the same rules on every API call.
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  // Google sign-ups must add enrollment number, bhawan and phone before using the shop.
  if (user.role === 'STUDENT' && !user.profileComplete && location.pathname !== COMPLETE_PROFILE_PATH) {
    return <Navigate to={COMPLETE_PROFILE_PATH} replace />;
  }
  return <Outlet />;
}

export const COMPLETE_PROFILE_PATH = '/complete-profile';

/** Login/register: logged-in users are sent to their own home instead. */
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

/** True if a path belongs to the given role's area (used to honour "return to" after login). */
export function pathBelongsToRole(path: string, role: Role): boolean {
  const area = path.startsWith('/admin') ? 'ADMIN' : path.startsWith('/delivery') ? 'DELIVERY_PARTNER' : 'STUDENT';
  return area === role;
}
