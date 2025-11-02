import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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

/**
 * Route configuration for renderWithRouter and renderWithAuthAndRouter
 */
interface RouteConfig {
  path: string
  element: ReactElement
}

/**
 * Options for rendering with router
 */
interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial entries for MemoryRouter (navigation history)
   * @default ['/']
   */
  initialEntries?: string[]
  /**
   * Route configuration. If not provided, renders the UI directly.
   */
  routes?: RouteConfig[]
}

/**
 * Custom render function that wraps component with MemoryRouter
 *
 * @example
 * // Render with single route
 * renderWithRouter(<MyComponent />, {
 *   initialEntries: ['/todos']
 * })
 *
 * @example
 * // Render with multiple routes
 * renderWithRouter(<Navigate to="/login" />, {
 *   initialEntries: ['/'],
 *   routes: [
 *     { path: '/', element: <Home /> },
 *     { path: '/login', element: <Login /> }
 *   ]
 * })
 */
export function renderWithRouter(ui: ReactElement, options: RenderWithRouterOptions = {}) {
  const { initialEntries = ['/'], routes, ...renderOptions } = options

  function Wrapper({ children }: { children: ReactNode }) {
    if (routes) {
      return (
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            {routes.map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
          </Routes>
        </MemoryRouter>
      )
    }

    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Options for rendering with both auth and router
 */
interface RenderWithAuthAndRouterOptions extends Omit<RenderOptions, 'wrapper'> {
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
  /**
   * Initial entries for MemoryRouter (navigation history)
   * @default ['/']
   */
  initialEntries?: string[]
  /**
   * Route configuration. If not provided, renders the UI directly.
   */
  routes?: RouteConfig[]
}

/**
 * Custom render function that wraps component with both AuthProvider and MemoryRouter
 *
 * @example
 * // Render protected route with authenticated user
 * renderWithAuthAndRouter(
 *   <ProtectedRoute>
 *     <TodoListPage />
 *   </ProtectedRoute>,
 *   {
 *     initialUser: createMockUser(),
 *     initialEntries: ['/todos']
 *   }
 * )
 *
 * @example
 * // Test navigation with routes
 * renderWithAuthAndRouter(<App />, {
 *   initialUser: null,
 *   initialEntries: ['/'],
 *   routes: [
 *     { path: '/', element: <ProtectedRoute><Home /></ProtectedRoute> },
 *     { path: '/login', element: <Login /> }
 *   ]
 * })
 */
export function renderWithAuthAndRouter(
  ui: ReactElement,
  options: RenderWithAuthAndRouterOptions = {}
) {
  const {
    initialUser,
    mockRefreshToken = true,
    initialEntries = ['/'],
    routes,
    ...renderOptions
  } = options

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
    if (routes) {
      return (
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>
            <Routes>
              {routes.map((route, index) => (
                <Route key={index} path={route.path} element={route.element} />
              ))}
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      )
    }

    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
