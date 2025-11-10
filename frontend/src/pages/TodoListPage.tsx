import { useCallback } from 'react'
import { TodoForm } from '@/components/TodoForm'
import { TodoFilterToggle } from '@/components/TodoFilterToggle'
import { TodoList } from '@/components/TodoList'
import { ErrorMessage } from '@/components/ErrorMessage'
import { PageHeader } from '@/components/PageHeader'
import { useTodos } from '@/hooks/useTodos'
import { useAuth } from '@/contexts/AuthContext'
import type { Todo } from '@/types/todo'

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

  // Memoized callbacks to prevent unnecessary TodoItem re-renders
  const handleToggle = useCallback(
    (todo: Todo, nextState: boolean) => {
      void toggleTodoCompletion(todo.id, nextState)
    },
    [toggleTodoCompletion]
  )

  const handleEdit = useCallback(
    (todo: Todo) => {
      startEditing(todo)
    },
    [startEditing]
  )

  const handleDelete = useCallback(
    (todo: Todo) => {
      void deleteTodoById(todo.id)
    },
    [deleteTodoById]
  )

  return (
    <div className="todo-page">
      <div className="todo-page__content">
        <PageHeader
          title="TODOリスト"
          userEmail={user?.email}
          showSettings={true}
          showLogout={true}
        />

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
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
