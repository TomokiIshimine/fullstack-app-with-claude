import type { Todo, TodoDto } from '@/types/todo'
import type { User, UserDto } from '@/types/auth'

/**
 * Factory function to create mock Todo objects
 */
export function createMockTodo(overrides?: Partial<Todo>): Todo {
  return {
    id: 1,
    title: 'Test Todo',
    detail: null,
    dueDate: null,
    isCompleted: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z',
    ...overrides,
  }
}

/**
 * Factory function to create mock TodoDto objects (backend format)
 */
export function createMockTodoDto(overrides?: Partial<TodoDto>): TodoDto {
  return {
    id: 1,
    title: 'Test Todo',
    detail: null,
    due_date: null,
    is_completed: false,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    ...overrides,
  }
}

/**
 * Factory function to create mock User objects
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    email: 'test@example.com',
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
    ...overrides,
  }
}

/**
 * Create an array of mock todos with sequential IDs
 */
export function createMockTodos(count: number, overrides?: Partial<Todo>): Todo[] {
  return Array.from({ length: count }, (_, index) =>
    createMockTodo({
      id: index + 1,
      title: `Test Todo ${index + 1}`,
      ...overrides,
    })
  )
}

/**
 * Create an array of mock TodoDtos with sequential IDs
 */
export function createMockTodoDtos(count: number, overrides?: Partial<TodoDto>): TodoDto[] {
  return Array.from({ length: count }, (_, index) =>
    createMockTodoDto({
      id: index + 1,
      title: `Test Todo ${index + 1}`,
      ...overrides,
    })
  )
}
