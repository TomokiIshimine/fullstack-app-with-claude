import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@/types/auth'
import { updateProfile } from '@/lib/api/profile'
import { ApiError } from '@/lib/api/client'
import { logger } from '@/lib/logger'

interface ProfileUpdateFormProps {
  user: User | null
  onSuccess: (user: User) => void
}

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function ProfileUpdateForm({ user, onSuccess }: ProfileUpdateFormProps) {
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEmail(user?.email ?? '')
    setName(user?.name ?? '')
  }, [user?.email, user?.name])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('ユーザー情報を取得できませんでした')
      return
    }

    if (!email.trim() || !name.trim()) {
      setError('名前とメールアドレスを入力してください')
      return
    }

    if (!emailPattern.test(email.trim())) {
      setError('メールアドレスの形式が正しくありません')
      return
    }

    setIsSubmitting(true)

    try {
      const updatedUser = await updateProfile({ email: email.trim(), name: name.trim() })
      logger.info('Profile updated successfully', {
        userId: updatedUser.id,
        email: updatedUser.email,
      })
      onSuccess(updatedUser)
    } catch (err) {
      logger.error('Failed to update profile', err as Error)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('プロフィールの更新に失敗しました')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="profile-update-form">
      <h2 className="profile-update-form__title">プロフィール</h2>
      <form
        className="profile-update-form__form"
        onSubmit={handleSubmit}
        aria-label="プロフィール更新フォーム"
      >
        {error && (
          <div className="profile-update-form__error" role="alert">
            {error}
          </div>
        )}

        <div className="profile-update-form__field">
          <label htmlFor="profile-name" className="profile-update-form__label">
            名前
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isSubmitting}
            className="profile-update-form__input"
            autoComplete="name"
          />
        </div>

        <div className="profile-update-form__field">
          <label htmlFor="profile-email" className="profile-update-form__label">
            メールアドレス
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="profile-update-form__input"
            autoComplete="email"
          />
          <p className="profile-update-form__hint">ログインに使用するメールアドレスを設定します</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="profile-update-form__submit-button"
        >
          {isSubmitting ? '保存中...' : '変更を保存'}
        </button>
      </form>
    </div>
  )
}
