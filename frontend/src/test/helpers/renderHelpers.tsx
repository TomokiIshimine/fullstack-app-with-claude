import { render, type RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import type { User } from '@/types/auth'
import * as authApi from '@/lib/api/auth'
import { vi } from 'vitest'

// Re-export everything from Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

/**
 * Options for rendering with providers
 */
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial authenticated user. If null, user is not authenticated.
   * If undefined, authentication status will be determined by refreshToken API call.
   */
  initialUser?: User | null
  /**
   * Whether to mock the refreshToken API call
   * @default true
   */
  mockRefreshToken?: boolean
}

/**
 * Custom render function that wraps component with AuthProvider
 *
 * @example
 * // Render with authenticated user
 * renderWithProviders(<MyComponent />, {
 *   initialUser: createMockUser()
 * })
 *
 * @example
 * // Render with unauthenticated user
 * renderWithProviders(<MyComponent />, {
 *   initialUser: null
 * })
 */
export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { initialUser, mockRefreshToken = true, ...renderOptions } = options

  // Mock refreshToken API call if needed
  if (mockRefreshToken) {
    const refreshTokenSpy = vi.spyOn(authApi, 'refreshToken')

    if (initialUser === null) {
      // User is not authenticated
      refreshTokenSpy.mockRejectedValue(new Error('Not authenticated'))
    } else if (initialUser !== undefined) {
      // User is authenticated with provided user
      refreshTokenSpy.mockResolvedValue(initialUser)
    }
    // If initialUser is undefined, let the actual API call happen
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Wait for async updates to complete
 * Useful when testing components that have useEffect hooks
 */
export async function waitForLoadingToFinish() {
  // Wait for a short time to allow async operations to complete
  await new Promise(resolve => setTimeout(resolve, 0))
}
