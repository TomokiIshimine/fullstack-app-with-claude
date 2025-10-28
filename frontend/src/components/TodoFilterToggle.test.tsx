import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@/test/helpers/renderHelpers'
import { TodoFilterToggle } from './TodoFilterToggle'
import type { TodoStatus, SortOrder } from '@/types/todo'

describe('TodoFilterToggle', () => {
  const mockOnStatusChange = vi.fn()
  const mockOnToggleSortOrder = vi.fn()

  const defaultProps = {
    totalCount: 10,
    activeCount: 6,
    completedCount: 4,
    status: 'all' as TodoStatus,
    sortOrder: 'asc' as SortOrder,
    onStatusChange: mockOnStatusChange,
    onToggleSortOrder: mockOnToggleSortOrder,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Counts Display', () => {
    it('displays total count', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      expect(screen.getByText('全件: 10')).toBeInTheDocument()
    })

    it('displays active count', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      expect(screen.getByText('未完了: 6')).toBeInTheDocument()
    })

    it('displays completed count', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      expect(screen.getByText('完了: 4')).toBeInTheDocument()
    })

    it('updates counts when props change', () => {
      const { rerender } = render(<TodoFilterToggle {...defaultProps} />)

      rerender(
        <TodoFilterToggle {...defaultProps} totalCount={5} activeCount={2} completedCount={3} />
      )

      expect(screen.getByText('全件: 5')).toBeInTheDocument()
      expect(screen.getByText('未完了: 2')).toBeInTheDocument()
      expect(screen.getByText('完了: 3')).toBeInTheDocument()
    })

    it('displays zero counts correctly', () => {
      render(
        <TodoFilterToggle {...defaultProps} totalCount={0} activeCount={0} completedCount={0} />
      )

      expect(screen.getByText('全件: 0')).toBeInTheDocument()
      expect(screen.getByText('未完了: 0')).toBeInTheDocument()
      expect(screen.getByText('完了: 0')).toBeInTheDocument()
    })
  })

  describe('Filter Buttons', () => {
    it('renders all filter buttons', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '未完了' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '完了' })).toBeInTheDocument()
    })

    it('highlights "すべて" button when status is "all"', () => {
      render(<TodoFilterToggle {...defaultProps} status="all" />)

      const allButton = screen.getByRole('button', { name: 'すべて' })
      expect(allButton).toHaveClass('is-active')
      expect(allButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('highlights "未完了" button when status is "active"', () => {
      render(<TodoFilterToggle {...defaultProps} status="active" />)

      const activeButton = screen.getByRole('button', { name: '未完了' })
      expect(activeButton).toHaveClass('is-active')
      expect(activeButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('highlights "完了" button when status is "completed"', () => {
      render(<TodoFilterToggle {...defaultProps} status="completed" />)

      const completedButton = screen.getByRole('button', { name: '完了' })
      expect(completedButton).toHaveClass('is-active')
      expect(completedButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('calls onStatusChange with "all" when "すべて" is clicked', async () => {
      render(<TodoFilterToggle {...defaultProps} status="active" />)

      const allButton = screen.getByRole('button', { name: 'すべて' })
      await userEvent.click(allButton)

      expect(mockOnStatusChange).toHaveBeenCalledTimes(1)
      expect(mockOnStatusChange).toHaveBeenCalledWith('all')
    })

    it('calls onStatusChange with "active" when "未完了" is clicked', async () => {
      render(<TodoFilterToggle {...defaultProps} status="all" />)

      const activeButton = screen.getByRole('button', { name: '未完了' })
      await userEvent.click(activeButton)

      expect(mockOnStatusChange).toHaveBeenCalledWith('active')
    })

    it('calls onStatusChange with "completed" when "完了" is clicked', async () => {
      render(<TodoFilterToggle {...defaultProps} status="all" />)

      const completedButton = screen.getByRole('button', { name: '完了' })
      await userEvent.click(completedButton)

      expect(mockOnStatusChange).toHaveBeenCalledWith('completed')
    })

    it('does not apply is-active class to non-selected buttons', () => {
      render(<TodoFilterToggle {...defaultProps} status="all" />)

      const activeButton = screen.getByRole('button', { name: '未完了' })
      const completedButton = screen.getByRole('button', { name: '完了' })

      expect(activeButton).not.toHaveClass('is-active')
      expect(completedButton).not.toHaveClass('is-active')
    })
  })

  describe('Sort Button', () => {
    it('renders sort button', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      expect(screen.getByRole('button', { name: /期限順/ })).toBeInTheDocument()
    })

    it('shows ascending arrow when sortOrder is "asc"', () => {
      render(<TodoFilterToggle {...defaultProps} sortOrder="asc" />)

      expect(screen.getByText(/▲/)).toBeInTheDocument()
    })

    it('shows descending arrow when sortOrder is "desc"', () => {
      render(<TodoFilterToggle {...defaultProps} sortOrder="desc" />)

      expect(screen.getByText(/▼/)).toBeInTheDocument()
    })

    it('calls onToggleSortOrder when clicked', async () => {
      render(<TodoFilterToggle {...defaultProps} />)

      const sortButton = screen.getByRole('button', { name: /期限順/ })
      await userEvent.click(sortButton)

      expect(mockOnToggleSortOrder).toHaveBeenCalledTimes(1)
    })

    it('updates arrow when sortOrder changes', () => {
      const { rerender } = render(<TodoFilterToggle {...defaultProps} sortOrder="asc" />)

      expect(screen.getByText(/▲/)).toBeInTheDocument()

      rerender(<TodoFilterToggle {...defaultProps} sortOrder="desc" />)

      expect(screen.getByText(/▼/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has aria-label on counts container', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      const countsContainer = screen.getByLabelText('Todo counts')
      expect(countsContainer).toBeInTheDocument()
    })

    it('has role="group" and aria-label on filter buttons container', () => {
      render(<TodoFilterToggle {...defaultProps} />)

      const filtersGroup = screen.getByRole('group', { name: 'フィルター' })
      expect(filtersGroup).toBeInTheDocument()
    })

    it('filter buttons have aria-pressed attribute', () => {
      render(<TodoFilterToggle {...defaultProps} status="all" />)

      const allButton = screen.getByRole('button', { name: 'すべて' })
      const activeButton = screen.getByRole('button', { name: '未完了' })
      const completedButton = screen.getByRole('button', { name: '完了' })

      expect(allButton).toHaveAttribute('aria-pressed', 'true')
      expect(activeButton).toHaveAttribute('aria-pressed', 'false')
      expect(completedButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('all buttons are keyboard accessible', async () => {
      render(<TodoFilterToggle {...defaultProps} />)

      const allButton = screen.getByRole('button', { name: 'すべて' })
      allButton.focus()
      expect(allButton).toHaveFocus()

      await userEvent.keyboard('{Enter}')
      expect(mockOnStatusChange).toHaveBeenCalledWith('all')
    })
  })

  describe('Integration', () => {
    it('can switch between filters sequentially', async () => {
      render(<TodoFilterToggle {...defaultProps} status="all" />)

      await userEvent.click(screen.getByRole('button', { name: '未完了' }))
      expect(mockOnStatusChange).toHaveBeenCalledWith('active')

      await userEvent.click(screen.getByRole('button', { name: '完了' }))
      expect(mockOnStatusChange).toHaveBeenCalledWith('completed')

      await userEvent.click(screen.getByRole('button', { name: 'すべて' }))
      expect(mockOnStatusChange).toHaveBeenCalledWith('all')

      expect(mockOnStatusChange).toHaveBeenCalledTimes(3)
    })

    it('can toggle sort order multiple times', async () => {
      render(<TodoFilterToggle {...defaultProps} />)

      const sortButton = screen.getByRole('button', { name: /期限順/ })

      await userEvent.click(sortButton)
      await userEvent.click(sortButton)
      await userEvent.click(sortButton)

      expect(mockOnToggleSortOrder).toHaveBeenCalledTimes(3)
    })

    it('filter and sort interactions are independent', async () => {
      render(<TodoFilterToggle {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: '未完了' }))
      await userEvent.click(screen.getByRole('button', { name: /期限順/ }))
      await userEvent.click(screen.getByRole('button', { name: '完了' }))

      expect(mockOnStatusChange).toHaveBeenCalledTimes(2)
      expect(mockOnToggleSortOrder).toHaveBeenCalledTimes(1)
    })
  })
})
