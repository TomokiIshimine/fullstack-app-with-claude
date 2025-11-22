import { useState } from 'react'
import type { FormEvent } from 'react'
import { changePassword } from '@/lib/api/password'
import { logger } from '@/lib/logger'
import { ApiError } from "@/lib/api/client";

interface PasswordChangeFormProps {
  onSuccess: () => void
}

export function PasswordChangeForm({ onSuccess }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('すべてのフィールドを入力してください')
      return
    }

    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上で入力してください')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません')
      return
    }

    if (currentPassword === newPassword) {
      setError('現在のパスワードと同じパスワードは使用できません')
      return
    }

    setIsSubmitting(true)

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      logger.info('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onSuccess()
    } catch (err) {
      logger.error('Failed to change password', err as Error)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('パスワードの変更に失敗しました')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="password-change-form">
      <h2 className="password-change-form__title">パスワード変更</h2>
      <form
        onSubmit={handleSubmit}
        className="password-change-form__form"
        aria-label="パスワード変更フォーム"
      >
        {error && (
          <div className="password-change-form__error" role="alert">
            {error}
          </div>
        )}

        <div className="password-change-form__field">
          <label htmlFor="current-password" className="password-change-form__label">
            現在のパスワード
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            disabled={isSubmitting}
            className="password-change-form__input"
            autoComplete="current-password"
          />
        </div>

        <div className="password-change-form__field">
          <label htmlFor="new-password" className="password-change-form__label">
            新しいパスワード
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            disabled={isSubmitting}
            className="password-change-form__input"
            autoComplete="new-password"
          />
          <p className="password-change-form__hint">8文字以上で入力してください</p>
        </div>

        <div className="password-change-form__field">
          <label htmlFor="confirm-password" className="password-change-form__label">
            新しいパスワード（確認）
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            className="password-change-form__input"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="password-change-form__submit-button"
        >
          {isSubmitting ? '変更中...' : 'パスワードを変更'}
        </button>
      </form>
    </div>
  )
}
