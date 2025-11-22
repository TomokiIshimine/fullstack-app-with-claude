/**
 * Get the default path for a user based on their role
 * - Admin users are redirected to /admin/users
 * - Regular users are redirected to /settings
 *
 * @param role - User role ('admin' or 'user')
 * @returns The default path for the user role
 */
export const getDefaultPathForRole = (role: string | undefined): string => {
  if (role === 'admin') {
    return '/admin/users'
  }
  return '/settings'
}

/**
 * Get the home path for a user based on their role
 * - Admin users go to /admin/users
 * - Regular users go to / (root)
 *
 * @param role - User role ('admin' or 'user')
 * @returns The home path for the user role
 */
export const getHomePathForRole = (role: string | undefined): string => {
  if (role === 'admin') {
    return '/admin/users'
  }
  return '/'
}
