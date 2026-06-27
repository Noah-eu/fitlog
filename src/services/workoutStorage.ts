import type { WorkoutEntry } from '../types/workout'

const KEY = 'fitlog.workouts.v1'

function safeParse(raw: string | null): WorkoutEntry[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
    } catch (e) {
        // ignore and return empty
    }
    return []
}

export function getAllEntries(): WorkoutEntry[] {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(KEY)
    return safeParse(raw).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
}

export function getEntriesByExercise(exerciseId: string): WorkoutEntry[] {
    return getAllEntries().filter((e) => e.exerciseId === exerciseId)
}

export function saveEntry(entry: Omit<WorkoutEntry, 'id' | 'createdAt'>): WorkoutEntry {
    const now = new Date().toISOString()
    const id = 'w-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    const full: WorkoutEntry = { ...entry, id, createdAt: now }
    const all = getAllEntries()
    all.unshift(full)
    try {
        localStorage.setItem(KEY, JSON.stringify(all))
    } catch (e) {
        console.warn('Failed to save workout entry', e)
    }
    return full
}

export function getEntryById(id: string): WorkoutEntry | undefined {
    return getAllEntries().find((e) => e.id === id)
}

export function updateEntry(id: string, updates: Partial<Omit<WorkoutEntry, 'id' | 'createdAt'>>): WorkoutEntry | null {
    const all = getAllEntries()
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) return null
    const existing = all[idx]
    const updated: WorkoutEntry = { ...existing, ...updates }
    // keep createdAt stable; ensure id is preserved
    updated.id = existing.id
    updated.createdAt = existing.createdAt
    all[idx] = updated
    try {
        localStorage.setItem(KEY, JSON.stringify(all))
    } catch (e) {
        console.warn('Failed to update workout entry', e)
    }
    return updated
}

export function deleteEntry(id: string): boolean {
    const all = getAllEntries()
    const filtered = all.filter((e) => e.id !== id)
    try {
        localStorage.setItem(KEY, JSON.stringify(filtered))
        return true
    } catch (e) {
        console.warn('Failed to delete workout entry', e)
        return false
    }
}
