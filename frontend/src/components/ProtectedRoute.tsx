import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: string
}

/**
 * Protected route component that requires authentication and optionally a specific role
 * Redirects to login page if not authenticated
 * Redirects to appropriate page if role doesn't match
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
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

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect based on user's role
    if (user?.role === 'admin') {
      return <Navigate to="/admin/users" replace />
    } else {
      return <Navigate to="/todos" replace />
    }
  }

  // Render children if authenticated and role matches
  return <>{children}</>
}
