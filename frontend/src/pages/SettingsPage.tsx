import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { logger } from '@/lib/logger'

export function SettingsPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSuccess = () => {
    setShowSuccessMessage(true)
    logger.info('Password change success message displayed')
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false)
    }, 5000)
  }

  const handleBack = () => {
    const backPath = user?.role === 'admin' ? '/admin/users' : '/todos'
    logger.info('Navigating back from settings', { role: user?.role, path: backPath })
    navigate(backPath)
  }

  return (
    <div className="settings-page">
      <div className="settings-page__content">
        <PageHeader title="設定" onBack={handleBack} showLogout={true} />

        {showSuccessMessage && (
          <div className="settings-page__success" role="alert">
            パスワードを変更しました
          </div>
        )}

        <div className="settings-page__body">
          <PasswordChangeForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
