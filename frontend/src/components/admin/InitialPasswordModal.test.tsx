import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InitialPasswordModal } from './InitialPasswordModal'

describe('InitialPasswordModal', () => {
  const mockOnClose = vi.fn()
  const mockEmail = 'test@example.com'
  const mockPassword = 'aB3xY9mK2pL5'

  let writeTextSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnClose.mockClear()

    // Mock clipboard API
    writeTextSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render modal with correct content', () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      expect(screen.getByText('ユーザーを作成しました')).toBeInTheDocument()
      expect(screen.getByText(`test@example.com`, { exact: false })).toBeInTheDocument()
      expect(screen.getByText('初期パスワード:')).toBeInTheDocument()
      expect(screen.getByText(mockPassword)).toBeInTheDocument()
    })

    it('should display warning message', () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      expect(screen.getByText('このパスワードをユーザーに伝えてください。')).toBeInTheDocument()
      expect(screen.getByText('この画面を閉じると再表示できません。')).toBeInTheDocument()
    })

    it('should have copy and close buttons', () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
    })
  })

  describe('Copy Functionality', () => {
    it('should copy password to clipboard when copy button is clicked', async () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const copyButton = screen.getByRole('button', { name: 'コピー' })
      fireEvent.click(copyButton)

      expect(writeTextSpy).toHaveBeenCalledWith(mockPassword)
    })

    it('should change button text to "コピーしました" after copying', async () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const copyButton = screen.getByRole('button', { name: 'コピー' })
      fireEvent.click(copyButton)

      await screen.findByRole('button', { name: 'コピーしました' })
    })

    it('should disable copy button after copying', async () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const copyButton = screen.getByRole('button', { name: 'コピー' })
      fireEvent.click(copyButton)

      const copiedButton = await screen.findByRole('button', { name: 'コピーしました' })

      expect(copiedButton).toBeDisabled()
    })

    it('should reset button text after 2 seconds', async () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const copyButton = screen.getByRole('button', { name: 'コピー' })
      fireEvent.click(copyButton)

      // Wait for the button text to change to "コピーしました"
      await screen.findByRole('button', { name: 'コピーしました' })

      // Wait for 2 seconds for the text to reset
      await new Promise(resolve => setTimeout(resolve, 2100))

      // Button should be reset to "コピー"
      expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument()
    })

    it('should handle clipboard error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      writeTextSpy.mockRejectedValue(new Error('Clipboard error'))

      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const copyButton = screen.getByRole('button', { name: 'コピー' })
      fireEvent.click(copyButton)

      // Should not crash, button should remain enabled
      expect(copyButton).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const closeButton = screen.getByRole('button', { name: '閉じる' })
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking outside modal', () => {
      const { container } = render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const overlay = container.querySelector('.modal-overlay')
      expect(overlay).toBeInTheDocument()

      fireEvent.click(overlay!)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not close when clicking modal content', () => {
      const { container } = render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const modalContent = container.querySelector('.modal-content')
      expect(modalContent).toBeInTheDocument()

      fireEvent.click(modalContent!)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(
        <InitialPasswordModal email={mockEmail} password={mockPassword} onClose={mockOnClose} />
      )

      const copyButton = screen.getByRole('button', { name: 'コピー' })
      const closeButton = screen.getByRole('button', { name: '閉じる' })

      expect(copyButton).toBeInTheDocument()
      expect(closeButton).toBeInTheDocument()
    })
  })
})
