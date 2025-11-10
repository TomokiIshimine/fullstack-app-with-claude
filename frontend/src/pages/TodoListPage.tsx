import { useNavigate } from 'react-router-dom'
import { TodoForm } from '@/components/TodoForm'
import { TodoFilterToggle } from '@/components/TodoFilterToggle'
import { TodoList } from '@/components/TodoList'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useTodos } from '@/hooks/useTodos'
import { useAuth } from '@/contexts/AuthContext'
import { useLogout } from '@/hooks/useLogout'

export function TodoListPage() {
  const {
    todos,
    totalCount,
    activeCount,
    completedCount,
    status,
    sortOrder,
    isLoading,
    error,
    editingTodo,
    refresh,
    clearError,
    setStatus,
    toggleSortOrder,
    startEditing,
    cancelEditing,
    submitTodo,
    deleteTodo: deleteTodoById,
    toggleTodoCompletion,
  } = useTodos()

  const { user } = useAuth()
  const { handleLogout } = useLogout()
  const navigate = useNavigate()

  return (
    <div className="todo-page">
      <div className="todo-page__content">
        <div className="todo-page__header">
          <h1 className="todo-page__title">TODOリスト</h1>
          <div className="todo-page__user-info">
            {user && <span className="user-email">{user.email}</span>}
            <button type="button" onClick={() => navigate('/settings')} className="settings-button">
              設定
            </button>
            <button type="button" onClick={handleLogout} className="logout-button">
              ログアウト
            </button>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => {
              clearError()
              void refresh()
            }}
            onDismiss={clearError}
          />
        )}

        <TodoFilterToggle
          totalCount={totalCount}
          activeCount={activeCount}
          completedCount={completedCount}
          status={status}
          sortOrder={sortOrder}
          onStatusChange={setStatus}
          onToggleSortOrder={toggleSortOrder}
        />

        <div className="todo-layout">
          <div className="todo-layout__list">
            <TodoList
              todos={todos}
              isLoading={isLoading}
              onToggle={(todo, nextState) => void toggleTodoCompletion(todo.id, nextState)}
              onEdit={startEditing}
              onDelete={todo => void deleteTodoById(todo.id)}
            />
          </div>
          <div className="todo-layout__form">
            <TodoForm
              editingTodo={editingTodo}
              onSubmit={submitTodo}
              onCancelEdit={cancelEditing}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
