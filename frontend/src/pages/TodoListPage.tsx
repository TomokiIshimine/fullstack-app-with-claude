import { TodoForm } from '@/components/TodoForm'
import { TodoFilterToggle } from '@/components/TodoFilterToggle'
import { TodoList } from '@/components/TodoList'
import { useTodos } from '@/hooks/useTodos'

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

  return (
    <div className="todo-page">
      <div className="todo-page__content">
        <h1 className="todo-page__title">TODOリスト</h1>

        {error && (
          <div className="todo-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                clearError()
                void refresh()
              }}
            >
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
