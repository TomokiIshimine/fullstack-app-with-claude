import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { getDefaultPathForRole } from '@/lib/utils/routing'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { error, handleError, clearError } = useErrorHandler()
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      const user = await login(email, password)
      // Redirect based on user role
      const redirectPath = getDefaultPathForRole(user.role)
      logger.info('Login successful, redirecting', { role: user.role, path: redirectPath })
      navigate(redirectPath)
    } catch (err) {
      handleError(err, 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>ログイン</h1>
        <form onSubmit={handleSubmit} className="login-form" aria-label="ログインフォーム">
          {error && <ErrorMessage message={error} onDismiss={clearError} />}
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="user@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="パスワードを入力"
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
