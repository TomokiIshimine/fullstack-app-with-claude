import { useState } from 'react'
import type { FormEvent } from 'react'
import { changePassword } from '@/lib/api/password'
import { logger } from '@/lib/logger'
import { ApiError } from '@/lib/api/client'
import { Input, Button, Alert } from '@/components/ui'

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
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">パスワード変更</h2>
      <form onSubmit={handleSubmit} className="space-y-4" aria-label="パスワード変更フォーム">
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Input
          id="current-password"
          label="現在のパスワード"
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          disabled={isSubmitting}
          autoComplete="current-password"
          fullWidth
        />

        <Input
          id="new-password"
          label="新しいパスワード"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          disabled={isSubmitting}
          autoComplete="new-password"
          helperText="8文字以上で入力してください"
          fullWidth
        />

        <Input
          id="confirm-password"
          label="新しいパスワード（確認）"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={isSubmitting}
          autoComplete="new-password"
          fullWidth
        />

        <Button type="submit" disabled={isSubmitting} loading={isSubmitting} fullWidth>
          {isSubmitting ? '変更中...' : 'パスワードを変更'}
        </Button>
      </form>
    </div>
  )
}
