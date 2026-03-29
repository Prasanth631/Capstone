import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Hardcoded default user to bypass login requirements
  const defaultUser = { username: 'Admin', email: 'admin@devops.local' }
  const [token, setToken] = useState('bypassed-token')
  const [user, setUser] = useState(defaultUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/login', { username, password })
      const { token: jwt, username: name, email } = res.data.data
      localStorage.setItem('token', jwt)
      localStorage.setItem('user', JSON.stringify({ username: name, email }))
      setToken(jwt)
      setUser({ username: name, email })
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (username, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/register', { username, email, password })
      const { token: jwt, username: name, email: em } = res.data.data
      localStorage.setItem('token', jwt)
      localStorage.setItem('user', JSON.stringify({ username: name, email: em }))
      setToken(jwt)
      setUser({ username: name, email: em })
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, loading, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
