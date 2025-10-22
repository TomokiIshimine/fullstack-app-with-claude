import { useCallback, useEffect, useMemo, useState } from 'react'

import { ApiError, createTodo, deleteTodo, getTodos, toggleTodo, updateTodo } from '@/lib/api/todos'
import type { Todo, TodoPayload, TodoStatus, TodoUpdatePayload } from '@/lib/api/todos'

export type SortOrder = 'asc' | 'desc'

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

export function useTodos(): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([])
  const [status, setStatusState] = useState<TodoStatus>('active')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  const loadTodos = useCallback(async () => {
    setIsLoading(true)
    try {
      const items = await getTodos('all')
      setTodos(items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTodos()
  }, [loadTodos])

  const refresh = useCallback(async () => {
    setError(null)
    await loadTodos()
  }, [loadTodos])

  const filteredTodos = useMemo(() => {
    const subset = filterByStatus(todos, status)
    return sortTodos(subset, sortOrder)
  }, [todos, status, sortOrder])

  const totalCount = todos.length
  const activeCount = useMemo(() => filterByStatus(todos, 'active').length, [todos])
  const completedCount = useMemo(() => filterByStatus(todos, 'completed').length, [todos])

  const submitTodo = useCallback(
    async (payload: TodoPayload | TodoUpdatePayload) => {
      setError(null)
      try {
        if (editingTodo) {
          await updateTodo(editingTodo.id, payload as TodoUpdatePayload)
        } else {
          await createTodo(payload as TodoPayload)
        }
        await loadTodos()
        setEditingTodo(null)
      } catch (err) {
        const message = getErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [editingTodo, loadTodos]
  )

  const deleteTodoHandler = useCallback(
    async (id: number) => {
      setError(null)
      try {
        await deleteTodo(id)
        if (editingTodo?.id === id) {
          setEditingTodo(null)
        }
        await loadTodos()
      } catch (err) {
        const message = getErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [editingTodo, loadTodos]
  )

  const toggleTodoCompletionHandler = useCallback(
    async (id: number, isCompleted: boolean) => {
      setError(null)
      try {
        await toggleTodo(id, isCompleted)
        await loadTodos()
      } catch (err) {
        const message = getErrorMessage(err)
        setError(message)
        throw err
      }
    },
    [loadTodos]
  )

  const clearError = useCallback(() => setError(null), [])

  const changeStatus = useCallback((next: TodoStatus) => setStatusState(next), [])

  const toggleSort = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  const startEditing = useCallback((todo: Todo) => {
    setEditingTodo(todo)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingTodo(null)
  }, [])

  return {
    todos: filteredTodos,
    totalCount,
    activeCount,
    completedCount,
    status,
    sortOrder,
    isLoading,
    error,
    editingTodo,
    refresh,
    clearError,
    setStatus: changeStatus,
    toggleSortOrder: toggleSort,
    startEditing,
    cancelEditing,
    submitTodo,
    deleteTodo: deleteTodoHandler,
    toggleTodoCompletion: toggleTodoCompletionHandler,
  }
}

function filterByStatus(todos: Todo[], status: TodoStatus): Todo[] {
  if (status === 'active') {
    return todos.filter(todo => !todo.isCompleted)
  }
  if (status === 'completed') {
    return todos.filter(todo => todo.isCompleted)
  }
  return todos
}

function sortTodos(todos: Todo[], sortOrder: SortOrder): Todo[] {
  const sorted = [...todos]
  sorted.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      if (a.dueDate === b.dueDate) {
        return a.createdAt.localeCompare(b.createdAt)
      }
      return sortOrder === 'asc'
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate)
    }
    if (a.dueDate && !b.dueDate) {
      return -1
    }
    if (!a.dueDate && b.dueDate) {
      return 1
    }
    return sortOrder === 'asc'
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt)
  })
  return sorted
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error occurred'
}
