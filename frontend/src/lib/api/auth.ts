import type { LoginPayload, LoginResponse, User, UserDto } from '@/types/auth'
import { fetchWithLogging, buildJsonHeaders, parseJson, buildApiError } from './client'

const API_BASE_URL = '/api/auth'

/**
 * Login with email and password
 */
export async function login(payload: LoginPayload): Promise<User> {
  const response = await fetchWithLogging(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: buildJsonHeaders(),
    body: JSON.stringify(payload),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  const loginResponse = json as LoginResponse
  return mapUserDto(loginResponse.user)
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  const response = await fetchWithLogging(`${API_BASE_URL}/logout`, {
    method: 'POST',
  })
  if (!response.ok) {
    const json = await parseJson(response)
    throw buildApiError(response, json)
  }
}

/**
 * Refresh access token using refresh token from cookies
 */
export async function refreshToken(): Promise<User> {
  const response = await fetchWithLogging(`${API_BASE_URL}/refresh`, {
    method: 'POST',
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  const refreshResponse = json as { message: string; user: UserDto }
  return mapUserDto(refreshResponse.user)
}

function mapUserDto(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    role: dto.role,
    name: dto.name,
  }
}
