import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

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

function looksLikeApiKey(value: string) {
  return /^AIza[\w-]{20,}$/.test(value)
}

function looksLikeAuthDomain(value: string) {
  return /\.(firebaseapp\.com|web\.app)$/i.test(value)
}

function looksLikeProjectId(value: string) {
  return /^[a-z0-9-]{4,}$/.test(value)
}

function looksLikeAppId(value: string) {
  return /^\d+:\d+:web:[a-z0-9]+$/i.test(value)
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

const missingOrPlaceholderKeys = requiredEnvKeys.filter((key) => {
  return isPlaceholderLike(requiredConfigValues[key])
})

const malformedRequiredKeys = requiredEnvKeys.filter((key) => {
  const value = requiredConfigValues[key]
  if (isPlaceholderLike(value)) return false

  switch (key) {
    case 'VITE_FIREBASE_API_KEY':
      return !looksLikeApiKey(value)
    case 'VITE_FIREBASE_AUTH_DOMAIN':
      return !looksLikeAuthDomain(value)
    case 'VITE_FIREBASE_PROJECT_ID':
      return !looksLikeProjectId(value)
    case 'VITE_FIREBASE_APP_ID':
      return !looksLikeAppId(value)
    default:
      return false
  }
})

function buildFirebaseSetupError() {
  if (missingOrPlaceholderKeys.length === 0 && malformedRequiredKeys.length === 0) {
    return null
  }

  const missingText =
    missingOrPlaceholderKeys.length > 0
      ? `Chybí nebo obsahují zástupné hodnoty: ${missingOrPlaceholderKeys.join(', ')}.`
      : ''

  const malformedText =
    malformedRequiredKeys.length > 0
      ? `Neplatný formát mají: ${malformedRequiredKeys.join(', ')}.`
      : ''

  return [
    'Firebase konfigurace není připravená pro přihlášení.',
    missingText,
    malformedText,
    'Doplňte platné VITE_FIREBASE_* proměnné v .env.local pro lokální vývoj a v Netlify Environment variables pro nasazení.',
  ]
    .filter(Boolean)
    .join(' ')
}

const firebaseSetupInstructions = buildFirebaseSetupError()

let firebaseConfigError: string | null = null
let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (firebaseSetupInstructions) {
  firebaseConfigError = firebaseSetupInstructions
} else {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
  } catch (error) {
    console.warn('Firebase initialization failed', error)
    firebaseConfigError =
      'Firebase konfigurace se nepodařilo inicializovat. Zkontrolujte VITE_FIREBASE_* proměnné v .env.local a v Netlify Environment variables.'
  }
}

export { app, auth, db }

export function isFirebaseConfigured() {
  return auth !== null && firebaseConfigError === null
}

export function getFirebaseConfigError() {
  return firebaseConfigError
}
