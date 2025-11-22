import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserList } from './UserList'
import type { UserResponse } from '@/types/user'
import * as usersApi from '@/lib/api/users'
import { ApiError } from '@/lib/api/client'

describe('UserList', () => {
  const mockOnDeleteUser = vi.fn<(user: UserResponse) => Promise<void>>()
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>

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
    confirmSpy = vi.spyOn(window, 'confirm')
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    mockOnDeleteUser.mockReset()
    mockOnDeleteUser.mockResolvedValue()
  })

  afterEach(() => {
    confirmSpy.mockRestore()
    alertSpy.mockRestore()
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
      confirmSpy.mockReturnValue(false)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      expect(confirmSpy).toHaveBeenCalledWith(
        'user1@example.com を削除しますか?\n\nこの操作は取り消せません。'
      )
    })

    it('should not delete user if confirmation is cancelled', async () => {
      confirmSpy.mockReturnValue(false)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      expect(mockOnDeleteUser).not.toHaveBeenCalled()
    })

    it('should delete user successfully when confirmed', async () => {
      confirmSpy.mockReturnValue(true)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockOnDeleteUser).toHaveBeenCalledWith(mockUsers[1])
      })
    })

    it('should show deleting state during deletion', async () => {
      confirmSpy.mockReturnValue(true)
      let resolveDelete: () => void
      const deletePromise = new Promise<void>(resolve => {
        resolveDelete = resolve
      })
      mockOnDeleteUser.mockReturnValue(deletePromise)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('削除中...')).toBeInTheDocument()
      })

      resolveDelete!()
    })

    it('should disable delete button during deletion', async () => {
      confirmSpy.mockReturnValue(true)
      let resolveDelete: () => void
      const deletePromise = new Promise<void>(resolve => {
        resolveDelete = resolve
      })
      mockOnDeleteUser.mockReturnValue(deletePromise)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        const deletingButton = screen.getByRole('button', { name: '削除中...' })
        expect(deletingButton).toBeDisabled()
      })

      resolveDelete!()
    })

    it('should show error alert on deletion failure', async () => {
      confirmSpy.mockReturnValue(true)
      const error = new Error('Network error')
      mockOnDeleteUser.mockRejectedValue(error)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('ユーザーの削除に失敗しました')
        expect(mockOnDeleteUser).toHaveBeenCalledWith(mockUsers[1])
      })
    })

    it('should show API error message on deletion failure with ApiError', async () => {
      confirmSpy.mockReturnValue(true)
      const apiError = new ApiError(403, 'Admin user cannot be deleted', {})
      mockOnDeleteUser.mockRejectedValue(apiError)

      render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('削除に失敗しました: Admin user cannot be deleted')
        expect(mockOnDeleteUser).toHaveBeenCalledWith(mockUsers[1])
      })
    })

    it('should call deleteUserApi when onDeleteUser is not provided', async () => {
      confirmSpy.mockReturnValue(true)
      const deleteUserSpy = vi.spyOn(usersApi, 'deleteUser').mockResolvedValue()

      render(<UserList users={mockUsers} />)

      const deleteButtons = screen.getAllByRole('button', { name: '削除' })
      fireEvent.click(deleteButtons[0])

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

  describe('CSS Classes', () => {
    it('should apply correct CSS classes to role badges', () => {
      const { container } = render(<UserList users={mockUsers} onDeleteUser={mockOnDeleteUser} />)

      const adminRole = container.querySelector('.user-list__role--admin')
      const userRoles = container.querySelectorAll('.user-list__role--user')

      expect(adminRole).toBeInTheDocument()
      expect(userRoles).toHaveLength(2)
    })
  })
})
