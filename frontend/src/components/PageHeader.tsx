import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { useVersion } from '@/hooks/useVersion'

interface PageHeaderProps {
  title: string
  user?: { name?: string | null; email: string }
  onBack?: () => void
  showSettings?: boolean
  showLogout?: boolean
}

/**
 * 共通ページヘッダーコンポーネント
 *
 * 全ページで統一されたヘッダーUIを提供します。
 * - タイトル表示
 * - 戻るボタン（オプション）
 * - 右上ハンバーガーメニュー
 *   - バージョン情報
 *   - ユーザー情報（名前優先、なければメール）
 *   - 設定ボタン（オプション）
 *   - ログアウトボタン（オプション）
 */
export function PageHeader({
  title,
  user,
  onBack,
  showSettings = false,
  showLogout = false,
}: PageHeaderProps) {
  const navigate = useNavigate()
  const { handleLogout } = useLogout()
  const { version, isLoading } = useVersion()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 外部クリックとEscapeキーでメニューを閉じる
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const displayName = user?.name || user?.email

  return (
    <div className="page-header">
      {onBack && (
        <button type="button" onClick={onBack} className="page-header__back" aria-label="戻る">
          ← 戻る
        </button>
      )}
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__menu-container" ref={menuRef}>
        <button
          type="button"
          className="page-header__menu-button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label="メニューを開く"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {isMenuOpen && (
          <div className="page-header__dropdown" role="menu">
            <div className="page-header__dropdown-info">
              {!isLoading && version && (
                <div className="page-header__dropdown-version">{version}</div>
              )}
              {displayName && <div className="page-header__dropdown-name">{displayName}</div>}
            </div>
            {showSettings && (
              <button
                type="button"
                role="menuitem"
                className="page-header__dropdown-button"
                onClick={() => {
                  navigate('/settings')
                  setIsMenuOpen(false)
                }}
              >
                設定
              </button>
            )}
            {showLogout && (
              <button
                type="button"
                role="menuitem"
                className="page-header__dropdown-button page-header__dropdown-button--danger"
                onClick={() => {
                  handleLogout()
                  setIsMenuOpen(false)
                }}
              >
                ログアウト
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
