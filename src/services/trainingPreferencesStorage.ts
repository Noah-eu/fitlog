import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { TrainingPreferences } from '../types/trainingPreferences'

const KEY = 'fitlog.trainingPreferences.v1'
const SETTINGS_DOC_ID = 'trainingPreferences'

export const DEFAULT_TRAINING_CATEGORIES = ['Nohy', 'Ruce', 'Prsa', 'Záda', 'Ramena', 'Zadek', 'Břicho'] as const

type TrainingPreferencesListener = (preferences: TrainingPreferences) => void

let preferencesCache = createDefaultTrainingPreferences()
let initialized = false
let activeUserId: string | null = null
let unsubscribeAuth: (() => void) | null = null
let unsubscribeRemote: (() => void) | null = null
const listeners = new Set<TrainingPreferencesListener>()

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function uniqueStrings(values: unknown) {
    if (!Array.isArray(values)) return []
    return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)))
}

function normalizeEnabledSubcategories(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

    const entries = Object.entries(value).map(([category, subcategories]) => [category, uniqueStrings(subcategories)])
    const filteredEntries = entries.filter(([, subcategories]) => subcategories.length > 0)

    if (filteredEntries.length === 0) return undefined

    return Object.fromEntries(filteredEntries)
}

function createDefaultTrainingPreferences(): TrainingPreferences {
    return {
        style: 'fullBody',
        enabledCategories: [...DEFAULT_TRAINING_CATEGORIES],
        targetExerciseCount: 6,
        avoidRecentlyUsedDays: 3,
        updatedAt: new Date().toISOString(),
    }
}

function normalizeTrainingPreferences(value: Partial<TrainingPreferences> | null | undefined): TrainingPreferences {
    const defaults = createDefaultTrainingPreferences()
    const normalizedEnabledCategories = uniqueStrings(value?.enabledCategories)
    const hasEnabledCategoriesField = Array.isArray(value?.enabledCategories)

    return {
        style: value?.style === 'fullBody' ? value.style : defaults.style,
        enabledCategories: hasEnabledCategoriesField ? normalizedEnabledCategories : defaults.enabledCategories,
        enabledSubcategoriesByCategory: normalizeEnabledSubcategories(value?.enabledSubcategoriesByCategory),
        targetExerciseCount: clamp(
            typeof value?.targetExerciseCount === 'number' && Number.isFinite(value.targetExerciseCount) ? Math.round(value.targetExerciseCount) : defaults.targetExerciseCount,
            3,
            10,
        ),
        avoidRecentlyUsedDays: clamp(
            typeof value?.avoidRecentlyUsedDays === 'number' && Number.isFinite(value.avoidRecentlyUsedDays) ? Math.round(value.avoidRecentlyUsedDays) : defaults.avoidRecentlyUsedDays,
            0,
            14,
        ),
        updatedAt: typeof value?.updatedAt === 'string' && value.updatedAt.trim().length > 0 ? value.updatedAt : defaults.updatedAt,
    }
}

function safeParse(raw: string | null) {
    if (!raw) return createDefaultTrainingPreferences()

    try {
        return normalizeTrainingPreferences(JSON.parse(raw) as Partial<TrainingPreferences>)
    } catch (error) {
        console.warn('Failed to parse training preferences', error)
        return createDefaultTrainingPreferences()
    }
}

function readLocalTrainingPreferences() {
    if (typeof window === 'undefined') return createDefaultTrainingPreferences()
    return safeParse(localStorage.getItem(KEY))
}

function writeLocalTrainingPreferences(preferences: TrainingPreferences) {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(KEY, JSON.stringify(preferences))
    } catch (error) {
        console.warn('Failed to persist training preferences locally', error)
    }
}

function emitTrainingPreferences(nextPreferences: TrainingPreferences, options?: { persistLocal?: boolean }) {
    preferencesCache = normalizeTrainingPreferences(nextPreferences)

    if (options?.persistLocal) {
        writeLocalTrainingPreferences(preferencesCache)
    }

    listeners.forEach((listener) => listener(preferencesCache))
}

function getTrainingPreferencesDoc(userId: string) {
    if (!db) return null
    return doc(db, 'users', userId, 'settings', SETTINGS_DOC_ID)
}

