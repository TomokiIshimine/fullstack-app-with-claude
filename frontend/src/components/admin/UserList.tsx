import { useState } from 'react'
import type { UserResponse } from '@/types/user'
import { ApiError } from '@/lib/api/client'
import { deleteUser as deleteUserApi } from '@/lib/api/users'
import { Modal, Button, Alert } from '@/components/ui'

interface UserListProps {
  users: UserResponse[]
  onDeleteUser?: (user: UserResponse) => Promise<void>
}

export function UserList({ users, onDeleteUser }: UserListProps) {
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteClick = (user: UserResponse) => {
    setDeleteTarget(user)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeletingUserId(deleteTarget.id)
    setDeleteError(null)

    try {
      const deleteUser = onDeleteUser ?? (async (target: UserResponse) => deleteUserApi(target.id))
      await deleteUser(deleteTarget)
      setDeleteTarget(null)
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message)
      } else {
        setDeleteError('ユーザーの削除に失敗しました')
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-600">ユーザーが登録されていません</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  ロール
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  作成日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role === 'admin' ? '管理者' : 'ユーザー'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.role === 'admin' ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <Button
                        onClick={() => handleDeleteClick(user)}
                        disabled={deletingUserId === user.id}
                        variant="danger"
                        size="sm"
                      >
                        {deletingUserId === user.id ? '削除中...' : '削除'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={handleDeleteCancel}
        title="ユーザー削除の確認"
        size="sm"
      >
        {deleteError && (
          <div className="mb-4">
            <Alert variant="error" onDismiss={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          </div>
        )}
        <p className="text-gray-700 mb-4">
          <span className="font-semibold">{deleteTarget?.email}</span> を削除しますか？
        </p>
        <p className="text-sm text-red-600 font-medium">この操作は取り消せません。</p>
        <div className="flex gap-3 justify-end mt-6">
          <Button
            variant="secondary"
            onClick={handleDeleteCancel}
            disabled={deletingUserId !== null}
          >
            キャンセル
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            loading={deletingUserId !== null}
            disabled={deletingUserId !== null}
          >
            削除
          </Button>
        </div>
      </Modal>
    </>
  )
}
