import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { RoleBasedRedirect } from './RoleBasedRedirect'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/types/auth'

// Mock the useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock components for routes
const AdminUsersPage = () => <div>Admin Users Page</div>
const SettingsPage = () => <div>Settings Page</div>
const LoginPage = () => <div>Login Page</div>

describe('RoleBasedRedirect', () => {
  const renderWithRouter = (isAuthenticated: boolean, isLoading: boolean, user: User | null) => {
    const mockLogin = vi.fn()
    const mockLogout = vi.fn()

    // Mock useAuth hook return value
    vi.mocked(useAuth).mockReturnValue({
      user,
      isAuthenticated,
      isLoading,
      login: mockLogin,
      logout: mockLogout,
    })

    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  describe('Loading State', () => {
    it('should show loading spinner while checking authentication', () => {
      renderWithRouter(false, true, null)

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    })

    it('should not redirect while loading', () => {
      renderWithRouter(false, true, null)

      expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings Page')).not.toBeInTheDocument()
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    })
  })

  describe('Unauthenticated State', () => {
    it('should redirect to login when not authenticated', () => {
      renderWithRouter(false, false, null)

      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    it('should not show loading spinner after redirect', () => {
      renderWithRouter(false, false, null)

      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })
  })

  describe('Admin User Redirect', () => {
    const adminUser: User = {
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
      name: 'Admin User',
    }

    it('should redirect to /admin/users for admin users', () => {
      renderWithRouter(true, false, adminUser)

      expect(screen.getByText('Admin Users Page')).toBeInTheDocument()
    })

    it('should not redirect to /todos for admin users', () => {
      renderWithRouter(true, false, adminUser)

      expect(screen.queryByText('Settings Page')).not.toBeInTheDocument()
    })

    it('should not show loading spinner for admin users', () => {
      renderWithRouter(true, false, adminUser)

      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })
  })

  describe('Regular User Redirect', () => {
    const regularUser: User = {
      id: 2,
      email: 'user@example.com',
      role: 'user',
      name: 'Regular User',
    }

    it('should redirect to /settings for regular users', () => {
      renderWithRouter(true, false, regularUser)

      expect(screen.getByText('Settings Page')).toBeInTheDocument()
    })

    it('should not redirect to /admin/users for regular users', () => {
      renderWithRouter(true, false, regularUser)

      expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument()
    })

    it('should not show loading spinner for regular users', () => {
      renderWithRouter(true, false, regularUser)

      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()
    })
  })

  describe('State Transitions', () => {
    it('should transition from loading to authenticated admin', () => {
      const adminUser: User = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User',
      }

      // Initial state: loading
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
      })

      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()

      // Update to authenticated admin state
      vi.mocked(useAuth).mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      })

      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Admin Users Page')).toBeInTheDocument()
    })

    it('should transition from loading to unauthenticated', () => {
      // Initial state: loading
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
      })

      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()

      // Update to unauthenticated state
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
      })

      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null user with isAuthenticated true (should not happen)', () => {
      // This is an edge case that should not happen in practice
      renderWithRouter(true, false, null)

      // Should redirect to /settings as fallback
      expect(screen.getByText('Settings Page')).toBeInTheDocument()
    })

    it('should handle user without role field', () => {
      const userWithoutRole = {
        id: 3,
        email: 'noRole@example.com',
        role: undefined as unknown as 'admin' | 'user',
        name: 'No Role User',
      }

      renderWithRouter(true, false, userWithoutRole)

      // Should redirect to /settings as fallback
      expect(screen.getByText('Settings Page')).toBeInTheDocument()
    })
  })

  describe('CSS Classes', () => {
    it('should apply correct loading container classes', () => {
      const { container } = renderWithRouter(false, true, null)

      expect(container.querySelector('.loading-container')).toBeInTheDocument()
      expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
    })
  })
})
