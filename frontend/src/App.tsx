import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { LoginPage } from '@/pages/LoginPage'
import { TodoListPage } from '@/pages/TodoListPage'
import { UserManagementPage } from '@/pages/admin/UserManagementPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RoleBasedRedirect } from '@/components/RoleBasedRedirect'
import '@/styles/todo.css'
import '@/styles/page-header.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/todos"
            element={
              <ProtectedRoute requiredRole="user">
                <TodoListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<RoleBasedRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
