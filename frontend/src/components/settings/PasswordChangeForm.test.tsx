import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordChangeForm } from './PasswordChangeForm'
import * as passwordApi from '@/lib/api/password'

describe('PasswordChangeForm', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    mockOnSuccess.mockClear()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード（確認）')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'パスワードを変更' })).toBeInTheDocument()
    })

    it('should show password hint', () => {
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      expect(screen.getByText('8文字以上で入力してください')).toBeInTheDocument()
    })

    it('should have password type inputs', () => {
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      const currentPassword = screen.getByLabelText('現在のパスワード')
      const newPassword = screen.getByLabelText('新しいパスワード')
      const confirmPassword = screen.getByLabelText('新しいパスワード（確認）')

      expect(currentPassword).toHaveAttribute('type', 'password')
      expect(newPassword).toHaveAttribute('type', 'password')
      expect(confirmPassword).toHaveAttribute('type', 'password')
    })
  })

  describe('User Input', () => {
    it('should allow typing in all password fields', async () => {
      const user = userEvent.setup()
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      const currentPassword = screen.getByLabelText('現在のパスワード') as HTMLInputElement
      const newPassword = screen.getByLabelText('新しいパスワード') as HTMLInputElement
      const confirmPassword = screen.getByLabelText('新しいパスワード（確認）') as HTMLInputElement

      await user.type(currentPassword, 'oldpassword123')
      await user.type(newPassword, 'newpassword123')
      await user.type(confirmPassword, 'newpassword123')

      expect(currentPassword.value).toBe('oldpassword123')
      expect(newPassword.value).toBe('newpassword123')
      expect(confirmPassword.value).toBe('newpassword123')
    })
  })

  describe('Validation', () => {
    it('should show error when all fields are empty', async () => {
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('すべてのフィールドを入力してください')
      })
    })

    it('should show error when new password is less than 8 characters', async () => {
      const user = userEvent.setup()
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'short')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'short')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          '新しいパスワードは8文字以上で入力してください'
        )
      })
    })

    it('should show error when new passwords do not match', async () => {
      const user = userEvent.setup()
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'newpassword123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'differentpass123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          '新しいパスワードと確認用パスワードが一致しません'
        )
      })
    })

    it('should show error when new password is same as current password', async () => {
      const user = userEvent.setup()
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'samepassword123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'samepassword123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'samepassword123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          '現在のパスワードと同じパスワードは使用できません'
        )
      })
    })
  })

  describe('Form Submission', () => {
    it('should call changePassword API with correct data', async () => {
      const user = userEvent.setup()
      const changePasswordSpy = vi.spyOn(passwordApi, 'changePassword').mockResolvedValue({
        message: 'パスワードを変更しました',
      })

      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'newpass123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'newpass123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(changePasswordSpy).toHaveBeenCalledWith({
          current_password: 'oldpass123',
          new_password: 'newpass123',
        })
      })
    })

    it('should call onSuccess after successful password change', async () => {
      const user = userEvent.setup()
      vi.spyOn(passwordApi, 'changePassword').mockResolvedValue({
        message: 'パスワードを変更しました',
      })

      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'newpass123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'newpass123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      vi.spyOn(passwordApi, 'changePassword').mockResolvedValue({
        message: 'パスワードを変更しました',
      })

      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      const currentPassword = screen.getByLabelText('現在のパスワード') as HTMLInputElement
      const newPassword = screen.getByLabelText('新しいパスワード') as HTMLInputElement
      const confirmPassword = screen.getByLabelText('新しいパスワード（確認）') as HTMLInputElement

      await user.type(currentPassword, 'oldpass123')
      await user.type(newPassword, 'newpass123')
      await user.type(confirmPassword, 'newpass123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(currentPassword.value).toBe('')
        expect(newPassword.value).toBe('')
        expect(confirmPassword.value).toBe('')
      })
    })

    it('should disable form during submission', async () => {
      const user = userEvent.setup()
      let resolveChange: () => void
      const changePromise = new Promise<{ message: string }>(resolve => {
        resolveChange = () => resolve({ message: 'パスワードを変更しました' })
      })
      vi.spyOn(passwordApi, 'changePassword').mockReturnValue(changePromise)

      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'newpass123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'newpass123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '変更中...' })).toBeDisabled()
        expect(screen.getByLabelText('現在のパスワード')).toBeDisabled()
        expect(screen.getByLabelText('新しいパスワード')).toBeDisabled()
        expect(screen.getByLabelText('新しいパスワード（確認）')).toBeDisabled()
      })

      resolveChange!()
    })

    it('should show error message on API error', async () => {
      const user = userEvent.setup()
      const apiError = new Error('現在のパスワードが間違っています')
      vi.spyOn(passwordApi, 'changePassword').mockRejectedValue(apiError)

      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      await user.type(screen.getByLabelText('現在のパスワード'), 'wrongpass')
      await user.type(screen.getByLabelText('新しいパスワード'), 'newpass123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'newpass123')

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('パスワードの変更に失敗しました')
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })

    it('should clear previous error on new submission', async () => {
      const user = userEvent.setup()
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      // First submission - empty form (error)
      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      // Fill form and submit again
      vi.spyOn(passwordApi, 'changePassword').mockResolvedValue({
        message: 'パスワードを変更しました',
      })

      await user.type(screen.getByLabelText('現在のパスワード'), 'oldpass123')
      await user.type(screen.getByLabelText('新しいパスワード'), 'newpass123')
      await user.type(screen.getByLabelText('新しいパスワード（確認）'), 'newpass123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper autocomplete attributes', () => {
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      expect(screen.getByLabelText('現在のパスワード')).toHaveAttribute(
        'autocomplete',
        'current-password'
      )
      expect(screen.getByLabelText('新しいパスワード')).toHaveAttribute(
        'autocomplete',
        'new-password'
      )
      expect(screen.getByLabelText('新しいパスワード（確認）')).toHaveAttribute(
        'autocomplete',
        'new-password'
      )
    })

    it('should have error message with alert role', async () => {
      render(<PasswordChangeForm onSuccess={mockOnSuccess} />)

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })
})
