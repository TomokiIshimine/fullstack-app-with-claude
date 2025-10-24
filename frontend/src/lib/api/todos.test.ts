import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getTodos, createTodo, updateTodo, toggleTodo, deleteTodo, ApiError } from './todos'
import type { TodoDto } from '@/types/todo'

describe('API Client - todos', () => {
  let originalFetch: typeof global.fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  const mockTodoDto: TodoDto = {
    id: 1,
    title: 'Test Todo',
    detail: 'Test detail',
    due_date: '2024-06-20',
    is_completed: false,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  }

  describe('getTodos', () => {
    it('fetches all todos successfully', async () => {
      const mockResponse = {
        items: [mockTodoDto],
        meta: { count: 1 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      const result = await getTodos('all')

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?status=all', {
        headers: { Accept: 'application/json' },
      })
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 1,
        title: 'Test Todo',
        detail: 'Test detail',
        dueDate: '2024-06-20',
        isCompleted: false,
        createdAt: '2024-06-01T10:00:00Z',
        updatedAt: '2024-06-01T10:00:00Z',
      })
    })

    it('fetches active todos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ items: [] }),
      })

      await getTodos('active')

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?status=active', {
        headers: { Accept: 'application/json' },
      })
    })

    it('fetches completed todos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ items: [] }),
      })

      await getTodos('completed')

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?status=completed', {
        headers: { Accept: 'application/json' },
      })
    })

    it('handles empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ items: [] }),
      })

      const result = await getTodos('all')

      expect(result).toEqual([])
    })

    it('throws ApiError on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: { message: 'Server error' } }),
      })

      await expect(getTodos('all')).rejects.toThrow(ApiError)
      await expect(getTodos('all')).rejects.toThrow('Server error')
    })
  })

  describe('createTodo', () => {
    it('creates a todo successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTodoDto),
      })

      const payload = {
        title: 'New Todo',
        detail: 'Details',
        dueDate: '2024-06-20',
      }

      const result = await createTodo(payload)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Todo',
          detail: 'Details',
          due_date: '2024-06-20',
        }),
      })
      expect(result.title).toBe('Test Todo')
    })

    it('creates a todo with minimal data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTodoDto),
      })

      const payload = {
        title: 'Minimal Todo',
      }

      await createTodo(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/todos',
        expect.objectContaining({
          body: JSON.stringify({ title: 'Minimal Todo' }),
        })
      )
    })

    it('throws ApiError on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ error: { message: 'Title is required' } }),
      })

      await expect(createTodo({ title: '' })).rejects.toThrow('Title is required')
    })
  })

  describe('updateTodo', () => {
    it('updates a todo successfully', async () => {
      const updatedDto = { ...mockTodoDto, title: 'Updated Title' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(updatedDto),
      })

      const payload = { title: 'Updated Title' }
      const result = await updateTodo(1, payload)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      })
      expect(result.title).toBe('Updated Title')
    })

    it('updates only specified fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTodoDto),
      })

      await updateTodo(1, { detail: 'New detail' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/todos/1',
        expect.objectContaining({
          body: JSON.stringify({ detail: 'New detail' }),
        })
      )
    })

    it('throws ApiError on not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: { message: 'Todo not found' } }),
      })

      await expect(updateTodo(999, { title: 'Test' })).rejects.toThrow('Todo not found')
    })
  })

  describe('toggleTodo', () => {
    it('toggles todo completion to true', async () => {
      const completedDto = { ...mockTodoDto, is_completed: true }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(completedDto),
      })

      const result = await toggleTodo(1, true)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1/complete', {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_completed: true }),
      })
      expect(result.isCompleted).toBe(true)
    })

    it('toggles todo completion to false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTodoDto),
      })

      const result = await toggleTodo(1, false)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/todos/1/complete',
        expect.objectContaining({
          body: JSON.stringify({ is_completed: false }),
        })
      )
      expect(result.isCompleted).toBe(false)
    })
  })

  describe('deleteTodo', () => {
    it('deletes a todo successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      })

      await deleteTodo(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE',
      })
    })

    it('throws ApiError on delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: { message: 'Todo not found' } }),
      })

      await expect(deleteTodo(999)).rejects.toThrow('Todo not found')
    })
  })

  describe('ApiError', () => {
    it('creates ApiError with all properties', () => {
      const error = new ApiError(404, 'Not Found', { detail: 'Resource missing' })

      expect(error.name).toBe('ApiError')
      expect(error.status).toBe(404)
      expect(error.message).toBe('Not Found')
      expect(error.body).toEqual({ detail: 'Resource missing' })
    })

    it('creates ApiError without body', () => {
      const error = new ApiError(500, 'Server Error')

      expect(error.status).toBe(500)
      expect(error.body).toBeNull()
    })

    it('is an instance of Error', () => {
      const error = new ApiError(400, 'Bad Request')

      expect(error instanceof Error).toBe(true)
      expect(error instanceof ApiError).toBe(true)
    })
  })

  describe('Error handling edge cases', () => {
    it('handles malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Invalid JSON',
      })

      await expect(getTodos('all')).rejects.toThrow(ApiError)
    })

    it('handles empty error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
      })

      await expect(getTodos('all')).rejects.toThrow()
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getTodos('all')).rejects.toThrow('Network error')
    })
  })

  describe('Data mapping', () => {
    it('correctly maps snake_case to camelCase', async () => {
      const snakeCaseDto: TodoDto = {
        id: 1,
        title: 'Test',
        detail: null,
        due_date: '2024-06-20',
        is_completed: true,
        created_at: '2024-06-01T10:00:00Z',
        updated_at: '2024-06-02T10:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ items: [snakeCaseDto] }),
      })

      const [result] = await getTodos('all')

      expect(result).toEqual({
        id: 1,
        title: 'Test',
        detail: null,
        dueDate: '2024-06-20',
        isCompleted: true,
        createdAt: '2024-06-01T10:00:00Z',
        updatedAt: '2024-06-02T10:00:00Z',
      })
    })

    it('correctly maps camelCase to snake_case in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTodoDto),
      })

      await createTodo({
        title: 'Test',
        detail: 'Detail',
        dueDate: '2024-06-20',
      })

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(callArgs.body as string)

      expect(body).toEqual({
        title: 'Test',
        detail: 'Detail',
        due_date: '2024-06-20',
      })
    })

    it('handles null values in mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockTodoDto),
      })

      await createTodo({
        title: 'Test',
        detail: null,
        dueDate: null,
      })

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(callArgs.body as string)

      expect(body).toEqual({
        title: 'Test',
        detail: null,
        due_date: null,
      })
    })
  })
})
