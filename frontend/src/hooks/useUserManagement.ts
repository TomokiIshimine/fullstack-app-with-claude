import { useCallback, useEffect, useState } from 'react'
import {
  createUser as createUserApi,
  deleteUser as deleteUserApi,
  fetchUsers,
} from '@/lib/api/users'
import { useErrorHandler } from './useErrorHandler'
import type { UserCreateRequest, UserCreateResponse, UserResponse } from '@/types/user'
import { logger } from '@/lib/logger'

interface InitialPassword {
  email: string
  password: string
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [initialPassword, setInitialPassword] = useState<InitialPassword | null>(null)
  const { error, handleError, clearError } = useErrorHandler()

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    clearError()
    try {
      const data = await fetchUsers()
      setUsers(data)
      logger.info('Users loaded', { count: data.length })
    } catch (err) {
      handleError(err, 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [clearError, handleError])

  const createUser = useCallback(
    async (payload: UserCreateRequest): Promise<UserCreateResponse> => {
      try {
        const response = await createUserApi(payload)
        logger.info('User created successfully', { email: payload.email, name: payload.name })
        setInitialPassword({
          email: response.user.email,
          password: response.initial_password,
        })
        await loadUsers()
        return response
      } catch (err) {
        handleError(err, 'Failed to create user')
        throw err
      }
    },
    [handleError, loadUsers]
  )

  const deleteUser = useCallback(
    async (user: UserResponse) => {
      try {
        await deleteUserApi(user.id)
        logger.info('User deleted successfully', { userId: user.id, email: user.email })
        await loadUsers()
      } catch (err) {
        handleError(err, 'Failed to delete user')
        throw err
      }
    },
    [handleError, loadUsers]
  )

  const resetInitialPassword = useCallback(() => {
    setInitialPassword(null)
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  return {
    users,
    isLoading,
    error,
    initialPassword,
    clearError,
    loadUsers,
    createUser,
    deleteUser,
    resetInitialPassword,
  }
}
