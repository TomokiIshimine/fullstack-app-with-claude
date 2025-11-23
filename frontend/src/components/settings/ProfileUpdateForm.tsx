import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@/types/auth'
import { updateProfile } from '@/lib/api/profile'
import { ApiError } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { Input, Button, Alert } from '@/components/ui'

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
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">プロフィール</h2>
      <form className="space-y-4" onSubmit={handleSubmit} aria-label="プロフィール更新フォーム">
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Input
          id="profile-name"
          label="名前"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isSubmitting}
          autoComplete="name"
          fullWidth
        />

        <Input
          id="profile-email"
          label="メールアドレス"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isSubmitting}
          autoComplete="email"
          helperText="ログインに使用するメールアドレスを設定します"
          fullWidth
        />

        <Button type="submit" disabled={isSubmitting} loading={isSubmitting} fullWidth>
          {isSubmitting ? '保存中...' : '変更を保存'}
        </Button>
      </form>
    </div>
  )
}
