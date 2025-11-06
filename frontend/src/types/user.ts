/**
 * User management types
 */

/**
 * User response from API
 */
export interface UserResponse {
  id: number
  email: string
  role: string
  name: string | null
  created_at: string
}

/**
 * User create request payload
 */
export interface UserCreateRequest {
  email: string
  name: string
}

/**
 * User create response
 */
export interface UserCreateResponse {
  user: UserResponse
  initial_password: string
}

/**
 * User list response
 */
export interface UserListResponse {
  users: UserResponse[]
}
