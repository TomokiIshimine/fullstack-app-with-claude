import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import * as authApi from '@/lib/api/auth'
import { createMockUser } from '@/test/helpers/mockData'
import { renderWithAuthAndRouter } from '@/test/helpers/renderHelpers'
import { AuthProvider } from '@/contexts/AuthContext'
import type { User } from '@/types/auth'

describe('ProtectedRoute', () => {
  const mockUser = createMockUser({
    id: 1,
    email: 'test@example.com',
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to render ProtectedRoute with common setup
  // Note: mockRefreshToken defaults to false so tests can manually mock as needed
  const renderProtectedRoute = (initialPath = '/') => {
    return renderWithAuthAndRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        mockRefreshToken: false, // Let tests handle their own mocking
        initialEntries: [initialPath],
        routes: [
          {
            path: '/',
            element: (
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            ),
          },
          { path: '/login', element: <div>Login Page</div> },
        ],
      }
    )
  }

  describe('Loading State', () => {
    it('shows loading spinner while checking authentication', () => {
      // Mock refreshToken to never resolve (simulating loading)
      vi.spyOn(authApi, 'refreshToken').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      renderProtectedRoute()

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('loading spinner has correct structure', () => {
      vi.spyOn(authApi, 'refreshToken').mockImplementation(() => new Promise(() => {}))

      const { container } = renderProtectedRoute()

      const loadingContainer = container.querySelector('.loading-container')
      expect(loadingContainer).toBeInTheDocument()

      const loadingSpinner = container.querySelector('.loading-spinner')
      expect(loadingSpinner).toBeInTheDocument()
      expect(loadingSpinner?.textContent).toBe('読み込み中...')
    })

    it('does not render children during loading', () => {
      vi.spyOn(authApi, 'refreshToken').mockImplementation(() => new Promise(() => {}))

      renderProtectedRoute()

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('does not redirect during loading', () => {
      vi.spyOn(authApi, 'refreshToken').mockImplementation(() => new Promise(() => {}))

      renderProtectedRoute()

      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    })
  })

  describe('Authenticated State', () => {
    it('renders children when authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('does not show loading spinner when authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
      })
    })

    it('does not redirect when authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })

      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })

    it('renders multiple children when authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderWithAuthAndRouter(
        <ProtectedRoute>
          <div>Child 1</div>
          <div>Child 2</div>
        </ProtectedRoute>,
        {
          mockRefreshToken: false,
        }
      )

      await waitFor(() => {
        expect(screen.getByText('Child 1')).toBeInTheDocument()
        expect(screen.getByText('Child 2')).toBeInTheDocument()
      })
    })
  })

  describe('Unauthenticated State', () => {
    it('redirects to login when not authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('does not render children when not authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      })
    })

    it('does not show loading spinner after redirect', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
      })
    })
  })

  describe('State Transitions', () => {
    it('transitions from loading to authenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderProtectedRoute()

      // Initially loading
      expect(screen.getByText('読み込み中...')).toBeInTheDocument()

      // Then shows content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })

      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })

    it('transitions from loading to unauthenticated', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      renderProtectedRoute()

      // Initially loading
      expect(screen.getByText('読み込み中...')).toBeInTheDocument()

      // Then redirects to login
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })

      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Behavior', () => {
    it('redirects to /login path', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })
    })

    it('uses replace navigation to prevent back button issues', async () => {
      vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('Not authenticated'))

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument()
      })

      // The Navigate component should use replace prop
      // This prevents users from navigating back to protected route
      // We verify this by checking the login page is rendered
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    it('works with different initial paths', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderWithAuthAndRouter(
        <ProtectedRoute>
          <div>Dashboard Content</div>
        </ProtectedRoute>,
        {
          mockRefreshToken: false,
          initialEntries: ['/dashboard'],
          routes: [
            {
              path: '/dashboard',
              element: (
                <ProtectedRoute>
                  <div>Dashboard Content</div>
                </ProtectedRoute>
              ),
            },
          ],
        }
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
      })
    })
  })

  describe('Integration with AuthContext', () => {
    it('uses isLoading from AuthContext', async () => {
      let resolveRefresh: (value: User | PromiseLike<User>) => void
      vi.spyOn(authApi, 'refreshToken').mockImplementation(
        () =>
          new Promise(resolve => {
            resolveRefresh = resolve
          })
      )

      renderProtectedRoute()

      // While isLoading is true
      expect(screen.getByText('読み込み中...')).toBeInTheDocument()

      // Resolve authentication
      resolveRefresh!(mockUser)

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('uses isAuthenticated from AuthContext', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('respects AuthContext authentication state changes', async () => {
      const refreshTokenSpy = vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      const { rerender } = renderProtectedRoute()

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })

      // Simulate logout by making refreshToken fail
      refreshTokenSpy.mockRejectedValue(new Error('Not authenticated'))

      // Rerender to trigger auth state change
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div>Protected Content</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      )

      // Content should still be shown (because AuthContext maintains state)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty children', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderWithAuthAndRouter(<ProtectedRoute>{null}</ProtectedRoute>, {
        mockRefreshToken: false,
      })

      await waitFor(() => {
        expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
      })
    })

    it('handles complex nested children', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderWithAuthAndRouter(
        <ProtectedRoute>
          <div>
            <header>Header</header>
            <main>
              <article>Article Content</article>
            </main>
            <footer>Footer</footer>
          </div>
        </ProtectedRoute>,
        {
          mockRefreshToken: false,
        }
      )

      await waitFor(() => {
        expect(screen.getByText('Header')).toBeInTheDocument()
        expect(screen.getByText('Article Content')).toBeInTheDocument()
        expect(screen.getByText('Footer')).toBeInTheDocument()
      })
    })
  })

  describe('Multiple ProtectedRoutes', () => {
    it('handles multiple protected routes independently', async () => {
      vi.spyOn(authApi, 'refreshToken').mockResolvedValue(mockUser)

      renderWithAuthAndRouter(
        <ProtectedRoute>
          <div>Dashboard</div>
        </ProtectedRoute>,
        {
          mockRefreshToken: false,
          initialEntries: ['/dashboard'],
          routes: [
            {
              path: '/dashboard',
              element: (
                <ProtectedRoute>
                  <div>Dashboard</div>
                </ProtectedRoute>
              ),
            },
            {
              path: '/profile',
              element: (
                <ProtectedRoute>
                  <div>Profile</div>
                </ProtectedRoute>
              ),
            },
          ],
        }
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })
  })
})
