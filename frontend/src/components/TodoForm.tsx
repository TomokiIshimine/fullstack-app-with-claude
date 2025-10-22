import { useEffect, useMemo, useState } from 'react'

import type { Todo } from '@/lib/api/todos'

interface TodoFormProps {
  editingTodo: Todo | null
  onSubmit: (payload: {
    title: string
    detail: string | null
    dueDate: string | null
  }) => Promise<void>
  onCancelEdit: () => void
}

type FieldErrors = Partial<Record<'title' | 'detail' | 'dueDate', string>>

export function TodoForm({ editingTodo, onSubmit, onCancelEdit }: TodoFormProps) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title)
      setDetail(editingTodo.detail ?? '')
      setDueDate(editingTodo.dueDate ?? '')
    } else {
      setTitle('')
      setDetail('')
      setDueDate('')
    }
    setFieldErrors({})
    setSubmitError(null)
  }, [editingTodo])

  const submitLabel = useMemo(() => (editingTodo ? '更新' : '追加'), [editingTodo])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const errors: FieldErrors = {}
    const trimmedTitle = title.trim()
    const trimmedDetail = detail.trim()

    if (!trimmedTitle) {
      errors.title = 'タイトルは必須です'
    } else if (trimmedTitle.length > 120) {
      errors.title = 'タイトルは120文字以内で入力してください'
    }

    if (trimmedDetail.length > 1000) {
      errors.detail = '詳細は1000文字以内で入力してください'
    }

    if (dueDate) {
      if (!isValidDate(dueDate)) {
        errors.dueDate = '期限はYYYY-MM-DD形式で入力してください'
      } else if (isPastDate(dueDate)) {
        errors.dueDate = '期限は今日以降の日付を選択してください'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    try {
      await onSubmit({
        title: trimmedTitle,
        detail: trimmedDetail ? trimmedDetail : null,
        dueDate: dueDate || null,
      })
      if (!editingTodo) {
        setTitle('')
        setDetail('')
        setDueDate('')
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onCancelEdit()
  }

  return (
    <section className="todo-form-wrapper">
      <h2 className="todo-form__title">{editingTodo ? 'TODOを編集' : 'TODOを追加'}</h2>
      <form className="todo-form" onSubmit={handleSubmit} aria-label="TODOフォーム">
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
            maxLength={120}
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
            maxLength={1000}
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
              onClick={handleCancel}
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

function isValidDate(value: string): boolean {
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function isPastDate(value: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const date = new Date(`${value}T00:00:00`)
  return date.getTime() < today.getTime()
}
