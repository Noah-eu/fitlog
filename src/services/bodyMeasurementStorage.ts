import type { BodyMeasurement } from '../types/body'

const KEY = 'fitlog.body.v1'

function safeParse(raw: string | null): BodyMeasurement[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
    } catch (e) {
        // ignore and return empty
    }
    return []
}

export function getAllMeasurements(): BodyMeasurement[] {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(KEY)
    return safeParse(raw).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
}

export function getMeasurementById(id: string): BodyMeasurement | undefined {
    return getAllMeasurements().find((m) => m.id === id)
}

export function saveMeasurement(entry: Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>): BodyMeasurement {
    const now = new Date().toISOString()
    const id = 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    const full: BodyMeasurement = { ...entry, id, createdAt: now }
    const all = getAllMeasurements()
    all.unshift(full)
    try {
        localStorage.setItem(KEY, JSON.stringify(all))
    } catch (e) {
        console.warn('Failed to save measurement', e)
    }
    return full
}

export function updateMeasurement(id: string, updates: Partial<Omit<BodyMeasurement, 'id' | 'createdAt'>>): BodyMeasurement | null {
    const all = getAllMeasurements()
    const idx = all.findIndex((m) => m.id === id)
    if (idx === -1) return null
    const existing = all[idx]
    const updated: BodyMeasurement = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    updated.id = existing.id
    updated.createdAt = existing.createdAt
    all[idx] = updated
    try {
        localStorage.setItem(KEY, JSON.stringify(all))
    } catch (e) {
        console.warn('Failed to update measurement', e)
    }
    return updated
}

export function deleteMeasurement(id: string): boolean {
    const all = getAllMeasurements()
    const filtered = all.filter((m) => m.id !== id)
    try {
        localStorage.setItem(KEY, JSON.stringify(filtered))
        return true
    } catch (e) {
        console.warn('Failed to delete measurement', e)
        return false
    }
}
