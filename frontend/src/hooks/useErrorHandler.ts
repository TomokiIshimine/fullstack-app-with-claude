import { useState, useCallback } from 'react'
import { ApiError } from '@/lib/api/client'
import { logger } from '@/lib/logger'

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((err: unknown, context?: string) => {
    let message: string

    if (err instanceof ApiError) {
      message = err.message
    } else if (err instanceof Error) {
      message = err.message
    } else {
      message = 'エラーが発生しました'
    }

    setError(message)
    logger.error(context || 'Error occurred', err as Error)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, clearError }
}
