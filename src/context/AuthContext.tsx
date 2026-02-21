import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, User, UserStats } from '../lib/api'

interface AuthContextType {
  user: User | null
  stats: UserStats | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshStats: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bloom_token')
    if (token) {
      loadUserData()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function loadUserData() {
    try {
      const profileRes = await api.getProfile()
      setUser(profileRes.user)
      
      try {
        const statsRes = await api.getUserStats()
        setStats(statsRes)
      } catch {
        // Stats might fail if no progress yet
      }
    } catch {
      localStorage.removeItem('bloom_token')
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const res = await api.login(email, password)
    localStorage.setItem('bloom_token', res.token)
    setUser(res.user)
    await refreshStats()
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.register(name, email, password)
    localStorage.setItem('bloom_token', res.token)
    setUser(res.user)
    await refreshStats()
  }

  function logout() {
    localStorage.removeItem('bloom_token')
    setUser(null)
    setStats(null)
  }

  async function refreshStats() {
    try {
      const statsRes = await api.getUserStats()
      setStats(statsRes)
    } catch {
      // Ignore errors
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      stats,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshStats,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
