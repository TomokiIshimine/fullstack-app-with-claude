import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserCreateForm } from './UserCreateForm'
import * as usersApi from '@/lib/api/users'
import type { UserCreateRequest, UserCreateResponse } from '@/types/user'

describe('UserCreateForm', () => {
  const mockOnCreate = vi.fn<[payload: UserCreateRequest], Promise<UserCreateResponse>>()
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    mockOnCreate.mockReset()
    mockOnSuccess.mockClear()
    mockOnCancel.mockClear()
  })

  describe('Rendering', () => {
    it('should render form with all fields', () => {
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('山田太郎')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument()
    })

    it('should have correct placeholders', () => {
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('山田太郎')).toBeInTheDocument()
    })
  })

  describe('User Input', () => {
    it('should allow typing in email field', async () => {
      const user = userEvent.setup()
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const emailInput = screen.getByPlaceholderText('user@example.com') as HTMLInputElement
      await user.type(emailInput, 'test@example.com')

      expect(emailInput.value).toBe('test@example.com')
    })

    it('should allow typing in name field', async () => {
      const user = userEvent.setup()
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const nameInput = screen.getByPlaceholderText('山田太郎') as HTMLInputElement
      await user.type(nameInput, 'テストユーザー')

      expect(nameInput.value).toBe('テストユーザー')
    })

    it('should enforce maxLength on name field', () => {
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const nameInput = screen.getByPlaceholderText('山田太郎') as HTMLInputElement

      expect(nameInput).toHaveAttribute('maxLength', '100')
    })
  })

  describe('Validation', () => {
    it('should show error when email is empty', async () => {
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'メールアドレスと名前を入力してください'
        )
      })
    })

    it('should show error when name is empty', async () => {
      const user = userEvent.setup()
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const emailInput = screen.getByPlaceholderText('user@example.com')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'メールアドレスと名前を入力してください'
        )
      })
    })

    it('should show error when name exceeds 100 characters', async () => {
      const user = userEvent.setup()
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const emailInput = screen.getByPlaceholderText('user@example.com')
      const nameInput = screen.getByPlaceholderText('山田太郎')

      await user.type(emailInput, 'test@example.com')
      // Set a 101-character name (bypassing maxLength)
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } })

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('名前は100文字以内で入力してください')
      })
    })
  })

  describe('Form Submission', () => {
    it('should call createUser API with correct data', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockResolvedValue({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          created_at: '2025-11-07T00:00:00Z',
        },
        initial_password: 'test123456',
      })

      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      await user.type(screen.getByPlaceholderText('user@example.com'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('山田太郎'), 'Test User')

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'Test User',
        })
      })
    })

    it('should call onSuccess with response on successful submission', async () => {
      const user = userEvent.setup()
      const mockResponse: UserCreateResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          created_at: '2025-11-07T00:00:00Z',
        },
        initial_password: 'test123456',
      }
      mockOnCreate.mockResolvedValue(mockResponse)

      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      await user.type(screen.getByPlaceholderText('user@example.com'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('山田太郎'), 'Test User')

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse)
      })
    })

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup()
      mockOnCreate.mockResolvedValue({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          created_at: '2025-11-07T00:00:00Z',
        },
        initial_password: 'test123456',
      })

      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const emailInput = screen.getByPlaceholderText('user@example.com') as HTMLInputElement
      const nameInput = screen.getByPlaceholderText('山田太郎') as HTMLInputElement

      await user.type(emailInput, 'test@example.com')
      await user.type(nameInput, 'Test User')

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(emailInput.value).toBe('')
        expect(nameInput.value).toBe('')
      })
    })

    it('should disable form during submission', async () => {
      const user = userEvent.setup()
      let resolveCreate: (value: UserCreateResponse) => void
      const createPromise = new Promise<UserCreateResponse>(resolve => {
        resolveCreate = resolve
      })
      vi.spyOn(usersApi, 'createUser').mockReturnValue(createPromise)
      mockOnCreate.mockReturnValue(createPromise)

      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      await user.type(screen.getByPlaceholderText('user@example.com'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('山田太郎'), 'Test User')

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '作成中...' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
        expect(screen.getByPlaceholderText('user@example.com')).toBeDisabled()
        expect(screen.getByPlaceholderText('山田太郎')).toBeDisabled()
      })

      resolveCreate!({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          created_at: '2025-11-07T00:00:00Z',
        },
        initial_password: 'test123456',
      })
    })

    it('should show error message on API error', async () => {
      const user = userEvent.setup()
      const apiError = new Error('Email already exists')
      mockOnCreate.mockRejectedValue(apiError)

      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      await user.type(screen.getByPlaceholderText('user@example.com'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('山田太郎'), 'Test User')

      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('ユーザーの作成に失敗しました')
      })
    })

    it('should clear previous error on successful submission', async () => {
      const user = userEvent.setup()
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      // First submission - empty form (error)
      const submitButton = screen.getByRole('button', { name: '作成' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      // Fill form and submit again
      mockOnCreate.mockResolvedValue({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          created_at: '2025-11-07T00:00:00Z',
        },
        initial_password: 'test123456',
      })

      await user.type(screen.getByPlaceholderText('user@example.com'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('山田太郎'), 'Test User')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cancel Button', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <UserCreateForm onCreate={mockOnCreate} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      )

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })
})
