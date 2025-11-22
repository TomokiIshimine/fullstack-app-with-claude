import { useCallback, useEffect, useState } from 'react'
import type { User } from '@/types/auth'
import * as authApi from '@/lib/api/auth'
import { logger } from '@/lib/logger'

interface AuthService {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

export function useAuthService(): AuthService {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const initializeAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const authenticatedUser = await authApi.refreshToken()
      setUser(authenticatedUser)
      logger.debug('Authentication restored from cookie', {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
      })
    } catch (error) {
      logger.debug('Not authenticated on mount', { error })
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      const authenticatedUser = await authApi.login({ email, password })
      setUser(authenticatedUser)
      logger.info('User logged in', {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
      })
      return authenticatedUser
    } catch (error) {
      logger.error('Login failed', error as Error)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
      setUser(null)
      logger.info('User logged out')
    } catch (error) {
      logger.error('Logout failed', error as Error)
      setUser(null)
      throw error
    }
  }, [])

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser)
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    updateUser,
  }
}
