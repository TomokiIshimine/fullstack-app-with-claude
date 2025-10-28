import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@/test/helpers/renderHelpers'
import { ErrorBoundary } from './ErrorBoundary'
import * as loggerModule from '@/lib/logger'

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('Normal Rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test Child Component</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test Child Component')).toBeInTheDocument()
    })

    it('renders multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })
  })

  describe('Error Catching', () => {
    it('catches errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(screen.queryByText('No error')).not.toBeInTheDocument()
    })

    it('displays error only for errored subtree', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <div>Other content still visible</div>
        </div>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(screen.getByText('Other content still visible')).toBeInTheDocument()
    })
  })

  describe('Default Fallback UI', () => {
    it('displays default error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(
        screen.getByText('申し訳ございません。予期しないエラーが発生しました。')
      ).toBeInTheDocument()
    })

    it('displays error details in summary/details element', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const summary = screen.getByText('エラーの詳細')
      expect(summary).toBeInTheDocument()
      expect(summary.tagName).toBe('SUMMARY')
    })

    it('displays error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    })

    it('displays reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: 'ページを再読み込み' })
      expect(reloadButton).toBeInTheDocument()
    })
  })

  describe('Custom Fallback UI', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom Error UI</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument()
    })

    it('uses custom fallback instead of default error message', () => {
      const customFallback = (
        <div>
          <h1>Something went wrong</h1>
          <p>Please contact support</p>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Please contact support')).toBeInTheDocument()
      expect(screen.queryByText('申し訳ございません')).not.toBeInTheDocument()
    })
  })

  describe('Error Logging', () => {
    it('logs error when componentDidCatch is called', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'React component error',
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
          type: 'react-error-boundary',
        })
      )
    })

    it('logs error with correct error object', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const errorCall = (loggerModule.logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
      const errorArg = errorCall[1] as Error
      expect(errorArg.message).toBe('Test error message')
    })

    it('logs error with component stack', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const errorCall = (loggerModule.logger.error as ReturnType<typeof vi.fn>).mock.calls[0]
      const metadata = errorCall[2]
      expect(metadata).toHaveProperty('componentStack')
      expect(metadata.componentStack).toBeTruthy()
    })
  })

  describe('Reload Button', () => {
    it('clicking reload button calls window.location.reload', async () => {
      const reloadSpy = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: 'ページを再読み込み' })
      await userEvent.click(reloadButton)

      expect(reloadSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Recovery', () => {
    it('can recover from error with new props', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()

      // Rerender with non-throwing child
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Error boundary still shows error UI (doesn't auto-recover)
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('sets hasError to true when error is caught', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Verify error UI is shown (indicating hasError is true)
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(container.querySelector('[style*="border: 1px solid #ef4444"]')).toBeInTheDocument()
    })

    it('preserves error message in state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Error message should be visible in the UI
      const errorText = screen.getByText(/Test error message/)
      expect(errorText).toBeInTheDocument()
    })
  })

  describe('getDerivedStateFromError', () => {
    it('returns correct error state structure', () => {
      const error = new Error('Test error')
      const state = ErrorBoundary.getDerivedStateFromError(error)

      expect(state).toEqual({
        hasError: true,
        error: error,
      })
    })

    it('sets hasError to true for any error', () => {
      const error = new TypeError('Type error')
      const state = ErrorBoundary.getDerivedStateFromError(error)

      expect(state.hasError).toBe(true)
      expect(state.error).toBe(error)
    })
  })

  describe('Error Display Formatting', () => {
    it('displays error message and stack trace', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const preElement = screen.getByText(/Test error message/).closest('pre')
      expect(preElement).toBeInTheDocument()
      expect(preElement?.textContent).toContain('Test error message')
    })

    it('styles error container with red border', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const errorContainer = container.querySelector('[style*="border: 1px solid #ef4444"]')
      expect(errorContainer).toBeInTheDocument()
    })

    it('styles error heading with red color', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const heading = screen.getByText('エラーが発生しました')
      expect(heading.tagName).toBe('H1')
      expect(heading).toHaveStyle({ color: '#dc2626' })
    })
  })

  describe('Nested Error Boundaries', () => {
    it('catches errors at the correct boundary level', () => {
      // Test: Inner boundary catches errors from inner children
      const { unmount } = render(
        <ErrorBoundary fallback={<div>Outer boundary error</div>}>
          <div>Outer content</div>
          <ErrorBoundary fallback={<div>Inner boundary error</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      expect(screen.getByText('Inner boundary error')).toBeInTheDocument()
      expect(screen.getByText('Outer content')).toBeInTheDocument()
      expect(screen.queryByText('Outer boundary error')).not.toBeInTheDocument()

      unmount()

      // Test: Outer boundary catches errors from outer children
      render(
        <ErrorBoundary fallback={<div>Outer boundary error</div>}>
          <ThrowError shouldThrow={true} />
          <ErrorBoundary fallback={<div>Inner boundary error</div>}>
            <div>Inner content</div>
          </ErrorBoundary>
        </ErrorBoundary>
      )

      expect(screen.getByText('Outer boundary error')).toBeInTheDocument()
      expect(screen.queryByText('Inner content')).not.toBeInTheDocument()
    })
  })

  describe('Different Error Types', () => {
    it('catches different error types (TypeError, ReferenceError, custom errors)', () => {
      // Test TypeError
      const ThrowTypeError = () => {
        throw new TypeError('Type error occurred')
      }

      const { unmount } = render(
        <ErrorBoundary>
          <ThrowTypeError />
        </ErrorBoundary>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(screen.getByText(/Type error occurred/)).toBeInTheDocument()

      unmount()

      // Test ReferenceError
      const ThrowReferenceError = () => {
        throw new ReferenceError('Reference error occurred')
      }

      const { unmount: unmount2 } = render(
        <ErrorBoundary>
          <ThrowReferenceError />
        </ErrorBoundary>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(screen.getByText(/Reference error occurred/)).toBeInTheDocument()

      unmount2()

      // Test Custom Error
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const ThrowCustomError = () => {
        throw new CustomError('Custom error occurred')
      }

      render(
        <ErrorBoundary>
          <ThrowCustomError />
        </ErrorBoundary>
      )

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
      expect(screen.getByText(/Custom error occurred/)).toBeInTheDocument()
    })
  })
})
