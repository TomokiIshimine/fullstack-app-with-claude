import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTodoForm, type UseTodoFormOptions } from './useTodoForm'
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

  describe('editingTodo Changes', () => {
    it('resets form when editingTodo changes to null', async () => {
      const mockTodo = createMockTodo({
        title: 'Original Title',
        detail: 'Original Detail',
        dueDate: '2024-06-20',
      })

      const { result, rerender } = renderHook((props: UseTodoFormOptions) => useTodoForm(props), {
        initialProps: {
          editingTodo: mockTodo,
          onSubmit: mockOnSubmit,
        } as UseTodoFormOptions,
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
      const { result, rerender } = renderHook((props: UseTodoFormOptions) => useTodoForm(props), {
        initialProps: {
          editingTodo: null,
          onSubmit: mockOnSubmit,
        } as UseTodoFormOptions,
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
