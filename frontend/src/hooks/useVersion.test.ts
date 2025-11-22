import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVersion } from './useVersion'

describe('useVersion', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('正常にバージョン情報を取得できる', async () => {
    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        database: 'connected',
        version: 'v1.0.0',
      }),
    })

    const { result } = renderHook(() => useVersion())

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.version).toBe('unknown')

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Version should be updated
    expect(result.current.version).toBe('v1.0.0')
    expect(global.fetch).toHaveBeenCalledWith('/api/health')
  })

  it('バージョンが存在しない場合は "unknown" を返す', async () => {
    // Mock response without version field
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        database: 'connected',
      }),
    })

    const { result } = renderHook(() => useVersion())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.version).toBe('unknown')
  })

  it('APIリクエストが失敗した場合は "unknown" を返す', async () => {
    // Mock failed fetch (network error)
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useVersion())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.version).toBe('unknown')
  })

  it('HTTPエラーレスポンス（404など）の場合は "unknown" を返す', async () => {
    // Mock HTTP error response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    const { result } = renderHook(() => useVersion())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.version).toBe('unknown')
  })

  it('HTTPエラーレスポンス（500など）の場合は "unknown" を返す', async () => {
    // Mock HTTP 500 error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useVersion())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.version).toBe('unknown')
  })

  it('JSONパースエラーの場合は "unknown" を返す', async () => {
    // Mock response with invalid JSON
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    })

    const { result } = renderHook(() => useVersion())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.version).toBe('unknown')
  })

  it('異なるバージョン形式を正しく返す', async () => {
    const versions = ['v2.1.0', 'v1.0.0-beta.1', 'v3.0.0-rc.2', 'unknown']

    for (const version of versions) {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'healthy',
          database: 'connected',
          version,
        }),
      })

      const { result } = renderHook(() => useVersion())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.version).toBe(version)

      // Reset for next iteration
      vi.resetAllMocks()
    }
  })
})
