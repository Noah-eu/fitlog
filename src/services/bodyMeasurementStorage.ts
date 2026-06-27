import { onAuthStateChanged } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { BodyMeasurement } from '../types/body'

const KEY = 'fitlog.body.v1'

type BodyMeasurementInput = Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>
type BodyMeasurementUpdate = Partial<Omit<BodyMeasurement, 'id' | 'createdAt'>>
type MeasurementsListener = (measurements: BodyMeasurement[]) => void
type NumericMeasurementField = 'bodyWeight' | 'chest' | 'waist' | 'biceps' | 'thighs'

const NUMERIC_FIELDS: NumericMeasurementField[] = ['bodyWeight', 'chest', 'waist', 'biceps', 'thighs']

let measurementsCache: BodyMeasurement[] = []
let initialized = false
let activeUserId: string | null = null
let unsubscribeAuth: (() => void) | null = null
let unsubscribeRemote: (() => void) | null = null
const listeners = new Set<MeasurementsListener>()

function compareMeasurementsDesc(a: BodyMeasurement, b: BodyMeasurement): number {
    if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt)
    return b.date.localeCompare(a.date)
}

function normalizeNumericValue(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeMeasurement(measurement: BodyMeasurement): BodyMeasurement {
    const normalized: BodyMeasurement = {
        ...measurement,
        createdAt: measurement.createdAt ?? measurement.date ?? new Date().toISOString(),
        updatedAt: measurement.updatedAt ?? measurement.createdAt ?? measurement.date ?? new Date().toISOString(),
    }

    for (const field of NUMERIC_FIELDS) {
        normalized[field] = normalizeNumericValue(measurement[field])
    }

    return normalized
}

function normalizeMeasurementPayload(measurement: BodyMeasurementInput | BodyMeasurementUpdate) {
    const normalizedPayload: BodyMeasurementInput | BodyMeasurementUpdate = {
        ...measurement,
    }

    for (const field of NUMERIC_FIELDS) {
        normalizedPayload[field] = normalizeNumericValue(measurement[field])
    }

    return normalizedPayload
}

function safeParse(raw: string | null): BodyMeasurement[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return (parsed as BodyMeasurement[]).map(normalizeMeasurement)
    } catch (error) {
        console.warn('Failed to parse body measurements', error)
    }
    return []
}

function readLocalMeasurements(): BodyMeasurement[] {
    if (typeof window === 'undefined') return []
    return safeParse(localStorage.getItem(KEY)).sort(compareMeasurementsDesc)
}

function writeLocalMeasurements(measurements: BodyMeasurement[]) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(KEY, JSON.stringify(measurements))
    } catch (error) {
        console.warn('Failed to persist body measurements locally', error)
    }
}

function emitMeasurements(nextMeasurements: BodyMeasurement[], options?: { persistLocal?: boolean }) {
    measurementsCache = [...nextMeasurements].sort(compareMeasurementsDesc)

    if (options?.persistLocal) {
        writeLocalMeasurements(measurementsCache)
    }

    listeners.forEach((listener) => listener(measurementsCache))
}

function getUserMeasurementsCollection(userId: string) {
    if (!db) return null
    return collection(db, 'users', userId, 'bodyMeasurements')
}

function stopRemoteSync() {
    unsubscribeRemote?.()
    unsubscribeRemote = null
    activeUserId = null
}

function beginRemoteSync(userId: string) {
    const measurementsCollection = getUserMeasurementsCollection(userId)
    if (!measurementsCollection) {
        emitMeasurements(readLocalMeasurements(), { persistLocal: false })
        return
    }

    if (activeUserId === userId && unsubscribeRemote) {
        return
    }

    stopRemoteSync()
    activeUserId = userId
    emitMeasurements([], { persistLocal: false })

    unsubscribeRemote = onSnapshot(
        query(measurementsCollection, orderBy('createdAt', 'desc')),
        (snapshot) => {
            const nextMeasurements = snapshot.docs.map((item) => {
                const data = item.data() as Omit<BodyMeasurement, 'id'>
                return normalizeMeasurement({
                    ...data,
                    id: item.id,
                })
            })

            emitMeasurements(nextMeasurements, { persistLocal: false })
        },
        (error) => {
            console.warn('Failed to sync body measurements from Firestore', error)
            stopRemoteSync()
            emitMeasurements(readLocalMeasurements(), { persistLocal: false })
        },
    )
}

