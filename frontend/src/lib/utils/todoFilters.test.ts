import { describe, it, expect } from 'vitest'
import { filterByStatus, sortTodos } from './todoFilters'
import type { Todo } from '@/types/todo'

describe('todoFilters', () => {
  const mockTodos: Todo[] = [
    {
      id: 1,
      title: 'Active Todo 1',
      detail: null,
      dueDate: '2024-06-20',
      isCompleted: false,
      createdAt: '2024-06-01T10:00:00Z',
      updatedAt: '2024-06-01T10:00:00Z',
    },
    {
      id: 2,
      title: 'Completed Todo',
      detail: 'Details',
      dueDate: '2024-06-15',
      isCompleted: true,
      createdAt: '2024-06-02T10:00:00Z',
      updatedAt: '2024-06-02T10:00:00Z',
    },
    {
      id: 3,
      title: 'Active Todo 2',
      detail: null,
      dueDate: null,
      isCompleted: false,
      createdAt: '2024-06-03T10:00:00Z',
      updatedAt: '2024-06-03T10:00:00Z',
    },
    {
      id: 4,
      title: 'Active Todo 3',
      detail: null,
      dueDate: '2024-06-10',
      isCompleted: false,
      createdAt: '2024-06-04T10:00:00Z',
      updatedAt: '2024-06-04T10:00:00Z',
    },
  ]

  describe('filterByStatus', () => {
    it('returns all todos when status is "all"', () => {
      const result = filterByStatus(mockTodos, 'all')
      expect(result).toHaveLength(4)
      expect(result).toEqual(mockTodos)
    })

    it('returns only active todos when status is "active"', () => {
      const result = filterByStatus(mockTodos, 'active')
      expect(result).toHaveLength(3)
      expect(result.every(todo => !todo.isCompleted)).toBe(true)
      expect(result.map(t => t.id)).toEqual([1, 3, 4])
    })

    it('returns only completed todos when status is "completed"', () => {
      const result = filterByStatus(mockTodos, 'completed')
      expect(result).toHaveLength(1)
      expect(result.every(todo => todo.isCompleted)).toBe(true)
      expect(result[0].id).toBe(2)
    })

    it('returns empty array for empty input', () => {
      expect(filterByStatus([], 'all')).toEqual([])
      expect(filterByStatus([], 'active')).toEqual([])
      expect(filterByStatus([], 'completed')).toEqual([])
    })
  })

  describe('sortTodos', () => {
    it('sorts todos by due date in ascending order', () => {
      const result = sortTodos(mockTodos, 'asc')

      // Todos with due dates come first, sorted by date
      expect(result[0].id).toBe(4) // 2024-06-10
      expect(result[1].id).toBe(2) // 2024-06-15
      expect(result[2].id).toBe(1) // 2024-06-20
      // Todo without due date comes last
      expect(result[3].id).toBe(3) // null
    })

    it('sorts todos by due date in descending order', () => {
      const result = sortTodos(mockTodos, 'desc')

      // Todos with due dates come first, sorted by date descending
      expect(result[0].id).toBe(1) // 2024-06-20
      expect(result[1].id).toBe(2) // 2024-06-15
      expect(result[2].id).toBe(4) // 2024-06-10
      // Todo without due date comes last
      expect(result[3].id).toBe(3) // null
    })

    it('sorts todos without due dates by creation date', () => {
      const todosWithoutDueDate: Todo[] = [
        {
          id: 1,
          title: 'Second',
          detail: null,
          dueDate: null,
          isCompleted: false,
          createdAt: '2024-06-02T10:00:00Z',
          updatedAt: '2024-06-02T10:00:00Z',
        },
        {
          id: 2,
          title: 'First',
          detail: null,
          dueDate: null,
          isCompleted: false,
          createdAt: '2024-06-01T10:00:00Z',
          updatedAt: '2024-06-01T10:00:00Z',
        },
        {
          id: 3,
          title: 'Third',
          detail: null,
          dueDate: null,
          isCompleted: false,
          createdAt: '2024-06-03T10:00:00Z',
          updatedAt: '2024-06-03T10:00:00Z',
        },
      ]

      const resultAsc = sortTodos(todosWithoutDueDate, 'asc')
      expect(resultAsc.map(t => t.id)).toEqual([2, 1, 3])

      const resultDesc = sortTodos(todosWithoutDueDate, 'desc')
      expect(resultDesc.map(t => t.id)).toEqual([3, 1, 2])
    })

    it('does not mutate the original array', () => {
      const original = [...mockTodos]
      sortTodos(mockTodos, 'asc')
      expect(mockTodos).toEqual(original)
    })

    it('handles empty array', () => {
      const result = sortTodos([], 'asc')
      expect(result).toEqual([])
    })

    it('handles single todo', () => {
      const single = [mockTodos[0]]
      const result = sortTodos(single, 'asc')
      expect(result).toEqual(single)
    })

    it('sorts todos with same due date by creation date', () => {
      const sameDueDateTodos: Todo[] = [
        {
          id: 1,
          title: 'Second',
          detail: null,
          dueDate: '2024-06-15',
          isCompleted: false,
          createdAt: '2024-06-02T10:00:00Z',
          updatedAt: '2024-06-02T10:00:00Z',
        },
        {
          id: 2,
          title: 'First',
          detail: null,
          dueDate: '2024-06-15',
          isCompleted: false,
          createdAt: '2024-06-01T10:00:00Z',
          updatedAt: '2024-06-01T10:00:00Z',
        },
      ]

      const result = sortTodos(sameDueDateTodos, 'asc')
      expect(result.map(t => t.id)).toEqual([2, 1])
    })
  })
})
