import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@/test/helpers/renderHelpers'
import { TodoForm } from './TodoForm'
import { createMockTodo } from '@/test/helpers/mockData'
import { TODO_VALIDATION } from '@/constants/todo'

describe('TodoForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancelEdit = vi.fn()

  const defaultProps = {
    editingTodo: null,
    onSubmit: mockOnSubmit,
    onCancelEdit: mockOnCancelEdit,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('renders create mode with correct title', () => {
      render(<TodoForm {...defaultProps} />)

      expect(screen.getByText('TODOを追加')).toBeInTheDocument()
    })

    it('renders edit mode with correct title', () => {
      const todo = createMockTodo({ title: 'Test Todo' })
      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      expect(screen.getByText('TODOを編集')).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<TodoForm {...defaultProps} />)

      expect(screen.getByLabelText('タイトル')).toBeInTheDocument()
      expect(screen.getByLabelText('詳細')).toBeInTheDocument()
      expect(screen.getByLabelText('期限')).toBeInTheDocument()
    })

    it('renders submit button with correct label in create mode', () => {
      render(<TodoForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: '追加' })).toBeInTheDocument()
    })

    it('renders submit button with correct label in edit mode', () => {
      const todo = createMockTodo({ title: 'Test Todo' })
      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument()
    })

    it('does not render cancel button in create mode', () => {
      render(<TodoForm {...defaultProps} />)

      expect(screen.queryByRole('button', { name: 'キャンセル' })).not.toBeInTheDocument()
    })

    it('renders cancel button in edit mode', () => {
      const todo = createMockTodo({ title: 'Test Todo' })
      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
    })
  })

  describe('Form Field Inputs', () => {
    it('allows typing in title field', async () => {
      render(<TodoForm {...defaultProps} />)

      const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement
      await userEvent.type(titleInput, 'New Todo')

      expect(titleInput.value).toBe('New Todo')
    })

    it('allows typing in detail field', async () => {
      render(<TodoForm {...defaultProps} />)

      const detailInput = screen.getByLabelText('詳細') as HTMLTextAreaElement
      await userEvent.type(detailInput, 'Todo details')

      expect(detailInput.value).toBe('Todo details')
    })

    it('allows setting due date', async () => {
      render(<TodoForm {...defaultProps} />)

      const dueDateInput = screen.getByLabelText('期限') as HTMLInputElement
      await userEvent.type(dueDateInput, '2024-06-20')

      expect(dueDateInput.value).toBe('2024-06-20')
    })

    it('populates fields with editing todo data', () => {
      const todo = createMockTodo({
        title: 'Existing Todo',
        detail: 'Existing detail',
        dueDate: '2024-06-20',
      })

      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement
      const detailInput = screen.getByLabelText('詳細') as HTMLTextAreaElement
      const dueDateInput = screen.getByLabelText('期限') as HTMLInputElement

      expect(titleInput.value).toBe('Existing Todo')
      expect(detailInput.value).toBe('Existing detail')
      expect(dueDateInput.value).toBe('2024-06-20')
    })
  })

  describe('Field Validation', () => {
    it('has required attribute on title field', () => {
      render(<TodoForm {...defaultProps} />)

      const titleInput = screen.getByLabelText('タイトル')
      expect(titleInput).toHaveAttribute('required')
    })

    it('has maxLength on title field', () => {
      render(<TodoForm {...defaultProps} />)

      const titleInput = screen.getByLabelText('タイトル')
      expect(titleInput).toHaveAttribute('maxLength', String(TODO_VALIDATION.TITLE_MAX_LENGTH))
    })

    it('has maxLength on detail field', () => {
      render(<TodoForm {...defaultProps} />)

      const detailInput = screen.getByLabelText('詳細')
      expect(detailInput).toHaveAttribute('maxLength', String(TODO_VALIDATION.DETAIL_MAX_LENGTH))
    })

    it('detail field has correct number of rows', () => {
      render(<TodoForm {...defaultProps} />)

      const detailInput = screen.getByLabelText('詳細')
      expect(detailInput).toHaveAttribute('rows', '4')
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit with form data', async () => {
      render(<TodoForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText('タイトル'), 'New Todo')
      await userEvent.type(screen.getByLabelText('詳細'), 'Todo details')
      await userEvent.type(screen.getByLabelText('期限'), '2024-06-20')

      const submitButton = screen.getByRole('button', { name: '追加' })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'New Todo',
          detail: 'Todo details',
          dueDate: '2024-06-20',
        })
      })
    })

    it('calls onSubmit with minimal data', async () => {
      render(<TodoForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText('タイトル'), 'Simple Todo')

      const submitButton = screen.getByRole('button', { name: '追加' })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Simple Todo',
          detail: null,
          dueDate: null,
        })
      })
    })

    it('disables form during submission', async () => {
      let resolveSubmit: () => void
      mockOnSubmit.mockImplementation(
        () =>
          new Promise(resolve => {
            resolveSubmit = resolve as () => void
          })
      )

      render(<TodoForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText('タイトル'), 'Test')
      await userEvent.click(screen.getByRole('button', { name: '追加' }))

      await waitFor(() => {
        expect(screen.getByLabelText('タイトル')).toBeDisabled()
        expect(screen.getByLabelText('詳細')).toBeDisabled()
        expect(screen.getByLabelText('期限')).toBeDisabled()
        expect(screen.getByRole('button', { name: '追加' })).toBeDisabled()
      })

      resolveSubmit!()

      await waitFor(() => {
        expect(screen.getByLabelText('タイトル')).not.toBeDisabled()
      })
    })
  })

  describe('Cancel Button', () => {
    it('calls onCancelEdit when cancel button is clicked', async () => {
      const todo = createMockTodo({ title: 'Test Todo' })
      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' })
      await userEvent.click(cancelButton)

      expect(mockOnCancelEdit).toHaveBeenCalledTimes(1)
    })

    it('cancel button is disabled during submission', async () => {
      let resolveSubmit: () => void
      mockOnSubmit.mockImplementation(
        () =>
          new Promise(resolve => {
            resolveSubmit = resolve as () => void
          })
      )

      const todo = createMockTodo({ title: 'Test Todo' })
      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      await userEvent.click(screen.getByRole('button', { name: '更新' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
      })

      resolveSubmit!()
    })
  })

  describe('Form Accessibility', () => {
    it('form has aria-label', () => {
      render(<TodoForm {...defaultProps} />)

      const form = screen.getByRole('form', { name: 'TODOフォーム' })
      expect(form).toBeInTheDocument()
    })

    it('fields have associated labels', () => {
      render(<TodoForm {...defaultProps} />)

      const titleInput = screen.getByLabelText('タイトル')
      const detailInput = screen.getByLabelText('詳細')
      const dueDateInput = screen.getByLabelText('期限')

      expect(titleInput).toHaveAttribute('id', 'todo-title')
      expect(detailInput).toHaveAttribute('id', 'todo-detail')
      expect(dueDateInput).toHaveAttribute('id', 'todo-due-date')
    })

    it('fields have appropriate placeholders', () => {
      render(<TodoForm {...defaultProps} />)

      expect(screen.getByPlaceholderText('やることを入力')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('必要であれば詳細を入力')).toBeInTheDocument()
    })
  })

  describe('Integration with useTodoForm', () => {
    it('shows field error when title is empty', async () => {
      render(<TodoForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: '追加' })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/タイトルは必須です/)).toBeInTheDocument()
      })
    })

    it('clears form after successful submission in create mode', async () => {
      render(<TodoForm {...defaultProps} />)

      const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement
      const detailInput = screen.getByLabelText('詳細') as HTMLTextAreaElement

      await userEvent.type(titleInput, 'Test Todo')
      await userEvent.type(detailInput, 'Test detail')
      await userEvent.click(screen.getByRole('button', { name: '追加' }))

      await waitFor(() => {
        expect(titleInput.value).toBe('')
        expect(detailInput.value).toBe('')
      })
    })

    it('does not clear form after successful submission in edit mode', async () => {
      const todo = createMockTodo({ title: 'Original' })
      render(<TodoForm {...defaultProps} editingTodo={todo} />)

      const titleInput = screen.getByLabelText('タイトル') as HTMLInputElement
      await userEvent.clear(titleInput)
      await userEvent.type(titleInput, 'Updated')
      await userEvent.click(screen.getByRole('button', { name: '更新' }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })

      // Form should still have the updated value
      expect(titleInput.value).toBe('Updated')
    })

    it('shows submit error when submission fails', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'))

      render(<TodoForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText('タイトル'), 'Test Todo')
      await userEvent.click(screen.getByRole('button', { name: '追加' }))

      await waitFor(() => {
        expect(screen.getByText('Submission failed')).toBeInTheDocument()
      })
    })
  })
})
