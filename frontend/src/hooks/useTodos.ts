import { useCallback } from 'react'

import type { Todo, TodoPayload, TodoStatus, TodoUpdatePayload, SortOrder } from '@/types/todo'
import { ApiError } from '@/lib/api/todos'
import { useTodoData } from './useTodoData'
import { useTodoFilters } from './useTodoFilters'
import { useTodoMutations } from './useTodoMutations'
import { useTodoEditor } from './useTodoEditor'

export interface UseTodosResult {
  todos: Todo[]
  totalCount: number
  activeCount: number
  completedCount: number
  status: TodoStatus
  sortOrder: SortOrder
  isLoading: boolean
  error: string | null
  editingTodo: Todo | null
  refresh: () => Promise<void>
  clearError: () => void
  setStatus: (status: TodoStatus) => void
  toggleSortOrder: () => void
  startEditing: (todo: Todo) => void
  cancelEditing: () => void
  submitTodo: (payload: TodoPayload | TodoUpdatePayload) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
  toggleTodoCompletion: (id: number, isCompleted: boolean) => Promise<void>
}

/**
 * Main hook for managing todos
 * Composes multiple smaller hooks for better separation of concerns
 */
export function useTodos(): UseTodosResult {
  // Data fetching
  const { todos, isLoading, error, reload, clearError, setError } = useTodoData()

  // Filtering and sorting
  const { status, sortOrder, filteredTodos, counts, setStatus, toggleSortOrder } =
    useTodoFilters(todos)

  // Edit state
  const { editingTodo, startEditing, cancelEditing } = useTodoEditor()

  // CRUD operations
  const mutations = useTodoMutations(reload)

  // Unified submit handler (create or update based on edit state)
  const submitTodo = useCallback(
    async (payload: TodoPayload | TodoUpdatePayload) => {
      clearError()
      try {
        if (editingTodo) {
          await mutations.updateTodo(editingTodo.id, payload as TodoUpdatePayload)
          cancelEditing()
        } else {
          await mutations.createTodo(payload as TodoPayload)
        }
      } catch (err) {
        const message = extractErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [editingTodo, mutations, cancelEditing, clearError, setError]
  )

  // Delete handler with edit state cleanup
  const deleteTodoHandler = useCallback(
    async (id: number) => {
      clearError()
      try {
        if (editingTodo?.id === id) {
          cancelEditing()
        }
        await mutations.deleteTodo(id)
      } catch (err) {
        const message = extractErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [editingTodo, mutations, cancelEditing, clearError, setError]
  )

  // Toggle completion handler with error handling
  const toggleTodoCompletionHandler = useCallback(
    async (id: number, isCompleted: boolean) => {
      clearError()
      try {
        await mutations.toggleTodo(id, isCompleted)
      } catch (err) {
        const message = extractErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [mutations, clearError, setError]
  )

  return {
    // Data
    todos: filteredTodos,
    totalCount: counts.total,
    activeCount: counts.active,
    completedCount: counts.completed,
    isLoading,
    error,

    // Filter & Sort
    status,
    sortOrder,
    setStatus,
    toggleSortOrder,

    // Edit state
    editingTodo,
    startEditing,
    cancelEditing,

    // CRUD operations
    submitTodo,
    deleteTodo: deleteTodoHandler,
    toggleTodoCompletion: toggleTodoCompletionHandler,

    // Other
    refresh: reload,
    clearError,
  }
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error occurred'
}
