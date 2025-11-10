import type { Todo } from '@/types/todo'
import { TODO_VALIDATION } from '@/constants/todo'
import { useTodoForm } from '@/hooks/useTodoForm'

interface TodoFormProps {
  editingTodo: Todo | null
  onSubmit: (payload: {
    title: string
    detail: string | null
    dueDate: string | null
  }) => Promise<void>
  onCancelEdit: () => void
}

export function TodoForm({ editingTodo, onSubmit, onCancelEdit }: TodoFormProps) {
  const {
    title,
    detail,
    dueDate,
    fieldErrors,
    submitError,
    isSubmitting,
    submitLabel,
    setTitle,
    setDetail,
    setDueDate,
    handleSubmit,
  } = useTodoForm({ editingTodo, onSubmit })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    // INPUTフィールドでのみEnterキー送信を有効化（ボタンやその他の要素は除外）
    if (e.key === 'Enter' && !e.shiftKey && target.tagName === 'INPUT') {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
    }
  }

  return (
    <section className="todo-form-wrapper">
      <h2 className="todo-form__title">{editingTodo ? 'TODOを編集' : 'TODOを追加'}</h2>
      <form
        className="todo-form"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        aria-label="TODOフォーム"
      >
        <div className="todo-form__field">
          <label htmlFor="todo-title">タイトル</label>
          <input
            id="todo-title"
            name="title"
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="やることを入力"
            disabled={isSubmitting}
            required
            maxLength={TODO_VALIDATION.TITLE_MAX_LENGTH}
          />
          {fieldErrors.title && <p className="todo-form__error">{fieldErrors.title}</p>}
        </div>

        <div className="todo-form__field">
          <label htmlFor="todo-detail">詳細</label>
          <textarea
            id="todo-detail"
            name="detail"
            value={detail}
            onChange={event => setDetail(event.target.value)}
            placeholder="必要であれば詳細を入力"
            disabled={isSubmitting}
            maxLength={TODO_VALIDATION.DETAIL_MAX_LENGTH}
            rows={4}
          />
          {fieldErrors.detail && <p className="todo-form__error">{fieldErrors.detail}</p>}
        </div>

        <div className="todo-form__field">
          <label htmlFor="todo-due-date">期限</label>
          <input
            id="todo-due-date"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={event => setDueDate(event.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.dueDate && <p className="todo-form__error">{fieldErrors.dueDate}</p>}
        </div>

        {submitError && <p className="todo-form__error">{submitError}</p>}

        <div className="todo-form__actions">
          <button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </button>
          {editingTodo && (
            <button
              type="button"
              className="secondary"
              onClick={onCancelEdit}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
