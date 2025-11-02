import { useEffect, useMemo, useState } from 'react'

import type { Todo } from '@/types/todo'
import { validateTodoForm, type TodoFieldErrors } from '@/lib/validation/todoValidation'

export interface UseTodoFormOptions {
  editingTodo: Todo | null
  onSubmit: (payload: {
    title: string
    detail: string | null
    dueDate: string | null
  }) => Promise<void>
}

export interface UseTodoFormResult {
  title: string
  detail: string
  dueDate: string
  fieldErrors: TodoFieldErrors
  submitError: string | null
  isSubmitting: boolean
  submitLabel: string
  setTitle: (value: string) => void
  setDetail: (value: string) => void
  setDueDate: (value: string) => void
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}

/**
 * Custom hook for todo form state management and validation
 */
export function useTodoForm({ editingTodo, onSubmit }: UseTodoFormOptions): UseTodoFormResult {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<TodoFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when editingTodo changes
  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title)
      setDetail(editingTodo.detail ?? '')
      setDueDate(editingTodo.dueDate ?? '')
    } else {
      setTitle('')
      setDetail('')
      setDueDate('')
    }
    setFieldErrors({})
    setSubmitError(null)
  }, [editingTodo])

  const submitLabel = useMemo(() => (editingTodo ? '更新' : '追加'), [editingTodo])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    // Validate form
    const errors = validateTodoForm({ title, detail, dueDate })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Clear errors and submit
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        detail: detail.trim() ? detail.trim() : null,
        dueDate: dueDate || null,
      })

      // Reset form only if creating new todo
      if (!editingTodo) {
        setTitle('')
        setDetail('')
        setDueDate('')
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    title,
    detail,
    dueDate,
    fieldErrors,
    submitError,
    isSubmitting,
    submitLabel,
    setTitle,
    setDetail,
    setDueDate,
    handleSubmit,
  }
}
