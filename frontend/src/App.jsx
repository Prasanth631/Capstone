import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import DashboardPage from './pages/DashboardPage'
import ExpenseTrackerPage from './pages/ExpenseTrackerPage'
import LoginPage from './pages/LoginPage'

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) {
    // Redirect them to the /login page, but save the current location they were trying to go to
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* DevOps Dashboard is currently accessible without strict auth (or uses its own config) */}
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Protected Routes - require login */}
            <Route 
              path="/expense-tracker" 
              element={
                <ProtectedRoute>
                  <ExpenseTrackerPage />
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
