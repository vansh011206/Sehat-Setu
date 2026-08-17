import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

interface GuardProps {
  children?: ReactNode;
}

interface RoleGuardProps {
  roles?: string[];
  allowedRoles?: string[];
  children?: ReactNode;
}

/** Redirect to /login if not authenticated. Saves intended path. */
export function RequireAuth({ children }: GuardProps) {
  const { isAuthenticated, user, accessToken } = useAuthStore();
  const location = useLocation();

  const isAuthed = isAuthenticated || Boolean(user && accessToken);

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/** Redirect to role-appropriate dashboard if role doesn't match. */
export function RequireRole({ roles, allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuthStore();
  const targetRoles = roles || allowedRoles || [];

  if (!user || (targetRoles.length > 0 && !targetRoles.includes(user.role))) {
    const dest = user?.role === "ADMIN" ? "/admin/users" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/** Redirect logged-in users away from /login and /register. */
export function RedirectIfAuth({ children }: GuardProps) {
  const { isAuthenticated, user, accessToken } = useAuthStore();

  const isAuthed = isAuthenticated || Boolean(user && accessToken);

  if (isAuthed && user) {
    const dest = user.role === "ADMIN" ? "/admin/users" : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
