import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@/test/helpers/renderHelpers'
import { TodoList } from './TodoList'
import { createMockTodo } from '@/test/helpers/mockData'

describe('TodoList', () => {
  const mockOnToggle = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  const defaultProps = {
    todos: [],
    isLoading: false,
    onToggle: mockOnToggle,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading message when isLoading is true', () => {
      render(<TodoList {...defaultProps} isLoading={true} />)

      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    })

    it('does not show todo list when loading', () => {
      const todos = [createMockTodo({ title: 'Test Todo' })]
      render(<TodoList {...defaultProps} todos={todos} isLoading={true} />)

      expect(screen.queryByText('Test Todo')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty message when no todos', () => {
      render(<TodoList {...defaultProps} todos={[]} isLoading={false} />)

      expect(screen.getByText('表示できるTODOはありません')).toBeInTheDocument()
    })

    it('does not show empty message when loading', () => {
      render(<TodoList {...defaultProps} todos={[]} isLoading={true} />)

      expect(screen.queryByText('表示できるTODOはありません')).not.toBeInTheDocument()
    })
  })

  describe('Todo List Rendering', () => {
    it('renders a list of todos', () => {
      const todos = [
        createMockTodo({ id: 1, title: 'Todo 1' }),
        createMockTodo({ id: 2, title: 'Todo 2' }),
        createMockTodo({ id: 3, title: 'Todo 3' }),
      ]

      render(<TodoList {...defaultProps} todos={todos} />)

      expect(screen.getByText('Todo 1')).toBeInTheDocument()
      expect(screen.getByText('Todo 2')).toBeInTheDocument()
      expect(screen.getByText('Todo 3')).toBeInTheDocument()
    })

    it('renders todo with detail', () => {
      const todos = [createMockTodo({ title: 'Test Todo', detail: 'Test detail text' })]

      render(<TodoList {...defaultProps} todos={todos} />)

      expect(screen.getByText('Test Todo')).toBeInTheDocument()
      expect(screen.getByText('Test detail text')).toBeInTheDocument()
    })

    it('does not render detail when null', () => {
      const todos = [createMockTodo({ title: 'Test Todo', detail: null })]

      render(<TodoList {...defaultProps} todos={todos} />)

      expect(screen.getByText('Test Todo')).toBeInTheDocument()
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
    })

    it('renders due date when set', () => {
      const todos = [createMockTodo({ title: 'Test Todo', dueDate: '2024-06-20' })]

      render(<TodoList {...defaultProps} todos={todos} />)

      expect(screen.getByText(/期限:/)).toBeInTheDocument()
      // Date format depends on locale, just check it's not "未設定"
      expect(screen.queryByText('未設定')).not.toBeInTheDocument()
    })

    it('renders "未設定" when due date is null', () => {
      const todos = [createMockTodo({ title: 'Test Todo', dueDate: null })]

      render(<TodoList {...defaultProps} todos={todos} />)

      expect(screen.getByText('期限: 未設定')).toBeInTheDocument()
    })

    it('applies completed class when todo is completed', () => {
      const todos = [createMockTodo({ id: 1, title: 'Completed Todo', isCompleted: true })]

      render(<TodoList {...defaultProps} todos={todos} />)

      const listItem = screen.getByRole('listitem')
      expect(listItem).toHaveClass('is-completed')
    })

    it('does not apply completed class when todo is not completed', () => {
      const todos = [createMockTodo({ id: 1, title: 'Active Todo', isCompleted: false })]

      render(<TodoList {...defaultProps} todos={todos} />)

      const listItem = screen.getByRole('listitem')
      expect(listItem).not.toHaveClass('is-completed')
    })
  })

  describe('Checkbox Interactions', () => {
    it('calls onToggle when checkbox is clicked', async () => {
      const todo = createMockTodo({ id: 1, title: 'Test Todo', isCompleted: false })
      render(<TodoList {...defaultProps} todos={[todo]} />)

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
      expect(mockOnToggle).toHaveBeenCalledWith(todo, true)
    })

    it('toggles from completed to uncompleted', async () => {
      const todo = createMockTodo({ id: 1, title: 'Test Todo', isCompleted: true })
      render(<TodoList {...defaultProps} todos={[todo]} />)

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      expect(mockOnToggle).toHaveBeenCalledWith(todo, false)
    })

    it('checkbox reflects completed state', () => {
      const completedTodo = createMockTodo({ id: 1, isCompleted: true })
      const { rerender } = render(<TodoList {...defaultProps} todos={[completedTodo]} />)

      let checkbox = screen.getByRole('checkbox') as HTMLInputElement
      expect(checkbox.checked).toBe(true)

      const activeTodo = createMockTodo({ id: 1, isCompleted: false })
      rerender(<TodoList {...defaultProps} todos={[activeTodo]} />)

      checkbox = screen.getByRole('checkbox') as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })
  })

  describe('Button Interactions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const todo = createMockTodo({ id: 1, title: 'Test Todo' })
      render(<TodoList {...defaultProps} todos={[todo]} />)

      const editButton = screen.getByRole('button', { name: '編集' })
      await userEvent.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
      expect(mockOnEdit).toHaveBeenCalledWith(todo)
    })

    it('calls onDelete when delete button is clicked', async () => {
      const todo = createMockTodo({ id: 1, title: 'Test Todo' })
      render(<TodoList {...defaultProps} todos={[todo]} />)

      const deleteButton = screen.getByRole('button', { name: '削除' })
      await userEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
      expect(mockOnDelete).toHaveBeenCalledWith(todo)
    })

    it('renders edit and delete buttons for each todo', () => {
      const todos = [
        createMockTodo({ id: 1, title: 'Todo 1' }),
        createMockTodo({ id: 2, title: 'Todo 2' }),
      ]

      render(<TodoList {...defaultProps} todos={todos} />)

      const editButtons = screen.getAllByRole('button', { name: '編集' })
      const deleteButtons = screen.getAllByRole('button', { name: '削除' })

      expect(editButtons).toHaveLength(2)
      expect(deleteButtons).toHaveLength(2)
    })
  })

  describe('Accessibility', () => {
    it('renders as an unordered list', () => {
      const todos = [createMockTodo({ title: 'Test Todo' })]
      render(<TodoList {...defaultProps} todos={todos} />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      expect(list).toHaveClass('todo-list')
    })

    it('has aria-live="polite" on the list', () => {
      const todos = [createMockTodo({ title: 'Test Todo' })]
      render(<TodoList {...defaultProps} todos={todos} />)

      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-live', 'polite')
    })

    it('checkbox has descriptive aria-label for uncompleted todo', () => {
      const todo = createMockTodo({ title: 'Test Todo', isCompleted: false })
      render(<TodoList {...defaultProps} todos={[todo]} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Test Todo を完了にする')
    })

    it('checkbox has descriptive aria-label for completed todo', () => {
      const todo = createMockTodo({ title: 'Test Todo', isCompleted: true })
      render(<TodoList {...defaultProps} todos={[todo]} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Test Todo を未完了に戻す')
    })
  })

  describe('Multiple Todos Interactions', () => {
    it('handles interactions with different todos independently', async () => {
      const todos = [
        createMockTodo({ id: 1, title: 'Todo 1' }),
        createMockTodo({ id: 2, title: 'Todo 2' }),
      ]

      render(<TodoList {...defaultProps} todos={todos} />)

      const editButtons = screen.getAllByRole('button', { name: '編集' })
      await userEvent.click(editButtons[1])

      expect(mockOnEdit).toHaveBeenCalledWith(todos[1])
      expect(mockOnEdit).not.toHaveBeenCalledWith(todos[0])
    })

    it('can interact with multiple todos in sequence', async () => {
      const todos = [
        createMockTodo({ id: 1, title: 'Todo 1' }),
        createMockTodo({ id: 2, title: 'Todo 2' }),
      ]

      render(<TodoList {...defaultProps} todos={todos} />)

      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[0])
      await userEvent.click(checkboxes[1])

      expect(mockOnToggle).toHaveBeenCalledTimes(2)
      expect(mockOnToggle).toHaveBeenNthCalledWith(1, todos[0], true)
      expect(mockOnToggle).toHaveBeenNthCalledWith(2, todos[1], true)
    })
  })
})
