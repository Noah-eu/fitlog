import type { Exercise } from '../types/exercise'
import type { TrainingPreferences } from '../types/trainingPreferences'
import type { WorkoutEntry } from '../types/workout'
import { getWorkoutDateKey } from './workoutStorage'

export type TrainingRecommendation = {
    exercise: Exercise
    lastUsedDateKey: string | null
    isRecentlyUsed: boolean
}

const FULL_BODY_CATEGORY_PRIORITY = ['Nohy', 'Záda', 'Prsa', 'Ramena', 'Ruce', 'Zadek', 'Břicho']

function toDateKey(date: Date) {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

function parseDateKey(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number)
    return new Date(year, month - 1, day, 12)
}

function isWithinRecentWindow(dateKey: string | null, days: number) {
    if (!dateKey || days <= 0) return false

    const today = parseDateKey(toDateKey(new Date()))
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - (days - 1))
    const lastUsed = parseDateKey(dateKey)
    return lastUsed >= cutoff && lastUsed <= today
}

function buildLastUsedDateMap(entries: WorkoutEntry[]) {
    return entries.reduce<Map<string, string>>((map, entry) => {
        const nextDayKey = getWorkoutDateKey(entry.date)
        const existing = map.get(entry.exerciseId)
        if (!existing || nextDayKey > existing) {
            map.set(entry.exerciseId, nextDayKey)
        }
        return map
    }, new Map())
}

function sortRecommendations(left: TrainingRecommendation, right: TrainingRecommendation) {
    const leftKey = left.lastUsedDateKey ?? ''
    const rightKey = right.lastUsedDateKey ?? ''

    if (leftKey !== rightKey) {
        return leftKey.localeCompare(rightKey)
    }

    if ((left.exercise.subcategory ?? '') !== (right.exercise.subcategory ?? '')) {
        return (left.exercise.subcategory ?? '').localeCompare(right.exercise.subcategory ?? '')
    }

    return left.exercise.name.localeCompare(right.exercise.name, 'cs')
}

function getOrderedCategories(preferences: TrainingPreferences) {
    const enabled = preferences.enabledCategories
    const prioritized = FULL_BODY_CATEGORY_PRIORITY.filter((category) => enabled.includes(category))
    const rest = enabled.filter((category) => !FULL_BODY_CATEGORY_PRIORITY.includes(category)).sort((left, right) => left.localeCompare(right, 'cs'))
    return [...prioritized, ...rest]
}

function matchesSubcategoryPreference(exercise: Exercise, preferences: TrainingPreferences) {
    const allowedSubcategories = preferences.enabledSubcategoriesByCategory?.[exercise.category]
    if (!allowedSubcategories || allowedSubcategories.length === 0) return true
    if (!exercise.subcategory) return false
    return allowedSubcategories.includes(exercise.subcategory)
}

function takeRoundRobin(
    categories: string[],
    buckets: Map<string, TrainingRecommendation[]>,
    selected: TrainingRecommendation[],
    selectedIds: Set<string>,
    targetCount: number,
) {
    let pickedAny = true

    while (selected.length < targetCount && pickedAny) {
        pickedAny = false

        for (const category of categories) {
            const bucket = buckets.get(category)
            if (!bucket) continue

            while (bucket.length > 0 && selectedIds.has(bucket[0].exercise.id)) {
                bucket.shift()
            }

            const nextItem = bucket.shift()
            if (!nextItem) continue

            selected.push(nextItem)
            selectedIds.add(nextItem.exercise.id)
            pickedAny = true

            if (selected.length >= targetCount) {
                break
            }
        }
    }
}

export function buildTodayRecommendations(
    catalog: Exercise[],
    entries: WorkoutEntry[],
    preferences: TrainingPreferences,
) {
    const orderedCategories = getOrderedCategories(preferences)
    if (orderedCategories.length === 0) return []

    const lastUsedDateByExercise = buildLastUsedDateMap(entries)
    const allBuckets = new Map<string, TrainingRecommendation[]>()
    const freshBuckets = new Map<string, TrainingRecommendation[]>()

    for (const category of orderedCategories) {
        const recommendations = catalog
            .filter((exercise) => exercise.category === category)
            .filter((exercise) => matchesSubcategoryPreference(exercise, preferences))
            .map((exercise) => {
                const lastUsedDateKey = lastUsedDateByExercise.get(exercise.id) ?? null
                return {
                    exercise,
                    lastUsedDateKey,
                    isRecentlyUsed: isWithinRecentWindow(lastUsedDateKey, preferences.avoidRecentlyUsedDays),
                }
            })
            .sort(sortRecommendations)

        allBuckets.set(category, [...recommendations])
        freshBuckets.set(category, recommendations.filter((item) => !item.isRecentlyUsed))
    }

    const selected: TrainingRecommendation[] = []
    const selectedIds = new Set<string>()
    takeRoundRobin(orderedCategories, freshBuckets, selected, selectedIds, preferences.targetExerciseCount)
    takeRoundRobin(orderedCategories, allBuckets, selected, selectedIds, preferences.targetExerciseCount)

    return selected
}