import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'

export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      logger.info('Logout successful, redirecting to login')
      navigate('/login')
    } catch (error) {
      logger.error('Logout error', error as Error)
      // Navigate to login even if logout fails
      navigate('/login')
    }
  }

  return { handleLogout }
}
