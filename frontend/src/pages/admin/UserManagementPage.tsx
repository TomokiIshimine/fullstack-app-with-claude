import { useState } from 'react'
import { UserList } from '@/components/admin/UserList'
import { UserCreateForm } from '@/components/admin/UserCreateForm'
import { InitialPasswordModal } from '@/components/admin/InitialPasswordModal'
import { ErrorMessage } from '@/components/ErrorMessage'
import { PageHeader } from '@/components/PageHeader'
import { useUserManagement } from '@/hooks/useUserManagement'

export function UserManagementPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const {
    users,
    isLoading,
    error,
    initialPassword,
    clearError,
    createUser,
    deleteUser,
    loadUsers,
    resetInitialPassword,
  } = useUserManagement()

  return (
    <div className="user-management-page">
      <div className="user-management-page__content">
        <PageHeader title="ユーザー管理" showSettings={true} showLogout={true} />

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
                onCreate={createUser}
                onSuccess={() => {
                  setShowCreateForm(false)
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            <UserList users={users} onDeleteUser={deleteUser} />
          </div>
        )}

        {initialPassword && (
          <InitialPasswordModal
            email={initialPassword.email}
            password={initialPassword.password}
            onClose={resetInitialPassword}
          />
        )}
      </div>
    </div>
  )
}
