/**
 * Password change request payload
 */
export interface PasswordChangeRequest {
  current_password: string
  new_password: string
}

/**
 * Password change response
 */
export interface PasswordChangeResponse {
  message: string
}
