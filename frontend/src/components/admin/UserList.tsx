import { useState } from 'react'
import type { UserResponse } from '@/types/user'
import { deleteUser } from '@/lib/api/users'
import { logger } from '@/lib/logger'
import { ApiError } from '@/lib/api/todos'

interface UserListProps {
  users: UserResponse[]
  onUsersChange: () => void
}

export function UserList({ users, onUsersChange }: UserListProps) {
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

  const handleDelete = async (user: UserResponse) => {
    const confirmed = window.confirm(`${user.email} を削除しますか?\n\nこの操作は取り消せません。`)

    if (!confirmed) {
      return
    }

    setDeletingUserId(user.id)

    try {
      await deleteUser(user.id)
      logger.info('User deleted successfully', { userId: user.id, email: user.email })
      onUsersChange()
    } catch (err) {
      logger.error('Failed to delete user', err as Error)
      if (err instanceof ApiError) {
        alert(`削除に失敗しました: ${err.message}`)
      } else {
        alert('ユーザーの削除に失敗しました')
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="user-list-empty">
        <p>ユーザーが登録されていません</p>
      </div>
    )
  }

  return (
    <div className="user-list">
      <table className="user-list__table">
        <thead>
          <tr>
            <th>メールアドレス</th>
            <th>名前</th>
            <th>ロール</th>
            <th>作成日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.name || '-'}</td>
              <td>
                <span className={`user-list__role user-list__role--${user.role}`}>
                  {user.role === 'admin' ? '管理者' : 'ユーザー'}
                </span>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString('ja-JP')}</td>
              <td>
                {user.role === 'admin' ? (
                  <span className="user-list__no-action">-</span>
                ) : (
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deletingUserId === user.id}
                    className="user-list__delete-button"
                  >
                    {deletingUserId === user.id ? '削除中...' : '削除'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
