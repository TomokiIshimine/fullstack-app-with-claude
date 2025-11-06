/**
 * User DTO (Data Transfer Object) - API response format
 */
export interface UserDto {
  id: number
  email: string
  role: string
  name: string | null
}

/**
 * User domain model - Frontend representation
 */
export interface User {
  id: number
  email: string
  role: string
  name: string | null
}

/**
 * Login request payload
 */
export interface LoginPayload {
  email: string
  password: string
}

/**
 * Login response
 */
export interface LoginResponse {
  user: UserDto
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  message: string
}

/**
 * Logout response
 */
export interface LogoutResponse {
  message: string
}
