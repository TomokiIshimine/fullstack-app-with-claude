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

      it('requires title after trimming whitespace', () => {
        const data: TodoFormData = {
          title: '   ',
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.title).toBe(TODO_ERROR_MESSAGES.TITLE_REQUIRED)
      })

      it('rejects title exceeding max length', () => {
        const data: TodoFormData = {
          title: 'a'.repeat(121), // 121 characters
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.title).toBe(TODO_ERROR_MESSAGES.TITLE_TOO_LONG)
      })

      it('accepts title at max length', () => {
        const data: TodoFormData = {
          title: 'a'.repeat(120), // exactly 120 characters
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.title).toBeUndefined()
      })

      it('accepts title with leading/trailing whitespace after trimming', () => {
        const data: TodoFormData = {
          title: '  Valid Title  ',
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.title).toBeUndefined()
      })
    })

    describe('detail validation', () => {
      it('allows empty detail', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.detail).toBeUndefined()
      })

      it('rejects detail exceeding max length', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: 'a'.repeat(1001), // 1001 characters
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.detail).toBe(TODO_ERROR_MESSAGES.DETAIL_TOO_LONG)
      })

      it('accepts detail at max length', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: 'a'.repeat(1000), // exactly 1000 characters
          dueDate: '',
        }

        const errors = validateTodoForm(data)
        expect(errors.detail).toBeUndefined()
      })

      it('checks length after trimming', () => {
        const data: TodoFormData = {
          title: 'Title',
          detail: '  ' + 'a'.repeat(1001) + '  ',
          dueDate: '',
        }

        const errors = validateTodoForm(data)
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
