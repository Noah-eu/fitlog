import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { TrainingDayPlan, TrainingDayPlanSource, TrainingDayPlanVariant } from '../types/trainingDayPlan'

const KEY = 'fitlog.trainingDayPlans.v1'

type TrainingDayPlanListener = (plan: TrainingDayPlan | null) => void

let currentDateKey = getTodayDateKey()
let currentPlanCache: TrainingDayPlan | null = readLocalTrainingDayPlan(currentDateKey)
let initialized = false
let activeUserId: string | null = null
let activePlanDateKey: string | null = null
let unsubscribeAuth: (() => void) | null = null
let unsubscribeRemote: (() => void) | null = null
const listeners = new Set<TrainingDayPlanListener>()

function toDateKey(date: Date) {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export function getTodayDateKey() {
    return toDateKey(new Date())
}

function safeParse(raw: string | null): Record<string, TrainingDayPlan> {
    if (!raw) return {}

    try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, TrainingDayPlan>
        }
    } catch (error) {
        console.warn('Failed to parse training day plans', error)
    }

    return {}
}

function readAllLocalTrainingDayPlans() {
    if (typeof window === 'undefined') return {}
    return safeParse(localStorage.getItem(KEY))
}

function readLocalTrainingDayPlan(dateKey: string) {
    return normalizeTrainingDayPlan(readAllLocalTrainingDayPlans()[dateKey] ?? null)
}

function writeLocalTrainingDayPlan(plan: TrainingDayPlan) {
    if (typeof window === 'undefined') return

    try {
        const nextPlans = {
            ...readAllLocalTrainingDayPlans(),
            [plan.dateKey]: plan,
        }

        localStorage.setItem(KEY, JSON.stringify(nextPlans))
    } catch (error) {
        console.warn('Failed to persist training day plan locally', error)
    }
}

function normalizeTrainingDayPlan(value: Partial<TrainingDayPlan> | null | undefined) {
    if (!value || typeof value !== 'object') return null

    const dateKey = typeof value.dateKey === 'string' && value.dateKey.trim().length > 0 ? value.dateKey : null
    if (!dateKey) return null

    const exerciseIds = Array.isArray(value.exerciseIds)
        ? Array.from(new Set(value.exerciseIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)))
        : []

    return {
        dateKey,
        exerciseIds,
        variant: value.variant === 'B' || value.variant === 'C' ? value.variant : 'A',
        generatedAt: typeof value.generatedAt === 'string' && value.generatedAt.trim().length > 0 ? value.generatedAt : new Date().toISOString(),
        source: value.source === 'manual' ? 'manual' : 'auto',
        preferencesSnapshot: value.preferencesSnapshot && typeof value.preferencesSnapshot === 'object'
            ? {
                enabledCategories: Array.isArray(value.preferencesSnapshot.enabledCategories)
                    ? Array.from(new Set(value.preferencesSnapshot.enabledCategories.filter((category): category is string => typeof category === 'string' && category.trim().length > 0)))
                    : [],
                targetExerciseCount: typeof value.preferencesSnapshot.targetExerciseCount === 'number' && Number.isFinite(value.preferencesSnapshot.targetExerciseCount)
                    ? value.preferencesSnapshot.targetExerciseCount
                    : 0,
                avoidRecentlyUsedDays: typeof value.preferencesSnapshot.avoidRecentlyUsedDays === 'number' && Number.isFinite(value.preferencesSnapshot.avoidRecentlyUsedDays)
                    ? value.preferencesSnapshot.avoidRecentlyUsedDays
                    : 0,
            }
            : undefined,
    } satisfies TrainingDayPlan
}

function emitTrainingDayPlan(plan: TrainingDayPlan | null, options?: { persistLocal?: boolean }) {
    currentDateKey = getTodayDateKey()
    currentPlanCache = plan

    if (plan && options?.persistLocal) {
        writeLocalTrainingDayPlan(plan)
    }

    listeners.forEach((listener) => listener(currentPlanCache))
}

function getTrainingDayPlanDoc(userId: string, dateKey: string) {
    if (!db) return null
    return doc(db, 'users', userId, 'trainingPlans', dateKey)
}

function stopRemoteSync() {
    unsubscribeRemote?.()
    unsubscribeRemote = null
    activeUserId = null
    activePlanDateKey = null
}

