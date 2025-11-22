import { logger } from '@/lib/logger'
/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
    this.name = 'ApiError'
  }
}

/**
 * Wrapper for fetch with automatic logging, timing, and credentials
 */
export async function fetchWithLogging(url: string, options?: RequestInit): Promise<Response> {
  const method = options?.method || 'GET'
  const startTime = performance.now()

  logger.logApiRequest(method, url)

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Always include cookies for authentication
    })
    const duration = performance.now() - startTime

    logger.logApiResponse(method, url, response.status, duration)

    return response
  } catch (error) {
    const duration = performance.now() - startTime
    logger.logApiError(method, url, error, { duration })
    throw error
  }
}

/**
 * Build standard JSON headers for API requests
 */
export function buildJsonHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

/**
 * Parse JSON response, returning null for empty responses
 */
export async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Build ApiError from response and parsed JSON
 * Supports both error formats:
 * - { error: string }
 * - { error: { message: string } }
 */
export function buildApiError(response: Response, json: unknown): ApiError {
  if (isErrorResponseWithMessage(json)) {
    return new ApiError(response.status, json.error.message ?? 'Request failed', json)
  }
  if (isErrorResponse(json)) {
    return new ApiError(response.status, json.error ?? 'Request failed', json)
  }
  return new ApiError(response.status, response.statusText || 'Request failed', json)
}

/**
 * Type guard to check if response is an error response with string error
 */
export function isErrorResponse(json: unknown): json is { error: string } {
  return Boolean(
    json &&
      typeof json === 'object' &&
      'error' in (json as Record<string, unknown>) &&
      typeof (json as { error: unknown }).error === 'string'
  )
}

/**
 * Type guard to check if response is an error response with message object
 */
function isErrorResponseWithMessage(json: unknown): json is { error: { message?: string } } {
  return Boolean(
    json &&
      typeof json === 'object' &&
      'error' in (json as Record<string, unknown>) &&
      typeof (json as { error: unknown }).error === 'object' &&
      (json as { error: unknown }).error !== null
  )
}
