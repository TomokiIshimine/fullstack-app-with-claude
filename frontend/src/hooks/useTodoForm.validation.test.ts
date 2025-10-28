import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodoForm } from './useTodoForm'
import { TODO_ERROR_MESSAGES } from '@/constants/todo'

describe('useTodoForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    mockOnSubmit.mockResolvedValue(undefined)
  })
  describe('Form Validation', () => {
    it('validates title is required', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('validates title is required after trimming', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('   ')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('validates title max length', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('a'.repeat(121))
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.title).toBe(TODO_ERROR_MESSAGES.TITLE_TOO_LONG)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('validates detail max length', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDetail('a'.repeat(1001))
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.detail).toBe(TODO_ERROR_MESSAGES.DETAIL_TOO_LONG)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('validates due date format', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDueDate('invalid-date')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.dueDate).toBe(TODO_ERROR_MESSAGES.DUE_DATE_INVALID_FORMAT)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('shows multiple validation errors', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('')
        result.current.setDetail('a'.repeat(1001))
        result.current.setDueDate('invalid')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)
      expect(result.current.fieldErrors.detail).toBe(TODO_ERROR_MESSAGES.DETAIL_TOO_LONG)
      expect(result.current.fieldErrors.dueDate).toBe(TODO_ERROR_MESSAGES.DUE_DATE_INVALID_FORMAT)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })
})
