import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTodos } from './useTodos'
import * as todosApi from '@/lib/api/todos'
import { createMockTodo } from '@/test/helpers/mockData'

describe('useTodos', () => {
  const mockTodos = [
    createMockTodo({
      id: 1,
      title: 'Active Todo 1',
      isCompleted: false,
      dueDate: '2024-06-20',
    }),
    createMockTodo({
      id: 2,
      title: 'Completed Todo',
      isCompleted: true,
      dueDate: '2024-06-15',
    }),
    createMockTodo({
      id: 3,
      title: 'Active Todo 2',
      isCompleted: false,
      dueDate: null,
    }),
  ]

  beforeEach(() => {
    // Mock API calls
    vi.spyOn(todosApi, 'getTodos').mockResolvedValue(mockTodos)
    vi.spyOn(todosApi, 'createTodo').mockResolvedValue(createMockTodo({ id: 4, title: 'New Todo' }))
    vi.spyOn(todosApi, 'updateTodo').mockResolvedValue(
      createMockTodo({ id: 1, title: 'Updated Todo' })
    )
    vi.spyOn(todosApi, 'toggleTodo').mockResolvedValue(createMockTodo({ id: 1, isCompleted: true }))
    vi.spyOn(todosApi, 'deleteTodo').mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Load', () => {
    it('loads todos on mount', async () => {
      const { result } = renderHook(() => useTodos())

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Wait for todos to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(todosApi.getTodos).toHaveBeenCalledWith('all')
      expect(result.current.totalCount).toBe(3)
    })

    it('sets error when initial load fails', async () => {
      const error = new Error('Failed to load todos')
      vi.spyOn(todosApi, 'getTodos').mockRejectedValue(error)

      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load todos')
    })

    it('initializes with default state', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.status).toBe('active')
      expect(result.current.sortOrder).toBe('asc')
      expect(result.current.editingTodo).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('Status Filtering', () => {
    it('filters todos by status "all"', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.setStatus('all')

      await waitFor(() => {
        expect(result.current.todos).toHaveLength(3)
      })

      expect(result.current.status).toBe('all')
    })

    it('filters todos by status "active"', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.setStatus('active')

      await waitFor(() => {
        expect(result.current.todos).toHaveLength(2)
      })

      expect(result.current.todos.every(todo => !todo.isCompleted)).toBe(true)
    })

    it('filters todos by status "completed"', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.setStatus('completed')

      await waitFor(() => {
        expect(result.current.todos).toHaveLength(1)
      })

      expect(result.current.todos.every(todo => todo.isCompleted)).toBe(true)
    })
  })

  describe('Sorting', () => {
    it('sorts todos in ascending order by default', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.setStatus('all')

      await waitFor(() => {
        expect(result.current.todos).toHaveLength(3)
      })

      // Todos with due dates come first, sorted by date ascending
      expect(result.current.todos[0].id).toBe(2) // 2024-06-15
      expect(result.current.todos[1].id).toBe(1) // 2024-06-20
      expect(result.current.todos[2].id).toBe(3) // null
    })

    it('toggles sort order', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.setStatus('all')
      result.current.toggleSortOrder()

      await waitFor(() => {
        expect(result.current.sortOrder).toBe('desc')
      })

      // Descending order
      expect(result.current.todos[0].id).toBe(1) // 2024-06-20
      expect(result.current.todos[1].id).toBe(2) // 2024-06-15
      expect(result.current.todos[2].id).toBe(3) // null
    })
  })

  describe('Counts', () => {
    it('calculates total count correctly', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.totalCount).toBe(3)
    })

    it('calculates active count correctly', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.activeCount).toBe(2)
    })

    it('calculates completed count correctly', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.completedCount).toBe(1)
    })
  })

  describe('CRUD Operations', () => {
    describe('Create Todo', () => {
      it('creates a new todo successfully', async () => {
        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const payload = { title: 'New Todo', detail: null, dueDate: null }

        await result.current.submitTodo(payload)

        expect(todosApi.createTodo).toHaveBeenCalledWith(payload)
        expect(todosApi.getTodos).toHaveBeenCalledTimes(2) // Initial + after create
      })

      it('sets error when create fails', async () => {
        const error = new todosApi.ApiError(400, 'Validation error')
        vi.spyOn(todosApi, 'createTodo').mockRejectedValue(error)

        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await expect(
          result.current.submitTodo({ title: 'Invalid', detail: null, dueDate: null })
        ).rejects.toThrow()

        await waitFor(() => {
          expect(result.current.error).toBe('Validation error')
        })
      })
    })

    describe('Update Todo', () => {
      it('updates an existing todo successfully', async () => {
        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        const todoToEdit = mockTodos[0]
        result.current.startEditing(todoToEdit)

        await waitFor(() => {
          expect(result.current.editingTodo).toEqual(todoToEdit)
        })

        const payload = { title: 'Updated Title' }
        await result.current.submitTodo(payload)

        expect(todosApi.updateTodo).toHaveBeenCalledWith(todoToEdit.id, payload)
        expect(result.current.editingTodo).toBeNull()
      })

      it('sets error when update fails', async () => {
        const error = new todosApi.ApiError(404, 'Not found')
        vi.spyOn(todosApi, 'updateTodo').mockRejectedValue(error)

        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        result.current.startEditing(mockTodos[0])

        await expect(result.current.submitTodo({ title: 'Test' })).rejects.toThrow()

        await waitFor(() => {
          expect(result.current.error).toBe('Not found')
        })
      })
    })

    describe('Delete Todo', () => {
      it('deletes a todo successfully', async () => {
        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await result.current.deleteTodo(1)

        expect(todosApi.deleteTodo).toHaveBeenCalledWith(1)
        expect(todosApi.getTodos).toHaveBeenCalledTimes(2) // Initial + after delete
      })

      it('clears editing state when deleting the currently edited todo', async () => {
        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        result.current.startEditing(mockTodos[0])

        await waitFor(() => {
          expect(result.current.editingTodo).toEqual(mockTodos[0])
        })

        await result.current.deleteTodo(mockTodos[0].id)

        await waitFor(() => {
          expect(result.current.editingTodo).toBeNull()
        })
      })

      it('sets error when delete fails', async () => {
        const error = new todosApi.ApiError(404, 'Not found')
        vi.spyOn(todosApi, 'deleteTodo').mockRejectedValue(error)

        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await expect(result.current.deleteTodo(999)).rejects.toThrow()

        await waitFor(() => {
          expect(result.current.error).toBe('Not found')
        })
      })
    })

    describe('Toggle Todo Completion', () => {
      it('toggles todo completion status', async () => {
        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await result.current.toggleTodoCompletion(1, true)

        expect(todosApi.toggleTodo).toHaveBeenCalledWith(1, true)
        expect(todosApi.getTodos).toHaveBeenCalledTimes(2) // Initial + after toggle
      })

      it('sets error when toggle fails', async () => {
        const error = new todosApi.ApiError(404, 'Not found')
        vi.spyOn(todosApi, 'toggleTodo').mockRejectedValue(error)

        const { result } = renderHook(() => useTodos())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await expect(result.current.toggleTodoCompletion(999, true)).rejects.toThrow()

        await waitFor(() => {
          expect(result.current.error).toBe('Not found')
        })
      })
    })
  })

  describe('Editing State', () => {
    it('starts editing a todo', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const todoToEdit = mockTodos[0]
      result.current.startEditing(todoToEdit)

      await waitFor(() => {
        expect(result.current.editingTodo).toEqual(todoToEdit)
      })
    })

    it('cancels editing', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      result.current.startEditing(mockTodos[0])

      await waitFor(() => {
        expect(result.current.editingTodo).not.toBeNull()
      })

      result.current.cancelEditing()

      await waitFor(() => {
        expect(result.current.editingTodo).toBeNull()
      })
    })
  })

  describe('Error Handling', () => {
    it('clears error manually', async () => {
      const error = new Error('Some error')
      vi.spyOn(todosApi, 'getTodos').mockRejectedValue(error)

      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.error).toBe('Some error')
      })

      result.current.clearError()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })

    it('clears error before new operation', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate an error
      const error = new todosApi.ApiError(400, 'Some error')
      vi.spyOn(todosApi, 'createTodo').mockRejectedValueOnce(error)

      await expect(
        result.current.submitTodo({ title: 'Test', detail: null, dueDate: null })
      ).rejects.toThrow()

      await waitFor(() => {
        expect(result.current.error).toBe('Some error')
      })

      // Clear mock to allow success
      vi.spyOn(todosApi, 'createTodo').mockResolvedValue(
        createMockTodo({ id: 5, title: 'New Todo' })
      )

      // Try again - error should be cleared
      await result.current.submitTodo({ title: 'Test', detail: null, dueDate: null })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('Refresh', () => {
    it('refreshes todo list', async () => {
      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(todosApi.getTodos).toHaveBeenCalledTimes(1)

      await result.current.refresh()

      expect(todosApi.getTodos).toHaveBeenCalledTimes(2)
    })

    it('clears error when refreshing', async () => {
      const error = new Error('Initial error')
      vi.spyOn(todosApi, 'getTodos').mockRejectedValueOnce(error)

      const { result } = renderHook(() => useTodos())

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error')
      })

      // Mock success for refresh
      vi.spyOn(todosApi, 'getTodos').mockResolvedValue(mockTodos)

      await result.current.refresh()

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })
})
