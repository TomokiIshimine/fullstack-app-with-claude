import { useState, type FormEvent } from 'react'
import type { UserCreateRequest, UserCreateResponse } from '@/types/user'
import { ApiError } from '@/lib/api/client'
import { createUser as createUserApi } from '@/lib/api/users'
import { logger } from '@/lib/logger'
import { Input, Button, Alert } from '@/components/ui'

interface UserCreateFormProps {
  onCreate?: (payload: UserCreateRequest) => Promise<UserCreateResponse>
  onSuccess?: (response: UserCreateResponse) => void
  onCancel: () => void
}

export function UserCreateForm({ onCreate, onSuccess, onCancel }: UserCreateFormProps) {
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
      const createUser = onCreate ?? createUserApi
      const response = await createUser({ email, name })
      setError(null)
      // Reset form
      setEmail('')
      setName('')
      onSuccess?.(response)
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
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-2xl font-semibold text-gray-900 mb-6">新規ユーザー追加</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Input
          id="email"
          label="メールアドレス"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="user@example.com"
          disabled={isSubmitting}
          fullWidth
        />
        <Input
          id="name"
          label="名前"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="山田太郎"
          maxLength={100}
          disabled={isSubmitting}
          fullWidth
        />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" onClick={onCancel} disabled={isSubmitting} variant="secondary">
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
            {isSubmitting ? '作成中...' : '作成'}
          </Button>
        </div>
      </form>
    </div>
  )
}
