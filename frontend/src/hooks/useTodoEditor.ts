import { useState, useCallback } from 'react'
import type { Todo } from '@/types/todo'

/**
 * Hook for managing todo edit state
 * Responsible for tracking which todo is being edited
 */
export function useTodoEditor() {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  const startEditing = useCallback((todo: Todo) => {
    setEditingTodo(todo)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingTodo(null)
  }, [])

  return {
    editingTodo,
    isEditing: editingTodo !== null,
    startEditing,
    cancelEditing,
  }
}
