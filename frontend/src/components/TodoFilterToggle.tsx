import type { SortOrder, TodoStatus } from '@/types/todo'

interface TodoFilterToggleProps {
  totalCount: number
  activeCount: number
  completedCount: number
  status: TodoStatus
  sortOrder: SortOrder
  onStatusChange: (status: TodoStatus) => void
  onToggleSortOrder: () => void
}

export function TodoFilterToggle({
  totalCount,
  activeCount,
  completedCount,
  status,
  sortOrder,
  onStatusChange,
  onToggleSortOrder,
}: TodoFilterToggleProps) {
  return (
    <header className="todo-header">
      <div className="todo-header__counts" aria-label="Todo counts">
        <span>全件: {totalCount}</span>
        <span>未完了: {activeCount}</span>
        <span>完了: {completedCount}</span>
      </div>

      <div className="todo-header__actions">
        <div className="todo-header__filters" role="group" aria-label="フィルター">
          <FilterButton
            label="すべて"
            isActive={status === 'all'}
            onClick={() => onStatusChange('all')}
          />
          <FilterButton
            label="未完了"
            isActive={status === 'active'}
            onClick={() => onStatusChange('active')}
          />
          <FilterButton
            label="完了"
            isActive={status === 'completed'}
            onClick={() => onStatusChange('completed')}
          />
        </div>

        <button type="button" className="todo-header__sort" onClick={onToggleSortOrder}>
          期限順 {sortOrder === 'asc' ? '▲' : '▼'}
        </button>
      </div>
    </header>
  )
}

interface FilterButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

function FilterButton({ label, isActive, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      className={`todo-header__filter${isActive ? ' is-active' : ''}`}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
