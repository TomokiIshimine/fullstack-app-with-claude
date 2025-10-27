import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logger } from './lib/logger'
import { ErrorBoundary } from './components/ErrorBoundary'

/**
 * Global error handler for uncaught errors
 */
window.onerror = (message, source, lineno, colno, error) => {
  logger.error('Uncaught error', error || new Error(String(message)), {
    source,
    lineno,
    colno,
  })
  // Return false to allow default error handling
  return false
}

/**
 * Global handler for unhandled promise rejections
 */
window.onunhandledrejection = event => {
  logger.error('Unhandled promise rejection', event.reason, {
    type: 'unhandledrejection',
  })
  // Prevent default handling to avoid duplicate console errors
  event.preventDefault()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
