import type { User } from '@/types/auth'
import type { UserUpdateRequest, UserUpdateResponse } from '@/types/user'
import { fetchWithLogging, buildJsonHeaders, parseJson, buildApiError } from './client'

const API_BASE_URL = '/api/users/me'

/**
 * Update current user's profile information
 */
export async function updateProfile(payload: UserUpdateRequest): Promise<User> {
  const response = await fetchWithLogging(API_BASE_URL, {
    method: 'PATCH',
    headers: buildJsonHeaders(),
    body: JSON.stringify(payload),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  const data = json as UserUpdateResponse
  return {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
    name: data.user.name,
  }
}
