import type { User, UserDto } from '@/types/auth'

/**
 * Factory function to create mock User objects
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    email: 'test@example.com',
    role: 'user',
    name: 'Test User',
    ...overrides,
  }
}

/**
 * Factory function to create mock UserDto objects (backend format)
 */
export function createMockUserDto(overrides?: Partial<UserDto>): UserDto {
  return {
    id: 1,
    email: 'test@example.com',
    role: 'user',
    name: 'Test User',
    ...overrides,
  }
}
