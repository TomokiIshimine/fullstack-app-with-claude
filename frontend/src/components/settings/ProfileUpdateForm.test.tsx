import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileUpdateForm } from './ProfileUpdateForm'
import * as profileApi from '@/lib/api/profile'
import type { User } from '@/types/auth'
import { ApiError } from '@/lib/api/client'

const mockUser: User = {
  id: 1,
  email: 'user@example.com',
  role: 'user',
  name: 'Current User',
}

describe('ProfileUpdateForm', () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('現在のユーザー情報を表示する', () => {
    render(<ProfileUpdateForm user={mockUser} onSuccess={onSuccess} />)

    expect(screen.getByLabelText('名前')).toHaveValue('Current User')
    expect(screen.getByLabelText('メールアドレス')).toHaveValue('user@example.com')
  })

  it('空の入力ではバリデーションエラーを表示する', async () => {
    const user = userEvent.setup()
    render(<ProfileUpdateForm user={mockUser} onSuccess={onSuccess} />)

    await user.clear(screen.getByLabelText('名前'))
    await user.clear(screen.getByLabelText('メールアドレス'))
    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('名前とメールアドレスを入力してください')
    })
  })

  it('不正なメール形式では送信しない', async () => {
    const user = userEvent.setup()
    render(<ProfileUpdateForm user={mockUser} onSuccess={onSuccess} />)

    await user.clear(screen.getByLabelText('メールアドレス'))
    await user.type(screen.getByLabelText('メールアドレス'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('メールアドレスの形式が正しくありません')
    })
  })

  it('更新に成功するとAPIレスポンスを渡してonSuccessを呼び出す', async () => {
    const user = userEvent.setup()
    const apiSpy = vi.spyOn(profileApi, 'updateProfile').mockResolvedValue({
      id: 1,
      email: 'updated@example.com',
      role: 'user',
      name: 'Updated User',
    })

    render(<ProfileUpdateForm user={mockUser} onSuccess={onSuccess} />)

    await user.clear(screen.getByLabelText('名前'))
    await user.type(screen.getByLabelText('名前'), 'Updated User')
    await user.clear(screen.getByLabelText('メールアドレス'))
    await user.type(screen.getByLabelText('メールアドレス'), 'updated@example.com')
    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith({ email: 'updated@example.com', name: 'Updated User' })
      expect(onSuccess).toHaveBeenCalledWith({
        id: 1,
        email: 'updated@example.com',
        role: 'user',
        name: 'Updated User',
      })
    })
  })

  it('APIエラーの場合にメッセージを表示する', async () => {
    const user = userEvent.setup()
    vi.spyOn(profileApi, 'updateProfile').mockRejectedValue(
      new ApiError(409, 'メールアドレスが重複しています')
    )

    render(<ProfileUpdateForm user={mockUser} onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: '変更を保存' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('メールアドレスが重複しています')
    })
  })
})
