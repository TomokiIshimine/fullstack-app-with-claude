import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTodoForm } from './useTodoForm'
import { createMockTodo } from '@/test/helpers/mockData'
import { TODO_ERROR_MESSAGES } from '@/constants/todo'

// Helper function to get a future date in YYYY-MM-DD format
function getFutureDate(daysFromNow: number = 1): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

describe('useTodoForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    mockOnSubmit.mockResolvedValue(undefined)
  })
  describe('Form Submission', () => {
    it('submits valid form successfully', async () => {
      const futureDate = getFutureDate(7)
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDetail('Valid Detail')
        result.current.setDueDate(futureDate)
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Valid Title',
        detail: 'Valid Detail',
        dueDate: futureDate,
      })
      expect(result.current.fieldErrors).toEqual({})
    })

    it('trims whitespace before submitting', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('  Valid Title  ')
        result.current.setDetail('  Valid Detail  ')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Valid Title',
        detail: 'Valid Detail',
        dueDate: null,
      })
    })

    it('converts empty detail to null', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDetail('')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Valid Title',
        detail: null,
        dueDate: null,
      })
    })

    it('converts empty dueDate to null', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDueDate('')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Valid Title',
        detail: null,
        dueDate: null,
      })
    })

    it('resets form after successful submission in create mode', async () => {
      const futureDate = getFutureDate(7)
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDetail('Valid Detail')
        result.current.setDueDate(futureDate)
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      await waitFor(() => {
        expect(result.current.title).toBe('')
        expect(result.current.detail).toBe('')
        expect(result.current.dueDate).toBe('')
      })
    })

    it('does not reset form after successful submission in edit mode', async () => {
      const mockTodo = createMockTodo({
        title: 'Original Title',
      })

      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: mockTodo,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Updated Title')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      await waitFor(() => {
        expect(result.current.title).toBe('Updated Title')
      })
    })

    it('sets isSubmitting during submission', async () => {
      let resolveSubmit: () => void
      const delayedSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>(resolve => {
            resolveSubmit = resolve
          })
      )

      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: delayedSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
      })

      act(() => {
        result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true)
      })

      act(() => {
        resolveSubmit!()
      })

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false)
      })
    })

    it('handles submission error', async () => {
      const errorMessage = 'Failed to submit'
      mockOnSubmit.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      await waitFor(() => {
        expect(result.current.submitError).toBe(errorMessage)
      })
    })

    it('handles non-Error submission error', async () => {
      mockOnSubmit.mockRejectedValue('String error')

      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      await waitFor(() => {
        expect(result.current.submitError).toBe('送信に失敗しました')
      })
    })

    it('clears previous errors on new submission', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      // First submission with validation error
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)

      // Second submission with valid data
      act(() => {
        result.current.setTitle('Valid Title')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      await waitFor(() => {
        expect(result.current.fieldErrors).toEqual({})
        expect(result.current.submitError).toBeNull()
      })
    })
  })
})
