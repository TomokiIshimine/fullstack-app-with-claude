import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { ProfileUpdateForm } from '@/components/settings/ProfileUpdateForm'
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
    <div className="settings-page">
      <div className="settings-page__content">
        <PageHeader
          title="設定"
          onBack={user?.role === 'admin' ? handleBack : undefined}
          showLogout={true}
        />

        {successMessage && (
          <div className="settings-page__success" role="alert">
            {successMessage}
          </div>
        )}

        <div className="settings-page__body">
          <ProfileUpdateForm user={user} onSuccess={handleProfileUpdate} />
          <PasswordChangeForm onSuccess={() => handleSuccess('パスワードを変更しました')} />
        </div>
      </div>
    </div>
  )
}
