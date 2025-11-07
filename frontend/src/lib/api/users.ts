import type {
  UserResponse,
  UserListResponse,
  UserCreateRequest,
  UserCreateResponse,
} from '@/types/user'
import { fetchWithLogging, buildJsonHeaders, parseJson, buildApiError } from './client'

const API_BASE_URL = '/api/users'

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
