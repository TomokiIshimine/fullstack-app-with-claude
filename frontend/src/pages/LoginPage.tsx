import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { Alert, Input, Button } from '@/components/ui'
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">ログイン</h1>
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="ログインフォーム">
            {error && (
              <Alert variant="error" onDismiss={clearError}>
                {error}
              </Alert>
            )}
            <Input
              id="email"
              label="メールアドレス"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="user@example.com"
              disabled={isLoading}
              fullWidth
            />
            <Input
              id="password"
              label="パスワード"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="パスワードを入力"
              disabled={isLoading}
              fullWidth
            />
            <Button type="submit" disabled={isLoading} loading={isLoading} fullWidth>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
