import { memo } from 'react'
import type { Todo } from '@/types/todo'
import { formatDate } from '@/lib/utils/dateFormat'

interface TodoListProps {
  todos: Todo[]
  isLoading: boolean
  onToggle: (todo: Todo, nextState: boolean) => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
}

export function TodoList({ todos, isLoading, onToggle, onEdit, onDelete }: TodoListProps) {
  if (isLoading) {
    return <p className="todo-list__state">読み込み中...</p>
  }

  if (todos.length === 0) {
    return <p className="todo-list__state">表示できるTODOはありません</p>
  }

  return (
    <ul className="todo-list" aria-live="polite">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

interface TodoItemProps {
  todo: Todo
  onToggle: (todo: Todo, nextState: boolean) => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
}

const TodoItem = memo(function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const handleToggle = () => onToggle(todo, !todo.isCompleted)
  const handleEdit = () => onEdit(todo)
  const handleDelete = () => onDelete(todo)

  return (
    <li className={`todo-item${todo.isCompleted ? ' is-completed' : ''}`}>
      <div className="todo-item__row">
        <label className="todo-item__title">
          <input
            type="checkbox"
            checked={todo.isCompleted}
            onChange={handleToggle}
            aria-label={`${todo.title} を${todo.isCompleted ? '未完了に戻す' : '完了にする'}`}
          />
          <span>{todo.title}</span>
        </label>
        <div className="todo-item__actions">
          <button type="button" onClick={handleEdit}>
            編集
          </button>
          <button type="button" className="danger" onClick={handleDelete}>
            削除
          </button>
        </div>
      </div>

      <div className="todo-item__meta">
        <span className="todo-item__due">
          期限: {todo.dueDate ? formatDate(todo.dueDate) : '未設定'}
        </span>
        {todo.detail && <p className="todo-item__detail">{todo.detail}</p>}
      </div>
    </li>
  )
})
