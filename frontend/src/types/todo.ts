/**
 * Todo status filter type
 */
export type TodoStatus = 'all' | 'active' | 'completed'

/**
 * Sort order type
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Todo DTO (Data Transfer Object) - API response format
 */
export interface TodoDto {
  id: number
  title: string
  detail: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

/**
 * Todo domain model - Frontend representation
 */
export interface Todo {
  id: number
  title: string
  detail: string | null
  dueDate: string | null
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Todo creation payload
 */
export interface TodoPayload {
  title: string
  detail?: string | null
  dueDate?: string | null
}

/**
 * Todo update payload
 */
export interface TodoUpdatePayload {
  title?: string
  detail?: string | null
  dueDate?: string | null
}
