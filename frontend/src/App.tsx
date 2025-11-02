import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoginPage } from '@/pages/LoginPage'
import { TodoListPage } from '@/pages/TodoListPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import '@/styles/todo.css'

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/todos"
            element={
              <ProtectedRoute>
                <TodoListPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/todos" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
