import { vi } from 'vitest'

/**
 * Options for creating a mock Response
 */
interface MockResponseOptions {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  ok?: boolean
}

/**
 * Create a mock Response object for fetch API
 *
 * @example
 * // Success response with JSON body
 * const response = createMockResponse({ items: [] }, { status: 200 })
 *
 * @example
 * // Error response
 * const response = createMockResponse(
 *   { error: { message: 'Not found' } },
 *   { status: 404, ok: false }
 * )
 */
export function createMockResponse<T = unknown>(
  body: T,
  options: MockResponseOptions = {}
): Response {
  const {
    status = 200,
    statusText = 'OK',
    headers = { 'Content-Type': 'application/json' },
    ok = status >= 200 && status < 300,
  } = options

  const jsonBody = typeof body === 'string' ? body : JSON.stringify(body)

  return {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    text: async () => jsonBody,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as Response
}

/**
 * Create a mock Response for empty response (e.g., DELETE)
 */
export function createMockEmptyResponse(options: MockResponseOptions = {}): Response {
  return createMockResponse('', options)
}

/**
 * Setup mock fetch that returns the given response
 *
 * @example
 * const mockFetch = setupMockFetch(createMockResponse({ items: [] }))
 * // ... perform test
 * expect(mockFetch).toHaveBeenCalledWith('/api/todos', expect.any(Object))
 */
export function setupMockFetch(response: Response): ReturnType<typeof vi.fn> {
  const mockFetch = vi.fn().mockResolvedValue(response)
  global.fetch = mockFetch as unknown as typeof fetch
  return mockFetch
}

/**
 * Setup mock fetch that returns different responses based on URL/method
 *
 * @example
 * setupMockFetchWithRoutes([
 *   { url: '/api/todos', method: 'GET', response: createMockResponse({ items: [] }) },
 *   { url: '/api/todos', method: 'POST', response: createMockResponse({ id: 1 }) },
 * ])
 */
export function setupMockFetchWithRoutes(
  routes: Array<{
    url: string | RegExp
    method?: string
    response: Response | ((url: string, options?: RequestInit) => Response)
  }>
): ReturnType<typeof vi.fn> {
  const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const method = options?.method || 'GET'

    for (const route of routes) {
      const urlMatches =
        typeof route.url === 'string' ? url.includes(route.url) : route.url.test(url)

      const methodMatches = !route.method || route.method === method

      if (urlMatches && methodMatches) {
        return Promise.resolve(
          typeof route.response === 'function' ? route.response(url, options) : route.response
        )
      }
    }

    // Return 404 if no route matches
    return Promise.resolve(
      createMockResponse({ error: { message: 'Not found' } }, { status: 404, ok: false })
    )
  })

  global.fetch = mockFetch as unknown as typeof fetch
  return mockFetch
}

/**
 * Restore original fetch implementation
 */
export function restoreFetch(originalFetch: typeof fetch) {
  global.fetch = originalFetch
}
