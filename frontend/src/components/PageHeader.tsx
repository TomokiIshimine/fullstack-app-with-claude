import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { useVersion } from '@/hooks/useVersion'

interface PageHeaderProps {
  title: string
  userEmail?: string
  onBack?: () => void
  showSettings?: boolean
  showLogout?: boolean
}

/**
 * 共通ページヘッダーコンポーネント
 *
 * 全ページで統一されたヘッダーUIを提供します。
 * - タイトル表示
 * - ユーザーメール表示（オプション）
 * - 戻るボタン（オプション）
 * - 設定ボタン（オプション）
 * - ログアウトボタン（オプション）
 */
export function PageHeader({
  title,
  userEmail,
  onBack,
  showSettings = false,
  showLogout = false,
}: PageHeaderProps) {
  const navigate = useNavigate()
  const { handleLogout } = useLogout()
  const { version, isLoading } = useVersion()

  return (
    <div className="page-header">
      {onBack && (
        <button type="button" onClick={onBack} className="page-header__back" aria-label="戻る">
          ← 戻る
        </button>
      )}
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__actions">
        {!isLoading && version && <span className="page-header__version">{version}</span>}
        {userEmail && <span className="page-header__user-email">{userEmail}</span>}
        {showSettings && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="page-header__settings"
            aria-label="設定"
          >
            設定
          </button>
        )}
        {showLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="page-header__logout"
            aria-label="ログアウト"
          >
            ログアウト
          </button>
        )}
      </div>
    </div>
  )
}
