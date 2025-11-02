import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import * as authApi from '@/lib/api/auth'
import { createMockUser } from '@/test/helpers/mockData'
import { type ReactNode } from 'react'

describe('AuthContext', () => {
  const mockUser = createMockUser({
    id: 1,
    email: 'test@example.com',
  })

  beforeEach(() => {
    vi.spyOn(authApi, 'login').mockResolvedValue(mockUser)
    vi.spyOn(authApi, 'logout').mockResolvedValue()
    vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

  describe('Initial Load', () => {
    it('attempts to refresh token on mount', async () => {
      renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(authApi.refreshToken).toHaveBeenCalled()
      })
    })

    it('sets user when refresh token succeeds', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('stays unauthenticated when refresh token fails', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('sets isLoading to true initially', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.isLoading).toBe(true)
    })

    it('sets isLoading to false after refresh attempt', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('Login', () => {
    it('logs in successfully with valid credentials', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.login('test@example.com', 'password123')

      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('throws error when login fails', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))
      vi.spyOn(authApi, 'login').mockRejectedValue(new Error('Invalid credentials'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await expect(result.current.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('updates user state after successful login', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()

      await result.current.login('test@example.com', 'password123')

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })
    })
  })

  describe('Logout', () => {
    it('logs out successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await result.current.logout()

      expect(authApi.logout).toHaveBeenCalled()

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.isAuthenticated).toBe(false)
      })
    })

    it('clears user state even when logout API call fails', async () => {
      vi.spyOn(authApi, 'logout').mockRejectedValue(new Error('Logout failed'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await expect(result.current.logout()).rejects.toThrow('Logout failed')

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.isAuthenticated).toBe(false)
      })
    })

    it('throws error but still clears user state', async () => {
      vi.spyOn(authApi, 'logout').mockRejectedValue(new Error('Server error'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      try {
        await result.current.logout()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })
    })
  })

  describe('isAuthenticated', () => {
    it('returns true when user is set', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('returns false when user is null', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })
    })
  })

  describe('useAuth hook', () => {
    it('throws error when used outside of AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleError.mockRestore()
    })

    it('provides all required properties', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isAuthenticated')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('logout')
    })

    it('login is a function', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.login).toBe('function')
    })

    it('logout is a function', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(typeof result.current.logout).toBe('function')
    })
  })

  describe('AuthProvider component', () => {
    it('renders children', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      render(
        <AuthProvider>
          <div>Test Children</div>
        </AuthProvider>
      )

      expect(screen.getByText('Test Children')).toBeInTheDocument()
    })

    it('provides context value to children', async () => {
      let contextValue: ReturnType<typeof useAuth> | null = null

      function TestComponent() {
        contextValue = useAuth()
        return <div>Test</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(contextValue).not.toBeNull()
      })

      expect(contextValue!.user).toEqual(mockUser)
      expect(contextValue!.isAuthenticated).toBe(true)
    })
  })

  describe('Integration scenarios', () => {
    it('handles complete authentication lifecycle and session management', async () => {
      // Test 1: Session restoration on mount (successful)
      const { result, unmount } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
      expect(authApi.refreshToken).toHaveBeenCalled()

      unmount()

      // Test 2: Failed session restoration
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Token expired'))

      const { result: result2, unmount: unmount2 } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })

      expect(result2.current.isAuthenticated).toBe(false)
      expect(result2.current.user).toBeNull()

      unmount2()

      // Test 3: Full authentication flow (unauthenticated → login → logout)
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      const { result: result3 } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result3.current.isLoading).toBe(false)
      })

      expect(result3.current.isAuthenticated).toBe(false)

      // Login
      await result3.current.login('test@example.com', 'password')

      await waitFor(() => {
        expect(result3.current.isAuthenticated).toBe(true)
      })

      expect(result3.current.user).toEqual(mockUser)

      // Logout
      await result3.current.logout()

      await waitFor(() => {
        expect(result3.current.isAuthenticated).toBe(false)
      })

      expect(result3.current.user).toBeNull()
    })
  })
})
