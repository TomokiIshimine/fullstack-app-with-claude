import { useState, type FormEvent } from 'react'
import type { UserCreateRequest, UserCreateResponse } from '@/types/user'
import { ApiError } from '@/lib/api/client'
import { logger } from '@/lib/logger'

interface UserCreateFormProps {
  onCreate: (payload: UserCreateRequest) => Promise<UserCreateResponse>
  onCancel: () => void
}

export function UserCreateForm({ onCreate, onCancel }: UserCreateFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!email || !name) {
      setError('メールアドレスと名前を入力してください')
      return
    }

    if (name.length > 100) {
      setError('名前は100文字以内で入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      await onCreate({ email, name })
      // Reset form
      setEmail('')
      setName('')
    } catch (err) {
      logger.error('Failed to create user', err as Error)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('ユーザーの作成に失敗しました')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="user-create-form">
      <h3 className="user-create-form__title">新規ユーザー追加</h3>
      <form onSubmit={handleSubmit} className="user-create-form__form">
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">メールアドレス *</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            disabled={isSubmitting}
          />
        </div>
        <div className="form-group">
          <label htmlFor="name">名前 *</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="山田太郎"
            maxLength={100}
            disabled={isSubmitting}
          />
        </div>
        <div className="user-create-form__buttons">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="user-create-form__button user-create-form__button--cancel"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="user-create-form__button user-create-form__button--submit"
          >
            {isSubmitting ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
    </div>
  )
}
