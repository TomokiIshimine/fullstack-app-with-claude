interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({ message, onRetry, onDismiss, className = '' }: ErrorMessageProps) {
  return (
    <div className={`error-message ${className}`.trim()} role="alert">
      <span className="error-message__text">{message}</span>
      {(onRetry || onDismiss) && (
        <div className="error-message__actions">
          {onRetry && (
            <button onClick={onRetry} className="error-message__retry" aria-label="再試行">
              再試行
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="error-message__dismiss" aria-label="閉じる">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