function beginRemoteSync(userId: string, dateKey: string) {
    const dayPlanDoc = getTrainingDayPlanDoc(userId, dateKey)
    if (!dayPlanDoc) {
        emitTrainingDayPlan(readLocalTrainingDayPlan(dateKey), { persistLocal: false })
        return
    }

    if (activeUserId === userId && activePlanDateKey === dateKey && unsubscribeRemote) {
        return
    }

    stopRemoteSync()
    activeUserId = userId
    activePlanDateKey = dateKey

    unsubscribeRemote = onSnapshot(
        dayPlanDoc,
        (snapshot) => {
            const nextPlan = snapshot.exists() ? normalizeTrainingDayPlan(snapshot.data() as Partial<TrainingDayPlan>) : readLocalTrainingDayPlan(dateKey)
            emitTrainingDayPlan(nextPlan, { persistLocal: false })
        },
        (error) => {
            console.warn('Failed to sync training day plan from Firestore', error)
            stopRemoteSync()
            emitTrainingDayPlan(readLocalTrainingDayPlan(dateKey), { persistLocal: false })
        },
    )
}

function initializeStore() {
    if (initialized) return
    initialized = true
    currentDateKey = getTodayDateKey()
    currentPlanCache = readLocalTrainingDayPlan(currentDateKey)

    if (!auth || !db) {
        return
    }

    if (auth.currentUser) {
        beginRemoteSync(auth.currentUser.uid, currentDateKey)
    }

    unsubscribeAuth = onAuthStateChanged(
        auth,
        (user) => {
            const nextDateKey = getTodayDateKey()
            if (user) {
                beginRemoteSync(user.uid, nextDateKey)
                return
            }

            stopRemoteSync()
            emitTrainingDayPlan(readLocalTrainingDayPlan(nextDateKey), { persistLocal: false })
        },
        (error) => {
            console.warn('Training day plan auth observer failed', error)
            stopRemoteSync()
            emitTrainingDayPlan(readLocalTrainingDayPlan(getTodayDateKey()), { persistLocal: false })
        },
    )
}

function getActiveUserId() {
    return auth?.currentUser?.uid ?? null
}

function canUseFirestoreTrainingPlans() {
    return Boolean(db && getActiveUserId())
}

initializeStore()

export function subscribeToTodayTrainingPlan(listener: TrainingDayPlanListener) {
    initializeStore()

    const nextDateKey = getTodayDateKey()
    if (nextDateKey !== currentDateKey) {
        currentDateKey = nextDateKey
        currentPlanCache = readLocalTrainingDayPlan(nextDateKey)

        if (canUseFirestoreTrainingPlans()) {
            beginRemoteSync(getActiveUserId() as string, nextDateKey)
        }
    }

    listeners.add(listener)
    listener(currentPlanCache)

    return () => {
        listeners.delete(listener)
    }
}

export async function saveTodayTrainingPlan(
    exerciseIds: string[],
    options?: { source?: TrainingDayPlanSource; variant?: TrainingDayPlanVariant; preferencesSnapshot?: TrainingDayPlan['preferencesSnapshot'] },
) {
    initializeStore()

    const dateKey = getTodayDateKey()
    const nextPlan = normalizeTrainingDayPlan({
        dateKey,
        exerciseIds,
        variant: options?.variant,
        generatedAt: new Date().toISOString(),
        source: options?.source ?? 'auto',
        preferencesSnapshot: options?.preferencesSnapshot,
    })

    if (!nextPlan) {
        throw new Error('Nepodařilo se připravit dnešní plán tréninku.')
    }

    if (canUseFirestoreTrainingPlans()) {
        const userId = getActiveUserId() as string
        try {
            await setDoc(doc(db!, 'users', userId, 'trainingPlans', dateKey), nextPlan)
            emitTrainingDayPlan(nextPlan, { persistLocal: true })
            return nextPlan
        } catch (error) {
            emitTrainingDayPlan(nextPlan, { persistLocal: true })
            throw error
        }
    }

    emitTrainingDayPlan(nextPlan, { persistLocal: true })
    return nextPlan
}

export async function getRecentTrainingPlans(maxCount = 3): Promise<TrainingDayPlan[]> {
    initializeStore()

    if (canUseFirestoreTrainingPlans()) {
        const userId = getActiveUserId() as string
        const plansCollection = collection(db!, 'users', userId, 'trainingPlans')
        const snapshot = await getDocs(query(plansCollection, orderBy('generatedAt', 'desc'), limit(maxCount)))

        return snapshot.docs
            .map((item) => normalizeTrainingDayPlan(item.data() as Partial<TrainingDayPlan>))
            .filter((item): item is TrainingDayPlan => item !== null)
    }

    return Object.values(readAllLocalTrainingDayPlans())
        .map((plan) => normalizeTrainingDayPlan(plan))
        .filter((plan): plan is TrainingDayPlan => plan !== null)
        .sort((left, right) => {
            if (left.generatedAt !== right.generatedAt) return right.generatedAt.localeCompare(left.generatedAt)
            return right.dateKey.localeCompare(left.dateKey)
        })
        .slice(0, maxCount)
}
