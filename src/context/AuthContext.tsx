import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChanged, signIn, signOutUser } from '../services/authService'
import type { User } from 'firebase/auth'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function login(email: string, password: string) {
    await signIn(email, password)
  }

  async function logout() {
    await signOutUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page"><p>Načítám...</p></div>
  if (!user) {
    // client-side redirect to login
    window.location.href = '/login'
    return null
  }
  return children
}
