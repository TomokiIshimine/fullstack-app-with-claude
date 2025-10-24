import { TODO_VALIDATION, TODO_ERROR_MESSAGES } from '@/constants/todo'
import { isValidDate, isPastDate } from '@/lib/utils/dateFormat'

/**
 * Field errors type for todo form
 */
export type TodoFieldErrors = Partial<Record<'title' | 'detail' | 'dueDate', string>>

/**
 * Todo form data interface
 */
export interface TodoFormData {
  title: string
  detail: string
  dueDate: string
}

/**
 * Validate todo form data
 * @param data - Form data to validate
 * @returns Object containing field errors (empty if valid)
 */
export function validateTodoForm(data: TodoFormData): TodoFieldErrors {
  const errors: TodoFieldErrors = {}

  // Validate title
  const trimmedTitle = data.title.trim()
  if (!trimmedTitle) {
    errors.title = TODO_ERROR_MESSAGES.TITLE_REQUIRED
  } else if (trimmedTitle.length > TODO_VALIDATION.TITLE_MAX_LENGTH) {
    errors.title = TODO_ERROR_MESSAGES.TITLE_TOO_LONG
  }

  // Validate detail
  const trimmedDetail = data.detail.trim()
  if (trimmedDetail.length > TODO_VALIDATION.DETAIL_MAX_LENGTH) {
    errors.detail = TODO_ERROR_MESSAGES.DETAIL_TOO_LONG
  }

  // Validate due date
  if (data.dueDate) {
    if (!isValidDate(data.dueDate)) {
      errors.dueDate = TODO_ERROR_MESSAGES.DUE_DATE_INVALID_FORMAT
    } else if (isPastDate(data.dueDate)) {
      errors.dueDate = TODO_ERROR_MESSAGES.DUE_DATE_PAST
    }
  }

  return errors
}
