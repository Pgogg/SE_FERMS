// components/common/ProtectedRoute/ProtectedRoute.jsx — Redirects unauthenticated or unauthorised users away from protected pages
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { ROLE_HOME } from '../../../constants.js';
import Skeleton from '../../ui/Skeleton/Skeleton.jsx';
import styles from './ProtectedRoute.module.css';

/**
 * ProtectedRoute({ roles })
 *
 * Behaviour (per CONVENTIONS §7 and task requirements):
 *  1. While auth is loading → show a full-page Skeleton.
 *  2. Not authenticated → redirect to /login, remembering the requested location.
 *  3. Authenticated but role not in `roles` → redirect to user's ROLE_HOME.
 *  4. All checks pass → render <Outlet /> (or children when used without Outlet).
 *
 * AppRouter already wraps each page in <ProtectedRoute roles={...}><Page /></ProtectedRoute>
 * so both the Outlet pattern and the children pattern are supported.
 */
export default function ProtectedRoute({ roles = [], children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 1. Still resolving the token — show skeleton to prevent flash redirects
  if (loading) {
    return (
      <div className={styles.loadingWrap} role="status" aria-label="Loading…">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  // 2. Not authenticated — go to /login, remember where we were
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Wrong role — redirect to the user's natural home page
  if (roles.length > 0 && (!user?.role || !roles.includes(user.role))) {
    const home = (user?.role && ROLE_HOME[user.role]) ? ROLE_HOME[user.role] : '/';
    return <Navigate to={home} replace />;
  }

  // 4. Authorised — render page
  return children ? <>{children}</> : <Outlet />;
}
