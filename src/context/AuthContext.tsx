import React, { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getFirebaseConfigError, isFirebaseConfigured } from '../firebase/config'
import { getAuthSetupError, onAuthChanged, signIn, signOutUser } from '../services/authService'
import type { User } from 'firebase/auth'

type AuthContextValue = {
    user: User | null
    loading: boolean
    setupError: string | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [setupError, setSetupError] = useState<string | null>(getFirebaseConfigError())
    const [loading, setLoading] = useState(() => isFirebaseConfigured())

    useEffect(() => {
        if (!isFirebaseConfigured()) {
            setLoading(false)
            return
        }

        const unsub = onAuthChanged(
            (u) => {
                setUser(u)
                setLoading(false)
            },
            (error) => {
                const message = getAuthSetupError(error)
                if (message) {
                    setSetupError(message)
                }
                setLoading(false)
            }
        )

        return () => unsub()
    }, [])

    async function login(email: string, password: string) {
        try {
            await signIn(email, password)
        } catch (error) {
            const message = getAuthSetupError(error)
            if (message) {
                setSetupError(message)
            }
            throw error
        }
    }

    async function logout() {
        await signOutUser()
    }

    return (
        <AuthContext.Provider value={{ user, loading, setupError, login, logout }}>{children}</AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export function FirebaseSetupScreen({ message }: { message?: string | null }) {
    return (
        <div className="page setup-page">
            <div className="setup-card">
                <h1>Firebase není nastavený</h1>
                <p>{message ?? 'Aplikace potřebuje platné VITE_FIREBASE_* proměnné, aby bylo možné použít přihlášení.'}</p>
                <p>Nastavte hodnoty v `.env.local` pro lokální vývoj a v Netlify Environment variables pro nasazení.</p>
                <div className="setup-code">
                    VITE_FIREBASE_API_KEY<br />
                    VITE_FIREBASE_AUTH_DOMAIN<br />
                    VITE_FIREBASE_PROJECT_ID<br />
                    VITE_FIREBASE_APP_ID
                </div>
            </div>
        </div>
    )
}

export function RequireAuth({ children }: { children: React.ReactElement }) {
    const { user, loading, setupError } = useAuth()
    if (loading) return <div className="page"><p>Načítám...</p></div>
    if (setupError) return <FirebaseSetupScreen message={setupError} />
    if (!user) {
        return <Navigate to="/login" replace />
    }
    return children
}
