import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@/types/auth'
import * as authApi from '@/lib/api/auth'
import { logger } from '@/lib/logger'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Try to refresh token to verify authentication
      await authApi.refreshToken()
      // If refresh succeeds, we're authenticated
      // Note: The backend doesn't return user info on refresh,
      // so we'll set a minimal user object or fetch user info separately
      // For now, we'll mark as authenticated but won't have user details
      // until after login
      setIsLoading(false)
    } catch (error) {
      // Not authenticated or token expired
      logger.debug('Not authenticated on mount', { error })
      setUser(null)
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const user = await authApi.login({ email, password })
      setUser(user)
      logger.info('User logged in', { userId: user.id, email: user.email })
    } catch (error) {
      logger.error('Login failed', error as Error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
      setUser(null)
      logger.info('User logged out')
    } catch (error) {
      logger.error('Logout failed', error as Error)
      // Clear user state even if logout request fails
      setUser(null)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
