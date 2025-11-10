import { useCallback } from 'react'
import {
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  type TodoPayload,
  type TodoUpdatePayload,
} from '@/lib/api/todos'

/**
 * Hook for todo CRUD operations
 * Responsible for create, update, delete, and toggle operations
 * Accepts optional onSuccess callback for side effects (e.g., reload data)
 */
export function useTodoMutations(onSuccess?: () => Promise<void>) {
  const handleCreate = useCallback(
    async (payload: TodoPayload) => {
      await createTodo(payload)
      await onSuccess?.()
    },
    [onSuccess]
  )

  const handleUpdate = useCallback(
    async (id: number, payload: TodoUpdatePayload) => {
      await updateTodo(id, payload)
      await onSuccess?.()
    },
    [onSuccess]
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteTodo(id)
      await onSuccess?.()
    },
    [onSuccess]
  )

  const handleToggle = useCallback(
    async (id: number, isCompleted: boolean) => {
      await toggleTodo(id, isCompleted)
      await onSuccess?.()
    },
    [onSuccess]
  )

  return {
    createTodo: handleCreate,
    updateTodo: handleUpdate,
    deleteTodo: handleDelete,
    toggleTodo: handleToggle,
  }
}
