import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchUsers, createUser, deleteUser } from './users'
import { ApiError } from './client'
import { createMockResponse, restoreFetch, createMockEmptyResponse } from '@/test/helpers/mockApi'
import type { UserResponse, UserCreateResponse, UserListResponse } from '@/types/user'

describe('API Client - users', () => {
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

  const mockUserResponse: UserResponse = {
    id: 1,
    email: 'user1@example.com',
    role: 'user',
    name: 'Test User 1',
    created_at: '2025-11-06T12:00:00Z',
  }

  const mockAdminResponse: UserResponse = {
    id: 2,
    email: 'admin@example.com',
    role: 'admin',
    name: 'Admin User',
    created_at: '2025-11-06T11:00:00Z',
  }

  describe('fetchUsers', () => {
    it('fetches users successfully', async () => {
      const mockResponse: UserListResponse = {
        users: [mockAdminResponse, mockUserResponse],
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchUsers()

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'GET',
        credentials: 'include',
      })

      expect(result).toEqual([mockAdminResponse, mockUserResponse])
    })

    it('returns empty array when no users exist', async () => {
      const mockResponse: UserListResponse = {
        users: [],
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse))

      const result = await fetchUsers()

      expect(result).toEqual([])
    })

    it('throws ApiError on unauthorized access', async () => {
      const errorResponse = {
        error: 'Unauthorized',
      }

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 403,
            ok: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 403,
            ok: false,
          })
        )

      await expect(fetchUsers()).rejects.toThrow(ApiError)
      await expect(fetchUsers()).rejects.toThrow('Unauthorized')
    })

    it('throws ApiError on server error', async () => {
      const errorResponse = {
        error: 'Internal server error',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 500,
          ok: false,
        })
      )

      await expect(fetchUsers()).rejects.toThrow('Internal server error')
    })

    it('includes credentials in request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          users: [],
        })
      )

      await fetchUsers()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('createUser', () => {
    it('creates user successfully and returns initial password', async () => {
      const mockResponse: UserCreateResponse = {
        user: mockUserResponse,
        initial_password: 'aB3xY9mK2pL5',
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, { status: 201 }))

      const payload = {
        email: 'user1@example.com',
        name: 'Test User 1',
      }

      const result = await createUser(payload)

      expect(mockFetch).toHaveBeenCalledWith('/api/users', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      expect(result).toEqual(mockResponse)
      expect(result.initial_password).toBe('aB3xY9mK2pL5')
      expect(result.user).toEqual(mockUserResponse)
    })

    it('throws ApiError on validation error', async () => {
      const errorResponse = {
        error: 'email: Invalid email format',
      }

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 400,
            ok: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 400,
            ok: false,
          })
        )

      await expect(
        createUser({
          email: 'invalid-email',
          name: 'Test User',
        })
      ).rejects.toThrow(ApiError)

      await expect(
        createUser({
          email: 'invalid-email',
          name: 'Test User',
        })
      ).rejects.toThrow('email: Invalid email format')
    })

    it('throws ApiError on duplicate email', async () => {
      const errorResponse = {
        error: 'Email already exists',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 409,
          ok: false,
        })
      )

      await expect(
        createUser({
          email: 'existing@example.com',
          name: 'Test User',
        })
      ).rejects.toThrow('Email already exists')
    })

    it('throws ApiError on unauthorized access', async () => {
      const errorResponse = {
        error: 'Forbidden',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 403,
          ok: false,
        })
      )

      await expect(
        createUser({
          email: 'user@example.com',
          name: 'Test User',
        })
      ).rejects.toThrow('Forbidden')
    })

    it('includes credentials in request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          user: mockUserResponse,
          initial_password: 'test123456',
        })
      )

      await createUser({
        email: 'user@example.com',
        name: 'Test User',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('deleteUser', () => {
    it('deletes user successfully', async () => {
      mockFetch.mockResolvedValueOnce(createMockEmptyResponse({ status: 204 }))

      await deleteUser(3)

      expect(mockFetch).toHaveBeenCalledWith('/api/users/3', {
        method: 'DELETE',
        credentials: 'include',
      })
    })

    it('throws ApiError on user not found', async () => {
      const errorResponse = {
        error: 'User not found',
      }

      mockFetch
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 404,
            ok: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse(errorResponse, {
            status: 404,
            ok: false,
          })
        )

      await expect(deleteUser(999)).rejects.toThrow(ApiError)
      await expect(deleteUser(999)).rejects.toThrow('User not found')
    })

    it('throws ApiError when trying to delete admin', async () => {
      const errorResponse = {
        error: 'Admin user cannot be deleted',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 403,
          ok: false,
        })
      )

      await expect(deleteUser(1)).rejects.toThrow('Admin user cannot be deleted')
    })

    it('throws ApiError on unauthorized access', async () => {
      const errorResponse = {
        error: 'Forbidden',
      }

      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, {
          status: 403,
          ok: false,
        })
      )

      await expect(deleteUser(3)).rejects.toThrow('Forbidden')
    })

    it('includes credentials in request', async () => {
      mockFetch.mockResolvedValueOnce(createMockEmptyResponse({ status: 204 }))

      await deleteUser(3)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })
})
