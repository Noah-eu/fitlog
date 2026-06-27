import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const requiredEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

function normalizeEnv(value: string | undefined) {
  return value?.trim() ?? ''
}

function isPlaceholderLike(value: string) {
  const normalized = value.trim().toLowerCase()
  return (
    normalized.length === 0 ||
    normalized.includes('your_') ||
    normalized.includes('your-project') ||
    normalized.includes('yourproject') ||
    normalized.includes('example') ||
    normalized.includes('placeholder') ||
    normalized === 'changeme' ||
    normalized.startsWith('1:123:web:')
  )
}

const firebaseConfig = {
  apiKey: normalizeEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: normalizeEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: normalizeEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  appId: normalizeEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  storageBucket: normalizeEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: normalizeEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
}

const requiredConfigValues = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
} satisfies Record<(typeof requiredEnvKeys)[number], string>

const invalidRequiredKeys = requiredEnvKeys.filter((key) => {
  return isPlaceholderLike(requiredConfigValues[key])
})

const firebaseSetupInstructions =
  'Firebase konfigurace chybí nebo obsahuje zástupné hodnoty. Doplňte VITE_FIREBASE_* proměnné v .env.local pro lokální vývoj a v Netlify Environment variables pro nasazení.'

let firebaseConfigError: string | null = null
let app: FirebaseApp | null = null
let auth: Auth | null = null

if (invalidRequiredKeys.length > 0) {
  firebaseConfigError = firebaseSetupInstructions
} else {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (error) {
    console.warn('Firebase initialization failed', error)
    firebaseConfigError = firebaseSetupInstructions
  }
}

export { app, auth }

export function isFirebaseConfigured() {
  return auth !== null && firebaseConfigError === null
}

export function getFirebaseConfigError() {
  return firebaseConfigError
}
