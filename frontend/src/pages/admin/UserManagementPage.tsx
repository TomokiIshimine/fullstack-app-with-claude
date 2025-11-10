import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { UserList } from '@/components/admin/UserList'
import { UserCreateForm } from '@/components/admin/UserCreateForm'
import { InitialPasswordModal } from '@/components/admin/InitialPasswordModal'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { fetchUsers } from '@/lib/api/users'
import type { UserResponse } from '@/types/user'
import { logger } from '@/lib/logger'

export function UserManagementPage() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [initialPassword, setInitialPassword] = useState<{
    email: string
    password: string
  } | null>(null)
  const { error, handleError, clearError } = useErrorHandler()
  const { handleLogout } = useLogout()
  const navigate = useNavigate()

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      clearError()
      const data = await fetchUsers()
      setUsers(data)
      logger.info('Users loaded', { count: data.length })
    } catch (err) {
      handleError(err, 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSuccess = (response: { user: UserResponse; initial_password: string }) => {
    // Show initial password modal
    setInitialPassword({ email: response.user.email, password: response.initial_password })
    // Hide create form
    setShowCreateForm(false)
    // Reload users list
    loadUsers()
  }

  const handleClosePasswordModal = () => {
    setInitialPassword(null)
  }

  return (
    <div className="user-management-page">
      <div className="user-management-page__content">
        <div className="user-management-page__header">
          <h1 className="user-management-page__title">ユーザー管理</h1>
          <div className="user-management-page__actions">
            <button
              onClick={() => navigate('/settings')}
              className="user-management-page__settings"
            >
              設定
            </button>
            <button onClick={handleLogout} className="user-management-page__logout">
              ログアウト
            </button>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => {
              clearError()
              void loadUsers()
            }}
            onDismiss={clearError}
          />
        )}

        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner">読み込み中...</div>
          </div>
        ) : (
          <div className="user-management-page__body">
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="user-management-page__create-button"
              >
                + 新規ユーザー追加
              </button>
            )}

            {showCreateForm && (
              <UserCreateForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            <UserList users={users} onUsersChange={loadUsers} />
          </div>
        )}

        {initialPassword && (
          <InitialPasswordModal
            email={initialPassword.email}
            password={initialPassword.password}
            onClose={handleClosePasswordModal}
          />
        )}
      </div>
    </div>
  )
}
