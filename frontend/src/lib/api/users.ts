import type {
  UserResponse,
  UserListResponse,
  UserCreateRequest,
  UserCreateResponse,
} from '@/types/user'
import { logger } from '@/lib/logger'
import { ApiError } from './todos'

const API_BASE_URL = '/api/users'

/**
 * Wrapper for fetch with automatic logging, timing, and credentials
 */
async function fetchWithLogging(url: string, options?: RequestInit): Promise<Response> {
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
 * Fetch all users (Admin only)
 */
export async function fetchUsers(): Promise<UserResponse[]> {
  const response = await fetchWithLogging(API_BASE_URL, {
    method: 'GET',
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  const listResponse = json as UserListResponse
  return listResponse.users
}

/**
 * Create a new user (Admin only)
 */
export async function createUser(payload: UserCreateRequest): Promise<UserCreateResponse> {
  const response = await fetchWithLogging(API_BASE_URL, {
    method: 'POST',
    headers: buildJsonHeaders(),
    body: JSON.stringify(payload),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  return json as UserCreateResponse
}

/**
 * Delete a user (Admin only)
 */
export async function deleteUser(userId: number): Promise<void> {
  const response = await fetchWithLogging(`${API_BASE_URL}/${userId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await parseJson(response)
    throw buildApiError(response, json)
  }
}

function buildJsonHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function parseJson(response: Response): Promise<unknown> {
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

function buildApiError(response: Response, json: unknown): ApiError {
  if (isErrorResponse(json)) {
    return new ApiError(response.status, json.error ?? 'Request failed', json)
  }
  return new ApiError(response.status, response.statusText || 'Request failed', json)
}

function isErrorResponse(json: unknown): json is { error: string } {
  return Boolean(json && typeof json === 'object' && 'error' in (json as Record<string, unknown>))
}
