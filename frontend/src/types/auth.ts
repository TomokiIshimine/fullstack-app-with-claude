/**
 * User DTO (Data Transfer Object) - API response format
 */
export interface UserDto {
  id: number
  email: string
}

/**
 * User domain model - Frontend representation
 */
export interface User {
  id: number
  email: string
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
