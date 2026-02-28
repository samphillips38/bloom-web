import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api, User, UserStats } from '../lib/api'

interface AuthContextType {
  user: User | null
  stats: UserStats | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  appleLogin: (idToken: string, user?: { name?: { firstName?: string; lastName?: string } }) => Promise<void>
  logout: () => void
  refreshStats: () => Promise<void>
  setDailyGoal: (goal: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshStats = useCallback(async () => {
    try {
      const statsRes = await api.getUserStats()
      setStats(statsRes)
    } catch {
      // Stats might fail if no progress yet
    }
  }, [])

  useEffect(() => {
    if (api.hasTokens()) {
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
      api.clearTokens()
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const res = await api.login(email, password)
    setUser(res.user)
    await refreshStats()
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.register(name, email, password)
    setUser(res.user)
    await refreshStats()
  }

  async function handleGoogleLogin(credential: string) {
    const res = await api.googleLogin(credential)
    setUser(res.user)
    await refreshStats()
  }

  async function handleAppleLogin(
    idToken: string,
    appleUser?: { name?: { firstName?: string; lastName?: string } },
  ) {
    const res = await api.appleLogin(idToken, appleUser)
    setUser(res.user)
    await refreshStats()
  }

  async function logout() {
    await api.logout()
    setUser(null)
    setStats(null)
  }

  async function handleSetDailyGoal(goal: number) {
    await api.setDailyGoal(goal)
    await refreshStats()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        googleLogin: handleGoogleLogin,
        appleLogin: handleAppleLogin,
        logout,
        refreshStats,
        setDailyGoal: handleSetDailyGoal,
      }}
    >
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
