import { auth, getFirebaseConfigError } from '../firebase/config'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth'

const runtimeConfigErrorCodes = new Set([
    'auth/invalid-api-key',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key',
    'auth/app-not-authorized',
    'auth/auth-domain-config-required',
    'auth/invalid-app-credential',
])

function createUnavailableAuthError() {
    const error = new Error(
        getFirebaseConfigError() ??
        'Firebase Auth není dostupný. Zkontrolujte .env.local a Netlify Environment variables.'
    ) as Error & { code: string }
    error.code = 'auth/config-unavailable'
    return error
}

export function getAuthSetupError(error?: unknown) {
    const configError = getFirebaseConfigError()
    if (configError) return configError

    const code =
        typeof error === 'object' && error && 'code' in error
            ? String((error as { code?: unknown }).code)
            : ''

    if (runtimeConfigErrorCodes.has(code)) {
        return 'Firebase konfigurace je neplatná. Zkontrolujte VITE_FIREBASE_* proměnné v .env.local a v Netlify Environment variables.'
    }

    return null
}

export async function signIn(email: string, password: string) {
    if (!auth) throw createUnavailableAuthError()
    return signInWithEmailAndPassword(auth, email, password)
}

export async function signOutUser() {
    if (!auth) return
    return signOut(auth)
}

export function onAuthChanged(cb: (user: User | null) => void, onError?: (error: unknown) => void) {
    if (!auth) {
        cb(null)
        return () => { }
    }

    try {
        return onAuthStateChanged(auth, cb, onError)
    } catch (error) {
        onError?.(error)
        cb(null)
        return () => { }
    }
}
