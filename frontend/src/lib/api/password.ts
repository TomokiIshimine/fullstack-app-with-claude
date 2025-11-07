import type { PasswordChangeRequest, PasswordChangeResponse } from '@/types/password'
import { fetchWithLogging, buildJsonHeaders, parseJson, buildApiError } from './client'

const API_BASE_URL = '/api/password/change'

/**
 * Change user password
 */
export async function changePassword(
  payload: PasswordChangeRequest
): Promise<PasswordChangeResponse> {
  const response = await fetchWithLogging(API_BASE_URL, {
    method: 'POST',
    headers: buildJsonHeaders(),
    body: JSON.stringify(payload),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  return json as PasswordChangeResponse
}
