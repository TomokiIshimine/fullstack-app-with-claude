import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserList } from './UserList'
import type { UserResponse } from '@/types/user'
import * as usersApi from '@/lib/api/users'
import { ApiError } from '@/lib/api/client'

describe('UserList', () => {
  const mockOnDeleteUser = vi.fn<(user: UserResponse) => Promise<void>>()

  const mockUsers: UserResponse[] = [
    {
      id: 1,
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      created_at: '2025-11-01T00:00:00Z',
    },
    {
      id: 2,
      email: 'user1@example.com',
      name: 'User One',
      role: 'user',
      created_at: '2025-11-02T00:00:00Z',
    },
    {
      id: 3,
      email: 'user2@example.com',
      name: null,
      role: 'user',
      created_at: '2025-11-03T00:00:00Z',
    },
  ]

  beforeEach(() => {
    mockOnDeleteUser.mockReset()
    mockOnDeleteUser.mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should display user list with all users', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('user1@example.com')).toBeInTheDocument()
      expect(screen.getByText('User One')).toBeInTheDocument()
      expect(screen.getByText('user2@example.com')).toBeInTheDocument()
    })

    it('should display empty message when no users', () => {
      render(<UserList users={[]} onDeleteUser={mockOnDeleteUser} />)

      expect(screen.getByText('ユーザーが登録されていません')).toBeInTheDocument()
    })

    it('should display "-" for null name', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const rows = screen.getAllByRole('row')
      const user2Row = rows.find(row => row.textContent?.includes('user2@example.com'))

      expect(user2Row).toBeInTheDocument()
      expect(user2Row?.textContent).toContain('-')
    })

    it('should display role labels correctly', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      expect(screen.getByText('管理者')).toBeInTheDocument()
      expect(screen.getAllByText('ユーザー')).toHaveLength(2)
    })

    it('should format dates correctly', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      expect(screen.getByText('2025/11/1')).toBeInTheDocument()
      expect(screen.getByText('2025/11/2')).toBeInTheDocument()
      expect(screen.getByText('2025/11/3')).toBeInTheDocument()
    })
  })

  describe('Delete Button Visibility', () => {
    it('should not show delete button for admin user', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.queryAllByRole('button', { name: /削除/ })

      // Only 2 delete buttons for 2 regular users
      expect(deleteButtons).toHaveLength(2)
    })

    it('should show "-" for admin user instead of delete button', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const rows = screen.getAllByRole('row')
      const adminRow = rows.find(row => row.textContent?.includes('admin@example.com'))

      expect(adminRow).toBeInTheDocument()
      expect(adminRow?.textContent).toContain('-')
    })

    it('should show delete button for regular users', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: /削除/ })

      expect(deleteButtons).toHaveLength(2)
    })
  })

  describe('Delete Functionality', () => {
    it('should show confirmation dialog when delete button is clicked', async () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(screen.getByText('ユーザー削除の確認')).toBeInTheDocument()
      expect(screen.getByText('この操作は取り消せません。')).toBeInTheDocument()

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent('user1@example.com')
    })

    it('should not delete user if confirmation is cancelled', async () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(mockOnDeleteUser).not.toHaveBeenCalled()
    })

    it('should delete user successfully when confirmed', async () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getAllByRole('button', { name: '削除' }).find(btn => {
        return btn.closest('[role="dialog"]') !== null
      })
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        expect(mockOnDeleteUser).toHaveBeenCalledWith(mockUsers[1])
      })
    })

    it('should show deleting state during deletion', async () => {
      let resolveDelete: () => void
      const deletePromise = new Promise<void>(resolve => {
        resolveDelete = resolve
      })
      mockOnDeleteUser.mockReturnValue(deletePromise)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getAllByRole('button', { name: '削除' }).find(btn => {
        return btn.closest('[role="dialog"]') !== null
      })
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        expect(screen.getByText('削除中...')).toBeInTheDocument()
      })

      resolveDelete!()
    })

    it('should disable delete button during deletion', async () => {
      let resolveDelete: () => void
      const deletePromise = new Promise<void>(resolve => {
        resolveDelete = resolve
      })
      mockOnDeleteUser.mockReturnValue(deletePromise)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getAllByRole('button', { name: '削除' }).find(btn => {
        return btn.closest('[role="dialog"]') !== null
      })
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        const deletingButton = screen.getByRole('button', { name: '削除中...' })
        expect(deletingButton).toBeDisabled()
      })

      resolveDelete!()
    })

    it('should show error alert on deletion failure', async () => {
      const error = new Error('Network error')
      mockOnDeleteUser.mockRejectedValue(error)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getAllByRole('button', { name: '削除' }).find(btn => {
        return btn.closest('[role="dialog"]') !== null
      })
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('ユーザーの削除に失敗しました')
        expect(mockOnDeleteUser).toHaveBeenCalledWith(mockUsers[1])
      })
    })

    it('should show API error message on deletion failure with ApiError', async () => {
      const apiError = new ApiError(403, 'Admin user cannot be deleted', {})
      mockOnDeleteUser.mockRejectedValue(apiError)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getAllByRole('button', { name: '削除' }).find(btn => {
        return btn.closest('[role="dialog"]') !== null
      })
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Admin user cannot be deleted')
        expect(mockOnDeleteUser).toHaveBeenCalledWith(mockUsers[1])
      })
    })

    it('should call deleteUserApi when onDeleteUser is not provided', async () => {
      const deleteUserSpy = vi.spyOn(usersApi, 'deleteUser').mockResolvedValue()

      render(<UserList users={mockUsers} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getAllByRole('button', { name: '削除' }).find(btn => {
        return btn.closest('[role="dialog"]') !== null
      })
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        expect(deleteUserSpy).toHaveBeenCalledWith(2)
      })
    })
  })

  describe('Table Structure', () => {
    it('should have correct table headers', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      expect(screen.getByText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByText('名前')).toBeInTheDocument()
      expect(screen.getByText('ロール')).toBeInTheDocument()
      expect(screen.getByText('作成日')).toBeInTheDocument()
      expect(screen.getByText('操作')).toBeInTheDocument()
    })

    it('should have correct number of rows', () => {
      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const rows = screen.getAllByRole('row')

      // 1 header row + 3 user rows
      expect(rows).toHaveLength(4)
    })
  })

  describe('Role Badge Styling', () => {
    it('should apply correct background colors to role badges', () => {
      const { container } = render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      // Admin role badge should have purple background
      const adminBadge = container.querySelector('.bg-purple-100.text-purple-800')
      expect(adminBadge).toBeInTheDocument()
      expect(adminBadge?.textContent).toBe('管理者')

      // User role badges should have blue background
      const userBadges = container.querySelectorAll('.bg-blue-100.text-blue-800')
      expect(userBadges).toHaveLength(2)
    })
  })
})
