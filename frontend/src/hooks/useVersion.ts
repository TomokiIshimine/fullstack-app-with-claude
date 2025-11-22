import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

interface HealthResponse {
  status: string
  database: string
  version: string
}

/**
 * Custom hook to fetch and manage application version information.
 *
 * Fetches version information from the /api/health endpoint on mount.
 * Returns the version string and loading state.
 *
 * @returns {Object} An object containing:
 *   - version: The application version (e.g., "v1.0.0") or "unknown" if unavailable
 *   - isLoading: Boolean indicating whether the version is being fetched
 */
export function useVersion() {
  const [version, setVersion] = useState<string>('unknown')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: HealthResponse = await response.json()
        setVersion(data.version || 'unknown')
      } catch (error) {
        logger.error('Failed to fetch version', error as Error)
        setVersion('unknown')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVersion()
  }, [])

  return { version, isLoading }
}
