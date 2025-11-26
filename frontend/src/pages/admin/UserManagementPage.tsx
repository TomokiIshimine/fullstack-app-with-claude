import { useState } from 'react'
import { UserList } from '@/components/admin/UserList'
import { UserCreateForm } from '@/components/admin/UserCreateForm'
import { InitialPasswordModal } from '@/components/admin/InitialPasswordModal'
import { Alert, Button } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { useUserManagement } from '@/hooks/useUserManagement'
import { useAuth } from '@/contexts/AuthContext'

export function UserManagementPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { user } = useAuth()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="ユーザー管理"
          user={user ? { name: user.name, email: user.email } : undefined}
          showSettings={true}
          showLogout={true}
        />

        {error && (
          <div className="mb-6">
            <Alert
              variant="error"
              onRetry={() => {
                clearError()
                void loadUsers()
              }}
              onDismiss={clearError}
            >
              {error}
            </Alert>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600 text-lg">読み込み中...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {!showCreateForm && (
              <div className="flex justify-end">
                <Button onClick={() => setShowCreateForm(true)}>+ 新規ユーザー追加</Button>
              </div>
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
