import React, { useEffect, useState } from 'react'

export type AlertVariant = 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  children: React.ReactNode
  onDismiss?: () => void
  onRetry?: () => void
  autoCloseMs?: number
  className?: string
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; iconBg: string; text: string }
> = {
  success: {
    container: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    text: 'text-emerald-800',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
    text: 'text-red-800',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    text: 'text-amber-800',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
    text: 'text-blue-800',
  },
}

const icons: Record<AlertVariant, React.ReactNode> = {
  success: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  children,
  onDismiss,
  onRetry,
  autoCloseMs,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onDismiss?.()
      }, autoCloseMs)

      return () => clearTimeout(timer)
    }
  }, [autoCloseMs, onDismiss])

  if (!isVisible) {
    return null
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const styles = variantStyles[variant]
  const icon = icons[variant]

  const containerClassName = [
    'flex items-start gap-3 p-4 border rounded-lg',
    styles.container,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClassName} role="alert">
      <div className={`flex-shrink-0 p-1 rounded-full ${styles.iconBg}`}>
        <div className={styles.icon}>{icon}</div>
      </div>

      <div className={`flex-1 ${styles.text}`}>
        <div className="text-sm">{children}</div>

        {(onRetry || onDismiss) && (
          <div className="mt-3 flex gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={`text-sm font-medium hover:underline focus:outline-none focus:underline ${styles.text}`}
              >
                再試行
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={handleDismiss}
                className={`text-sm font-medium hover:underline focus:outline-none focus:underline ${styles.text}`}
              >
                閉じる
              </button>
            )}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors focus:outline-none focus:bg-black/10 ${styles.icon}`}
          aria-label="閉じる"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
