import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getDefaultPathForRole } from '@/lib/utils/routing'

/**
 * Component that redirects to the appropriate page based on user role
 * - Admin users are redirected to /admin/users
 * - Regular users are redirected to /settings
 * - Unauthenticated users are redirected to /login
 */
export function RoleBasedRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect based on user role
  const defaultPath = getDefaultPathForRole(user?.role)
  return <Navigate to={defaultPath} replace />
}
