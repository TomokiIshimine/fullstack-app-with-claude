import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDate, isValidDate, isPastDate } from './dateFormat'

describe('dateFormat', () => {
  describe('formatDate', () => {
    it('formats a valid ISO date string', () => {
      const result = formatDate('2024-01-15')
      // Result will vary by locale, but should be defined
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('returns original value for invalid date', () => {
      const invalid = 'invalid-date'
      expect(formatDate(invalid)).toBe(invalid)
    })

    it('returns original value for empty string', () => {
      expect(formatDate('')).toBe('')
    })
  })

  describe('isValidDate', () => {
    it('returns true for valid ISO date string', () => {
      expect(isValidDate('2024-01-15')).toBe(true)
      expect(isValidDate('2024-12-31')).toBe(true)
      expect(isValidDate('2000-01-01')).toBe(true)
    })

    it('returns false for invalid date strings', () => {
      expect(isValidDate('invalid-date')).toBe(false)
      expect(isValidDate('2024-13-01')).toBe(false)
      expect(isValidDate('2024-01-32')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isValidDate('')).toBe(false)
    })
  })

  describe('isPastDate', () => {
    let originalDate: typeof Date

    beforeEach(() => {
      originalDate = global.Date
    })

    afterEach(() => {
      global.Date = originalDate
    })

    it('returns true for a past date', () => {
      // Mock current date to 2024-06-15
      const mockDate = new Date('2024-06-15T12:00:00Z')
      vi.setSystemTime(mockDate)

      expect(isPastDate('2024-06-14')).toBe(true)
      expect(isPastDate('2024-01-01')).toBe(true)
      expect(isPastDate('2023-12-31')).toBe(true)
    })

    it('returns false for today', () => {
      const mockDate = new Date('2024-06-15T12:00:00Z')
      vi.setSystemTime(mockDate)

      expect(isPastDate('2024-06-15')).toBe(false)
    })

    it('returns false for a future date', () => {
      const mockDate = new Date('2024-06-15T12:00:00Z')
      vi.setSystemTime(mockDate)

      expect(isPastDate('2024-06-16')).toBe(false)
      expect(isPastDate('2024-12-31')).toBe(false)
      expect(isPastDate('2025-01-01')).toBe(false)
    })

    it('handles edge case at midnight', () => {
      const mockDate = new Date('2024-06-15T00:00:00Z')
      vi.setSystemTime(mockDate)

      expect(isPastDate('2024-06-14')).toBe(true)
      expect(isPastDate('2024-06-15')).toBe(false)
    })
  })
})
