import { useState, useMemo, useCallback } from 'react'
import { filterByStatus, sortTodos } from '@/lib/utils/todoFilters'
import type { Todo, TodoStatus, SortOrder } from '@/types/todo'

/**
 * Hook for managing todo filtering and sorting
 * Responsible for filter/sort state and applying transformations
 */
export function useTodoFilters(todos: Todo[]) {
  const [status, setStatus] = useState<TodoStatus>('active')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const filteredTodos = useMemo(() => {
    const filtered = filterByStatus(todos, status)
    return sortTodos(filtered, sortOrder)
  }, [todos, status, sortOrder])

  const counts = useMemo(
    () => ({
      total: todos.length,
      active: filterByStatus(todos, 'active').length,
      completed: filterByStatus(todos, 'completed').length,
    }),
    [todos]
  )

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  return {
    status,
    sortOrder,
    filteredTodos,
    counts,
    setStatus,
    toggleSortOrder,
  }
}
