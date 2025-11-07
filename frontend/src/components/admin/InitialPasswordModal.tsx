import { useState } from 'react'
import { logger } from '@/lib/logger'

interface InitialPasswordModalProps {
  email: string
  password: string
  onClose: () => void
}

export function InitialPasswordModal({ email, password, onClose }: InitialPasswordModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      logger.info('Initial password copied to clipboard')
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logger.error('Failed to copy password', err as Error)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="initial-password-modal">
          <h2 className="initial-password-modal__title">ユーザーを作成しました</h2>
          <p className="initial-password-modal__email">
            <strong>メールアドレス:</strong> {email}
          </p>
          <div className="initial-password-modal__password-section">
            <label className="initial-password-modal__label">初期パスワード:</label>
            <div className="initial-password-modal__password">{password}</div>
            <button
              onClick={handleCopy}
              className="initial-password-modal__copy-button"
              disabled={copied}
            >
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
          <div className="initial-password-modal__warning">
            <p>
              <strong>重要:</strong>
              このパスワードをユーザーに伝えてください。
            </p>
            <p>この画面を閉じると再表示できません。</p>
          </div>
          <button onClick={onClose} className="initial-password-modal__close-button">
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
