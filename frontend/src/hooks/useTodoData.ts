import { useState, useCallback, useEffect } from 'react'
import { getTodos, type Todo, ApiError } from '@/lib/api/todos'

/**
 * Hook for fetching and managing todo data
 * Responsible only for data retrieval and loading state
 */
export function useTodoData() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTodos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await getTodos('all')
      setTodos(items)
    } catch (err) {
      const message = extractErrorMessage(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTodos()
  }, [loadTodos])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    todos,
    isLoading,
    error,
    reload: loadTodos,
    clearError,
    setError,
    setTodos,
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
  return 'データ取得に失敗しました'
}
