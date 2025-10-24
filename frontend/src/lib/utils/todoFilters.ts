import type { Todo, TodoStatus, SortOrder } from '@/types/todo'

/**
 * Filter todos by status
 * @param todos - Array of todos to filter
 * @param status - Status to filter by ('all', 'active', or 'completed')
 * @returns Filtered array of todos
 */
export function filterByStatus(todos: Todo[], status: TodoStatus): Todo[] {
  if (status === 'active') {
    return todos.filter(todo => !todo.isCompleted)
  }
  if (status === 'completed') {
    return todos.filter(todo => todo.isCompleted)
  }
  return todos
}

/**
 * Sort todos by due date and creation date
 * Todos with due dates come first, sorted by due date.
 * Todos without due dates come last, sorted by creation date.
 * @param todos - Array of todos to sort
 * @param sortOrder - Sort order ('asc' or 'desc')
 * @returns Sorted array of todos (new array)
 */
export function sortTodos(todos: Todo[], sortOrder: SortOrder): Todo[] {
  const sorted = [...todos]
  sorted.sort((a, b) => {
    // Both have due dates
    if (a.dueDate && b.dueDate) {
      if (a.dueDate === b.dueDate) {
        return a.createdAt.localeCompare(b.createdAt)
      }
      return sortOrder === 'asc'
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate)
    }

    // Only a has due date - comes first
    if (a.dueDate && !b.dueDate) {
      return -1
    }

    // Only b has due date - comes first
    if (!a.dueDate && b.dueDate) {
      return 1
    }

    // Neither has due date - sort by creation date
    return sortOrder === 'asc'
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt)
  })
  return sorted
}
