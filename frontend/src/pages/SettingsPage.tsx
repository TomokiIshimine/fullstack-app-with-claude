import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { ProfileUpdateForm } from '@/components/settings/ProfileUpdateForm'
import { Alert } from '@/components/ui'
import { logger } from '@/lib/logger'
import { getHomePathForRole } from '@/lib/utils/routing'
import type { User } from '@/types/auth'

export function SettingsPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    logger.info('Settings success message displayed', { message })
    setTimeout(() => {
      setSuccessMessage(null)
    }, 5000)
  }

  const handleBack = () => {
    const backPath = getHomePathForRole(user?.role)
    logger.info('Navigating back from settings', { role: user?.role, path: backPath })
    navigate(backPath)
  }

  const handleProfileUpdate = (updatedUser: User) => {
    updateUser(updatedUser)
    handleSuccess('プロフィールを更新しました')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          title="設定"
          user={user ? { name: user.name, email: user.email } : undefined}
          onBack={user?.role === 'admin' ? handleBack : undefined}
          showLogout={true}
        />

        {successMessage && (
          <div className="mb-6">
            <Alert variant="success" autoCloseMs={5000} onDismiss={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          </div>
        )}

        <div className="space-y-6">
          <ProfileUpdateForm user={user} onSuccess={handleProfileUpdate} />
          <PasswordChangeForm onSuccess={() => handleSuccess('パスワードを変更しました')} />
        </div>
      </div>
    </div>
  )
}
