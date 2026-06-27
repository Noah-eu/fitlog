import { onAuthStateChanged } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { WorkoutEntry } from '../types/workout'

const KEY = 'fitlog.workouts.v1'

type WorkoutEntryInput = Omit<WorkoutEntry, 'id' | 'createdAt' | 'updatedAt'>
type WorkoutEntryUpdate = Partial<Omit<WorkoutEntry, 'id' | 'createdAt'>>
type EntriesListener = (entries: WorkoutEntry[]) => void

let entriesCache: WorkoutEntry[] = []
let initialized = false
let activeUserId: string | null = null
let unsubscribeAuth: (() => void) | null = null
let unsubscribeRemote: (() => void) | null = null
const listeners = new Set<EntriesListener>()

function compareEntriesDesc(a: WorkoutEntry, b: WorkoutEntry): number {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
}

function safeParse(raw: string | null): WorkoutEntry[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as WorkoutEntry[]
    } catch (error) {
        console.warn('Failed to parse workout entries', error)
    }
    return []
}

function readLocalEntries(): WorkoutEntry[] {
    if (typeof window === 'undefined') return []
    return safeParse(localStorage.getItem(KEY)).sort(compareEntriesDesc)
}

function writeLocalEntries(entries: WorkoutEntry[]) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(KEY, JSON.stringify(entries))
    } catch (error) {
        console.warn('Failed to persist workout entries locally', error)
    }
}

function emitEntries(nextEntries: WorkoutEntry[], options?: { persistLocal?: boolean }) {
    entriesCache = [...nextEntries].sort(compareEntriesDesc)

    if (options?.persistLocal) {
        writeLocalEntries(entriesCache)
    }

    listeners.forEach((listener) => listener(entriesCache))
}

function getUserEntriesCollection(userId: string) {
    if (!db) return null
    return collection(db, 'users', userId, 'workoutEntries')
}

function stopRemoteSync() {
    unsubscribeRemote?.()
    unsubscribeRemote = null
    activeUserId = null
}

function beginRemoteSync(userId: string) {
    const entriesCollection = getUserEntriesCollection(userId)
    if (!entriesCollection) {
        emitEntries(readLocalEntries(), { persistLocal: false })
        return
    }

    if (activeUserId === userId && unsubscribeRemote) {
        return
    }

    stopRemoteSync()
    activeUserId = userId
    emitEntries([], { persistLocal: false })

    unsubscribeRemote = onSnapshot(
        query(entriesCollection, orderBy('date', 'desc')),
        (snapshot) => {
            const nextEntries = snapshot.docs.map((item) => {
                const data = item.data() as Omit<WorkoutEntry, 'id'>
                return {
                    ...data,
                    id: item.id,
                }
            })

            emitEntries(nextEntries, { persistLocal: false })
        },
        (error) => {
            console.warn('Failed to sync workout entries from Firestore', error)
            stopRemoteSync()
            emitEntries(readLocalEntries(), { persistLocal: false })
        },
    )
}

function initializeStore() {
    if (initialized) return
    initialized = true
    entriesCache = readLocalEntries()

    if (!auth || !db) {
        return
    }

    if (auth.currentUser) {
        beginRemoteSync(auth.currentUser.uid)
    }

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            beginRemoteSync(user.uid)
            return
        }

        stopRemoteSync()
        emitEntries(readLocalEntries(), { persistLocal: false })
    }, (error) => {
        console.warn('Workout auth observer failed', error)
        stopRemoteSync()
        emitEntries(readLocalEntries(), { persistLocal: false })
    })
}

function upsertEntryInCache(entry: WorkoutEntry, options?: { persistLocal?: boolean }) {
    const nextEntries = [entry, ...entriesCache.filter((item) => item.id !== entry.id)]
    emitEntries(nextEntries, options)
}

function removeEntryFromCache(id: string, options?: { persistLocal?: boolean }) {
    emitEntries(entriesCache.filter((entry) => entry.id !== id), options)
}

function getActiveUserId() {
    return auth?.currentUser?.uid ?? null
}

function canUseFirestoreWorkouts() {
    return Boolean(db && getActiveUserId())
}

initializeStore()

export function subscribeToEntries(listener: EntriesListener) {
    initializeStore()
    listeners.add(listener)
    listener(entriesCache)

    return () => {
        listeners.delete(listener)
    }
}

export function getAllEntries(): WorkoutEntry[] {
    initializeStore()
    return entriesCache
}

export function getWorkoutDateKey(date: string): string {
    return date.slice(0, 10)
}

export function toStoredWorkoutDate(dateKey: string): string {
    return `${dateKey}T12:00:00.000Z`
}

export function getEntriesByExercise(exerciseId: string): WorkoutEntry[] {
    return getAllEntries().filter((entry) => entry.exerciseId === exerciseId)
}

export function getEntryById(id: string): WorkoutEntry | undefined {
    return getAllEntries().find((entry) => entry.id === id)
}

export function getLocalWorkoutEntries(): WorkoutEntry[] {
    return readLocalEntries()
}

export async function saveEntry(entry: WorkoutEntryInput): Promise<WorkoutEntry> {
    initializeStore()

    const now = new Date().toISOString()
    const id = 'w-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    const full: WorkoutEntry = { ...entry, id, createdAt: now, updatedAt: now }

    if (canUseFirestoreWorkouts()) {
        const userId = getActiveUserId() as string
        await setDoc(doc(db!, 'users', userId, 'workoutEntries', full.id), full)
        upsertEntryInCache(full)
        return full
    }

    upsertEntryInCache(full, { persistLocal: true })
    return full
}

export async function updateEntry(id: string, updates: WorkoutEntryUpdate): Promise<WorkoutEntry | null> {
    initializeStore()

    const existing = getEntryById(id)
    if (!existing) return null

    const updated: WorkoutEntry = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
    }

    if (canUseFirestoreWorkouts()) {
        const userId = getActiveUserId() as string
        await updateDoc(doc(db!, 'users', userId, 'workoutEntries', id), {
            ...updates,
            updatedAt: updated.updatedAt,
        })
        upsertEntryInCache(updated)
        return updated
    }

    upsertEntryInCache(updated, { persistLocal: true })
    return updated
}

export async function deleteEntry(id: string): Promise<boolean> {
    initializeStore()

    if (canUseFirestoreWorkouts()) {
        const userId = getActiveUserId() as string
        await deleteDoc(doc(db!, 'users', userId, 'workoutEntries', id))
        removeEntryFromCache(id)
        return true
    }

    removeEntryFromCache(id, { persistLocal: true })
    return true
}

export async function importLocalWorkoutEntriesToCloud(): Promise<number> {
    initializeStore()

    if (!canUseFirestoreWorkouts()) {
        throw new Error('Cloud sync workoutů není dostupný.')
    }

    const localEntries = readLocalEntries()
    if (localEntries.length === 0) {
        return 0
    }

    const userId = getActiveUserId() as string

    await Promise.all(
        localEntries.map((entry) => {
            const cloudEntry: WorkoutEntry = {
                ...entry,
                updatedAt: entry.updatedAt ?? entry.createdAt,
            }

            return setDoc(doc(db!, 'users', userId, 'workoutEntries', entry.id), cloudEntry)
        }),
    )

    return localEntries.length
}
