/**
 * Format a date string to locale date string
 * @param value - ISO date string (e.g., "2024-01-01")
 * @returns Formatted date string or original value if invalid
 */
export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString()
}

/**
 * Check if a date string is valid
 * @param value - Date string to validate
 * @returns true if the date is valid
 */
export function isValidDate(value: string): boolean {
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

/**
 * Check if a date string represents a past date (before today)
 * @param value - Date string to check (e.g., "2024-01-01")
 * @returns true if the date is in the past
 */
export function isPastDate(value: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const date = new Date(`${value}T00:00:00`)
  return date.getTime() < today.getTime()
}
