import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTodoForm } from './useTodoForm'
import { createMockTodo } from '@/test/helpers/mockData'
import { TODO_ERROR_MESSAGES } from '@/constants/todo'

describe('useTodoForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Initial State', () => {
    it('initializes with empty form in create mode', () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.title).toBe('')
      expect(result.current.detail).toBe('')
      expect(result.current.dueDate).toBe('')
      expect(result.current.fieldErrors).toEqual({})
      expect(result.current.submitError).toBeNull()
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submitLabel).toBe('追加')
    })

    it('initializes with todo data in edit mode', () => {
      const mockTodo = createMockTodo({
        title: 'Test Todo',
        detail: 'Test detail',
        dueDate: '2024-06-20',
      })

      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: mockTodo,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.title).toBe('Test Todo')
      expect(result.current.detail).toBe('Test detail')
      expect(result.current.dueDate).toBe('2024-06-20')
      expect(result.current.submitLabel).toBe('更新')
    })

    it('handles null detail and dueDate in edit mode', () => {
      const mockTodo = createMockTodo({
        detail: null,
        dueDate: null,
      })

      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: mockTodo,
          onSubmit: mockOnSubmit,
        })
      )

      expect(result.current.detail).toBe('')
      expect(result.current.dueDate).toBe('')
    })
  })

  describe('Form Field Updates', () => {
    it('updates title field', () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('New Title')
      })

      expect(result.current.title).toBe('New Title')
    })

    it('updates detail field', () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setDetail('New Detail')
      })

      expect(result.current.detail).toBe('New Detail')
    })

    it('updates dueDate field', () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setDueDate('2024-06-20')
      })

      expect(result.current.dueDate).toBe('2024-06-20')
    })
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

  describe('Form Submission', () => {
    it('submits valid form successfully', async () => {
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDetail('Valid Detail')
        result.current.setDueDate('2024-06-20')
      })

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Valid Title',
        detail: 'Valid Detail',
        dueDate: '2024-06-20',
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
      const { result } = renderHook(() =>
        useTodoForm({
          editingTodo: null,
          onSubmit: mockOnSubmit,
        })
      )

      act(() => {
        result.current.setTitle('Valid Title')
        result.current.setDetail('Valid Detail')
        result.current.setDueDate('2024-06-20')
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

  describe('editingTodo Changes', () => {
    it('resets form when editingTodo changes to null', async () => {
      const mockTodo = createMockTodo({
        title: 'Original Title',
        detail: 'Original Detail',
        dueDate: '2024-06-20',
      })

      const { result, rerender } = renderHook(props => useTodoForm(props), {
        initialProps: {
          editingTodo: mockTodo,
          onSubmit: mockOnSubmit,
        },
      })

      expect(result.current.title).toBe('Original Title')

      rerender({
        editingTodo: null,
        onSubmit: mockOnSubmit,
      })

      await waitFor(() => {
        expect(result.current.title).toBe('')
        expect(result.current.detail).toBe('')
        expect(result.current.dueDate).toBe('')
      })
    })

    it('updates form when editingTodo changes to different todo', async () => {
      const firstTodo = createMockTodo({
        id: 1,
        title: 'First Title',
      })

      const secondTodo = createMockTodo({
        id: 2,
        title: 'Second Title',
      })

      const { result, rerender } = renderHook(props => useTodoForm(props), {
        initialProps: {
          editingTodo: firstTodo,
          onSubmit: mockOnSubmit,
        },
      })

      expect(result.current.title).toBe('First Title')

      rerender({
        editingTodo: secondTodo,
        onSubmit: mockOnSubmit,
      })

      await waitFor(() => {
        expect(result.current.title).toBe('Second Title')
      })
    })

    it('clears errors when editingTodo changes', async () => {
      const { result, rerender } = renderHook(props => useTodoForm(props), {
        initialProps: {
          editingTodo: null,
          onSubmit: mockOnSubmit,
        },
      })

      // Create validation error
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>)
      })

      expect(result.current.fieldErrors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)

      // Change to edit mode
      const mockTodo = createMockTodo({ title: 'Test' })
      rerender({
        editingTodo: mockTodo,
        onSubmit: mockOnSubmit,
      })

      await waitFor(() => {
        expect(result.current.fieldErrors).toEqual({})
        expect(result.current.submitError).toBeNull()
      })
    })
  })
})
