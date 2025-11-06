import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { logger } from '@/lib/logger'

export function SettingsPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleSuccess = () => {
    setShowSuccessMessage(true)
    logger.info('Password change success message displayed')
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false)
    }, 5000)
  }

  const handleLogout = async () => {
    try {
      await logout()
      logger.info('Logout successful from settings page, redirecting to login')
      navigate('/login')
    } catch (error) {
      logger.error('Logout error', error as Error)
      navigate('/login')
    }
  }

  const handleBack = () => {
    const backPath = user?.role === 'admin' ? '/admin/users' : '/todos'
    logger.info('Navigating back from settings', { role: user?.role, path: backPath })
    navigate(backPath)
  }

  return (
    <div className="settings-page">
      <div className="settings-page__content">
        <div className="settings-page__header">
          <button onClick={handleBack} className="settings-page__back-button">
            ← 戻る
          </button>
          <h1 className="settings-page__title">設定</h1>
          <button onClick={handleLogout} className="settings-page__logout">
            ログアウト
          </button>
        </div>

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
