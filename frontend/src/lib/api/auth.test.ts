import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { login, logout, refreshToken } from './auth'
import { ApiError } from './client'
import { createMockUser, createMockUserDto } from '@/test/helpers/mockData'
import { createMockResponse, restoreFetch, createMockEmptyResponse } from '@/test/helpers/mockApi'

describe('API Client - auth', () => {
  let originalFetch: typeof global.fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    restoreFetch(originalFetch)
    vi.restoreAllMocks()
  })

  const mockUserDto = createMockUserDto({
    id: 1,
    email: 'test@example.com',
  })

  const expectedUser = createMockUser({
    id: 1,
    email: 'test@example.com',
  })

  describe('login', () => {
    it('logs in successfully with valid credentials', async () => {
      const mockResponse = {
        user: mockUserDto,
        message: 'Login successful',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse))

      const payload = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = await login(payload)

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      expect(result).toEqual(expectedUser)
    })

    it('throws ApiError on invalid credentials', async () => {
      const errorResponse = {
        error: 'Invalid email or password',
      }

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 401,
            ok: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 401,
            ok: false,
          })
        )

      await expect(
        login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(ApiError)

      await expect(
        login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password')
    })

    it('throws ApiError on server error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          { error: 'Internal server error' },
          {
            status: 500,
            ok: false,
          }
        )
      )

      await expect(
        login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Internal server error')
    })

    it('includes credentials in request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          user: mockUserDto,
          message: 'Login successful',
        })
      )

      await login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('logout', () => {
    it('logs out successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockEmptyResponse())

      await logout()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    })

    it('throws ApiError on logout failure', async () => {
      const errorResponse = {
        error: 'Logout failed',
      }

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 500,
            ok: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 500,
            ok: false,
          })
        )

      await expect(logout()).rejects.toThrow(ApiError)
      await expect(logout()).rejects.toThrow('Logout failed')
    })

    it('includes credentials in request', async () => {
      mockFetch.mockResolvedValueOnce(createMockEmptyResponse())

      await logout()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('refreshToken', () => {
    it('refreshes token successfully', async () => {
      const mockResponse = {
        user: mockUserDto,
        message: 'Token refreshed',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await refreshToken()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      expect(result).toEqual(expectedUser)
    })

    it('throws ApiError when refresh token is invalid', async () => {
      const errorResponse = {
        error: 'Refresh token invalid',
      }

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 401,
            ok: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 401,
            ok: false,
          })
        )

      await expect(refreshToken()).rejects.toThrow(ApiError)
      await expect(refreshToken()).rejects.toThrow('Refresh token invalid')
    })

    it('throws ApiError when refresh token is expired', async () => {
      const errorResponse = {
        error: 'Refresh token expired',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 401,
          ok: false,
        })
      )

      await expect(refreshToken()).rejects.toThrow('Refresh token expired')
    })

    it('includes credentials in request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          user: mockUserDto,
          message: 'Token refreshed',
        })
      )

      await refreshToken()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('Data mapping', () => {
    it('correctly maps UserDto to User', async () => {
      const userDto = createMockUserDto({
        id: 123,
        email: 'user@test.com',
        role: 'user',
        name: 'Test User',
      })

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          user: userDto,
          message: 'Login successful',
        })
      )

      const result = await login({
        email: 'user@test.com',
        password: 'password',
      })

      expect(result).toEqual({
        id: 123,
        email: 'user@test.com',
        role: 'user',
        name: 'Test User',
      })
    })
  })

  describe('Error handling', () => {
    it('handles malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Invalid JSON',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as unknown as Response)

      await expect(
        login({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow(ApiError)
    })

    it('handles empty error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '',
        json: async () => null,
      } as Response)

      await expect(
        login({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow(ApiError)
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        login({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow('Network error')
    })
  })

  describe('ApiError', () => {
    it('creates ApiError with error message from response', async () => {
      const errorResponse = {
        error: 'Custom error message',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 400,
          ok: false,
        })
      )

      try {
        await login({
          email: 'test@example.com',
          password: 'password',
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(400)
        expect((error as ApiError).message).toBe('Custom error message')
      }
    })

    it('creates ApiError with statusText when no error message', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(
          {},
          {
            status: 404,
            statusText: 'Not Found',
            ok: false,
          }
        )
      )

      try {
        await login({
          email: 'test@example.com',
          password: 'password',
        })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(404)
        expect((error as ApiError).message).toBe('Not Found')
      }
    })
  })
})
