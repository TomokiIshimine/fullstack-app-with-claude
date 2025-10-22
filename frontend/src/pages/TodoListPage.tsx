import { TodoForm } from '@/components/TodoForm'
import { TodoFilterToggle } from '@/components/TodoFilterToggle'
import { TodoList } from '@/components/TodoList'
import { useTodos } from '@/hooks/useTodos'
import { Todo } from '@/lib/api/todos'

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
    deleteTodo,
    toggleTodoCompletion,
  } = useTodos()

  const handleSubmit = async (payload: {
    title: string
    detail: string | null
    dueDate: string | null
  }) => {
    await submitTodo(payload)
  }

  const handleDelete = (todo: Todo) => {
    void deleteTodo(todo.id)
  }

  const handleToggle = (todo: Todo, nextState: boolean) => {
    void toggleTodoCompletion(todo.id, nextState)
  }

  const handleRetry = () => {
    clearError()
    void refresh()
  }

  return (
    <div className="todo-page">
      <div className="todo-page__content">
        <h1 className="todo-page__title">TODOリスト</h1>

        {error && (
          <div className="todo-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={handleRetry}>
              再読み込み
            </button>
          </div>
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
              onEdit={startEditing}
              onDelete={handleDelete}
            />
          </div>
          <div className="todo-layout__form">
            <TodoForm
              editingTodo={editingTodo}
              onSubmit={handleSubmit}
              onCancelEdit={cancelEditing}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
