import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateTodoForm, type TodoFormData } from './todoValidation'
import { TODO_ERROR_MESSAGES } from '@/constants/todo'

describe('todoValidation', () => {
  describe('validateTodoForm', () => {
    let originalDate: typeof Date

    beforeEach(() => {
      originalDate = global.Date
      // Mock current date to 2024-06-15
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      global.Date = originalDate
      vi.useRealTimers()
    })

    it('validates a valid todo form', () => {
      const data: TodoFormData = {
        title: 'Valid Title',
        detail: 'Valid detail',
        dueDate: '2024-06-20',
      }

      const errors = validateTodoForm(data)
      expect(errors).toEqual({})
    })

    it('validates a minimal valid todo form', () => {
      const data: TodoFormData = {
        title: 'Title',
        detail: '',
        dueDate: '',
      }

      const errors = validateTodoForm(data)
      expect(errors).toEqual({})
    })

    describe('title validation', () => {
      it('requires title', () => {
        const data: TodoFormData = {
          title: '',
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)
      })

      it('validates title trimming and length', () => {
        // Empty after trim
        let data: TodoFormData = { title: '   ', detail: '', dueDate: '' }
        let errors = validateTodoForm(data)
        expect(errors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)

        // Exceeds max length
        data = { title: 'a'.repeat(121), detail: '', dueDate: '' }
        errors = validateTodoForm(data)
        expect(errors.title).toBe(TODO_ERROR_MESSAGES.TITLE_TOO_LONG)

        // Valid with whitespace (trims correctly)
        data = { title: '  Valid Title  ', detail: '', dueDate: '' }
        errors = validateTodoForm(data)
        expect(errors.title).toBeUndefined()
      })
    })

    describe('detail validation', () => {
      it('validates detail length', () => {
        // Empty detail is allowed
        let data: TodoFormData = { title: 'Title', detail: '', dueDate: '' }
        let errors = validateTodoForm(data)
        expect(errors.detail).toBeUndefined()

        // Exceeds max length (checks after trimming)
        data = { title: 'Title', detail: '  ' + 'a'.repeat(1001) + '  ', dueDate: '' }
        errors = validateTodoForm(data)
        expect(errors.detail).toBe(TODO_ERROR_MESSAGES.DETAIL_TOO_LONG)
      })
    })

    describe('dueDate validation', () => {
      it('allows empty due date', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.dueDate).toBeUndefined()
      })

      it('rejects invalid date format', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '',
          dueDate: 'invalid-date',
        }

        const errors = validateTodoForm(data)
        expect(errors.dueDate).toBe(TODO_ERROR_MESSAGES.DUE_DATE_INVALID_FORMAT)
      })

      it('rejects past date', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '',
          dueDate: '2024-06-14', // Yesterday
        }

        const errors = validateTodoForm(data)
        expect(errors.dueDate).toBe(TODO_ERROR_MESSAGES.DUE_DATE_PAST)
      })

      it('accepts today as due date', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '',
          dueDate: '2024-06-15', // Today
        }

        const errors = validateTodoForm(data)
        expect(errors.dueDate).toBeUndefined()
      })

      it('accepts future date', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '',
          dueDate: '2024-06-20',
        }

        const errors = validateTodoForm(data)
        expect(errors.dueDate).toBeUndefined()
      })
    })

    describe('multiple errors', () => {
      it('returns all errors when multiple fields are invalid', () => {
        const data: TodoFormData = {
          title: '',
          detail: 'a'.repeat(1001),
          dueDate: '2024-06-14',
        }

        const errors = validateTodoForm(data)
        expect(errors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)
        expect(errors.detail).toBe(TODO_ERROR_MESSAGES.DETAIL_TOO_LONG)
        expect(errors.dueDate).toBe(TODO_ERROR_MESSAGES.DUE_DATE_PAST)
      })
    })
  })
})