function stopRemoteSync() {
    unsubscribeRemote?.()
    unsubscribeRemote = null
    activeUserId = null
}

function beginRemoteSync(userId: string) {
    const settingsDoc = getTrainingPreferencesDoc(userId)
    if (!settingsDoc) {
        emitTrainingPreferences(readLocalTrainingPreferences(), { persistLocal: false })
        return
    }

    if (activeUserId === userId && unsubscribeRemote) {
        return
    }

    stopRemoteSync()
    activeUserId = userId
    emitTrainingPreferences(createDefaultTrainingPreferences(), { persistLocal: false })

    unsubscribeRemote = onSnapshot(
        settingsDoc,
        (snapshot) => {
            if (!snapshot.exists()) {
                emitTrainingPreferences(createDefaultTrainingPreferences(), { persistLocal: false })
                return
            }

            emitTrainingPreferences(normalizeTrainingPreferences(snapshot.data() as Partial<TrainingPreferences>), { persistLocal: false })
        },
        (error) => {
            console.warn('Failed to sync training preferences from Firestore', error)
            stopRemoteSync()
            emitTrainingPreferences(readLocalTrainingPreferences(), { persistLocal: false })
        },
    )
}

function initializeStore() {
    if (initialized) return
    initialized = true
    preferencesCache = readLocalTrainingPreferences()

    if (!auth || !db) {
        return
    }

    if (auth.currentUser) {
        beginRemoteSync(auth.currentUser.uid)
    }

    unsubscribeAuth = onAuthStateChanged(
        auth,
        (user) => {
            if (user) {
                beginRemoteSync(user.uid)
                return
            }

            stopRemoteSync()
            emitTrainingPreferences(readLocalTrainingPreferences(), { persistLocal: false })
        },
        (error) => {
            console.warn('Training preferences auth observer failed', error)
            stopRemoteSync()
            emitTrainingPreferences(readLocalTrainingPreferences(), { persistLocal: false })
        },
    )
}

function getActiveUserId() {
    return auth?.currentUser?.uid ?? null
}

function canUseFirestoreTrainingPreferences() {
    return Boolean(db && getActiveUserId())
}

initializeStore()

export function getDefaultTrainingPreferences() {
    return createDefaultTrainingPreferences()
}

export function subscribeToTrainingPreferences(listener: TrainingPreferencesListener) {
    initializeStore()
    listeners.add(listener)
    listener(preferencesCache)

    return () => {
        listeners.delete(listener)
    }
}

export function getTrainingPreferences() {
    initializeStore()
    return preferencesCache
}

export async function saveTrainingPreferences(input: Partial<TrainingPreferences> | TrainingPreferences) {
    initializeStore()

    const nextPreferences = normalizeTrainingPreferences({
        ...preferencesCache,
        ...input,
        updatedAt: new Date().toISOString(),
    })

    function removeUndefinedFields<T extends Record<string, any>>(obj: T): Record<string, any> {
        const out: Record<string, any> = {}

        for (const [key, val] of Object.entries(obj)) {
            if (val === undefined) continue

            if (val === null) {
                out[key] = null
                continue
            }

            if (Array.isArray(val)) {
                out[key] = val.filter((x) => x !== undefined)
                continue
            }

            if (typeof val === 'object') {
                // sanitize nested object (used for enabledSubcategoriesByCategory)
                const nested = Object.entries(val as Record<string, any>)
                    .map(([k, v]) => [k, Array.isArray(v) ? (v as any[]).filter((x) => x !== undefined) : v])
                    .filter(([, v]) => v !== undefined && (!(Array.isArray(v) && (v as any[]).length === 0)))

                if (nested.length > 0) {
                    out[key] = Object.fromEntries(nested as [string, any][])
                } else {
                    // omit empty nested objects
                }

                continue
            }

            out[key] = val
        }

        return out
    }

    const payload = removeUndefinedFields(nextPreferences as any)

    if (canUseFirestoreTrainingPreferences()) {
        const userId = getActiveUserId() as string
        await setDoc(doc(db!, 'users', userId, 'settings', SETTINGS_DOC_ID), payload)
        emitTrainingPreferences(nextPreferences)
        return nextPreferences
    }

    emitTrainingPreferences(nextPreferences, { persistLocal: true })
    return nextPreferences
}