function initializeStore() {
    if (initialized) return
    initialized = true
    measurementsCache = readLocalMeasurements()

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
        emitMeasurements(readLocalMeasurements(), { persistLocal: false })
    }, (error) => {
        console.warn('Body measurement auth observer failed', error)
        stopRemoteSync()
        emitMeasurements(readLocalMeasurements(), { persistLocal: false })
    })
}

function upsertMeasurementInCache(measurement: BodyMeasurement, options?: { persistLocal?: boolean }) {
    const nextMeasurements = [measurement, ...measurementsCache.filter((item) => item.id !== measurement.id)]
    emitMeasurements(nextMeasurements, options)
}

function removeMeasurementFromCache(id: string, options?: { persistLocal?: boolean }) {
    emitMeasurements(measurementsCache.filter((measurement) => measurement.id !== id), options)
}

function getActiveUserId() {
    return auth?.currentUser?.uid ?? null
}

function canUseFirestoreMeasurements() {
    return Boolean(db && getActiveUserId())
}

initializeStore()

export function subscribeToMeasurements(listener: MeasurementsListener) {
    initializeStore()
    listeners.add(listener)
    listener(measurementsCache)

    return () => {
        listeners.delete(listener)
    }
}

export function getAllMeasurements(): BodyMeasurement[] {
    initializeStore()
    return measurementsCache
}

export function getMeasurementById(id: string): BodyMeasurement | undefined {
    return getAllMeasurements().find((measurement) => measurement.id === id)
}

export function getLocalBodyMeasurements(): BodyMeasurement[] {
    return readLocalMeasurements()
}

export async function saveMeasurement(entry: BodyMeasurementInput): Promise<BodyMeasurement> {
    initializeStore()

    const now = new Date().toISOString()
    const id = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    const full = normalizeMeasurement({
        ...normalizeMeasurementPayload(entry),
        id,
        createdAt: now,
        updatedAt: now,
    } as BodyMeasurement)

    if (canUseFirestoreMeasurements()) {
        const userId = getActiveUserId() as string
        await setDoc(doc(db!, 'users', userId, 'bodyMeasurements', full.id), full)
        upsertMeasurementInCache(full)
        return full
    }

    upsertMeasurementInCache(full, { persistLocal: true })
    return full
}

export async function updateMeasurement(id: string, updates: BodyMeasurementUpdate): Promise<BodyMeasurement | null> {
    initializeStore()

    const existing = getMeasurementById(id)
    if (!existing) return null

    const updated = normalizeMeasurement({
        ...existing,
        ...normalizeMeasurementPayload(updates),
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
    })

    if (canUseFirestoreMeasurements()) {
        const userId = getActiveUserId() as string
        await updateDoc(doc(db!, 'users', userId, 'bodyMeasurements', id), {
            ...normalizeMeasurementPayload(updates),
            updatedAt: updated.updatedAt,
        })
        upsertMeasurementInCache(updated)
        return updated
    }

    upsertMeasurementInCache(updated, { persistLocal: true })
    return updated
}

export async function deleteMeasurement(id: string): Promise<boolean> {
    initializeStore()

    if (canUseFirestoreMeasurements()) {
        const userId = getActiveUserId() as string
        await deleteDoc(doc(db!, 'users', userId, 'bodyMeasurements', id))
        removeMeasurementFromCache(id)
        return true
    }

    removeMeasurementFromCache(id, { persistLocal: true })
    return true
}

export async function importLocalBodyMeasurementsToCloud(): Promise<number> {
    initializeStore()

    if (!canUseFirestoreMeasurements()) {
        throw new Error('Cloud sync měření není dostupný.')
    }

    const localMeasurements = readLocalMeasurements()
    if (localMeasurements.length === 0) {
        return 0
    }

    const userId = getActiveUserId() as string

    await Promise.all(
        localMeasurements.map((measurement) => {
            const cloudMeasurement: BodyMeasurement = {
                ...measurement,
                updatedAt: measurement.updatedAt ?? measurement.createdAt,
            }

            return setDoc(doc(db!, 'users', userId, 'bodyMeasurements', measurement.id), cloudMeasurement)
        }),
    )

    return localMeasurements.length
}
