import type { Exercise } from '../types/exercise'
import type { TrainingDayPlan, TrainingDayPlanVariant } from '../types/trainingDayPlan'
import type { TrainingPreferences } from '../types/trainingPreferences'
import type { WorkoutEntry } from '../types/workout'
import { resolveExerciseId } from '../data/exercises'
import { getWorkoutDateKey } from './workoutStorage'

export type TrainingRecommendation = {
    exercise: Exercise
    lastUsedDateKey: string | null
    isRecentlyUsed: boolean
}

const FULL_BODY_CATEGORY_PRIORITY = ['Nohy', 'Záda', 'Prsa', 'Ramena', 'Ruce', 'Zadek', 'Břicho']
const FULL_BODY_VARIANT_SEQUENCE: TrainingDayPlanVariant[] = ['A', 'B', 'C']

type VariantSlot = {
    categories: string[]
    preferredSubcategories?: string[]
    preferredExerciseIds?: string[]
}

const FULL_BODY_VARIANT_BLUEPRINTS: Record<TrainingDayPlanVariant, VariantSlot[]> = {
    A: [
        { categories: ['Nohy'], preferredSubcategories: ['Kvadricepsy'], preferredExerciseIds: ['squat', 'leg-press', 'hack-squat', 'leg-extension'] },
        { categories: ['Prsa'], preferredSubcategories: ['Tlaky'], preferredExerciseIds: ['bench-press', 'dumbbell-press', 'chest-machine-press'] },
        { categories: ['Záda'], preferredSubcategories: ['Horizontální tahy'], preferredExerciseIds: ['rowing', 'seated-cable-row', 'machine-row', 't-bar-row'] },
        { categories: ['Ramena'], preferredSubcategories: ['Tlaky', 'Boční / přední delty'], preferredExerciseIds: ['shoulder-press', 'military-press', 'lateral-raise'] },
        { categories: ['Ruce'], preferredSubcategories: ['Biceps', 'Triceps'], preferredExerciseIds: ['biceps-curl', 'barbell-biceps-curl', 'triceps-pushdown'] },
        { categories: ['Břicho', 'Zadek'], preferredExerciseIds: ['hip-thrust', 'glute-bridge'] },
    ],
    B: [
        { categories: ['Nohy', 'Zadek'], preferredSubcategories: ['Hamstringy', 'Tahy', 'Hip thrust / bridge'], preferredExerciseIds: ['romanian-deadlift', 'leg-curl', 'hip-thrust', 'deadlift', 'trap-bar'] },
        { categories: ['Záda'], preferredSubcategories: ['Vertikální tahy'], preferredExerciseIds: ['lat-pulldown', 'pull-ups'] },
        { categories: ['Prsa'], preferredSubcategories: ['Izolace', 'Pullover', 'Tlaky'], preferredExerciseIds: ['incline-press', 'pec-deck', 'flyes', 'dumbbell-pullover'] },
        { categories: ['Ramena'], preferredSubcategories: ['Zadní delty', 'Boční / přední delty'], preferredExerciseIds: ['face-pull', 'rear-delt-machine', 'lateral-raise'] },
        { categories: ['Ruce'], preferredSubcategories: ['Triceps', 'Předloktí', 'Biceps'], preferredExerciseIds: ['triceps-pushdown', 'rope-triceps-pushdown', 'hammer-curl'] },
        { categories: ['Břicho'], preferredSubcategories: ['Stabilizace', 'Flexe', 'Rotace', 'Vis / kolečko'] },
    ],
    C: [
        { categories: ['Nohy'], preferredSubcategories: ['Jednonožní', 'Addukce / abdukce', 'Kvadricepsy'], preferredExerciseIds: ['lunges', 'bulgarian-split-squat', 'step-up', 'leg-extension'] },
        { categories: ['Záda'], preferredSubcategories: ['Mrtvé tahy', 'Horizontální tahy', 'Vertikální tahy'], preferredExerciseIds: ['deadlift', 'machine-row', 'one-arm-dumbbell-row', 'lat-pulldown'] },
        { categories: ['Prsa'], preferredSubcategories: ['Kliky / dipy', 'Izolace', 'Tlaky'], preferredExerciseIds: ['push-ups', 'chest-dips', 'pec-deck', 'flyes', 'chest-machine-press'] },
        { categories: ['Ramena'], preferredSubcategories: ['Boční / přední delty', 'Zadní delty', 'Tlaky'], preferredExerciseIds: ['lateral-raise', 'front-raise', 'rear-delt-machine', 'arnold-press'] },
        { categories: ['Ruce'], preferredSubcategories: ['Biceps', 'Triceps', 'Předloktí'], preferredExerciseIds: ['hammer-curl', 'concentration-curl', 'skull-crusher', 'close-grip-push-up'] },
        { categories: ['Zadek', 'Břicho'], preferredExerciseIds: ['abduction-machine', 'glute-bridge', 'hip-thrust'] },
    ],
}

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
        const canonicalExerciseId = resolveExerciseId(entry.exerciseId)
        const nextDayKey = getWorkoutDateKey(entry.date)
        const existing = map.get(canonicalExerciseId)
        if (!existing || nextDayKey > existing) {
            map.set(canonicalExerciseId, nextDayKey)
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

            while (bucket.length > 0 && selectedIds.has(resolveExerciseId(bucket[0].exercise.id))) {
                bucket.shift()
            }

            const nextItem = bucket.shift()
            if (!nextItem) continue

            selected.push(nextItem)
            selectedIds.add(resolveExerciseId(nextItem.exercise.id))
            pickedAny = true

            if (selected.length >= targetCount) {
                break
            }
        }
    }
}

function getRecentPlanSignals(catalog: Exercise[], recentPlans: TrainingDayPlan[]) {
    const catalogById = new Map(catalog.map((exercise) => [resolveExerciseId(exercise.id), exercise] as const))
    const recentExerciseIds = new Set<string>()
    const recentSubcategoriesByCategory = new Map<string, Set<string>>()

    for (const plan of recentPlans.slice(0, 3)) {
        for (const exerciseId of plan.exerciseIds) {
            const canonicalId = resolveExerciseId(exerciseId)
            recentExerciseIds.add(canonicalId)

            const exercise = catalogById.get(canonicalId)
            if (!exercise?.subcategory) continue

            const current = recentSubcategoriesByCategory.get(exercise.category) ?? new Set<string>()
            current.add(exercise.subcategory)
            recentSubcategoriesByCategory.set(exercise.category, current)
        }
    }

    return { recentExerciseIds, recentSubcategoriesByCategory }
}

function compareCandidateScore(
    left: { recommendation: TrainingRecommendation; score: number },
    right: { recommendation: TrainingRecommendation; score: number },
) {
    if (left.score !== right.score) return right.score - left.score
    return sortRecommendations(left.recommendation, right.recommendation)
}

function scoreVariantCandidate(
    recommendation: TrainingRecommendation,
    slot: VariantSlot,
    categoryCounts: Map<string, number>,
    recentExerciseIds: Set<string>,
    recentSubcategoriesByCategory: Map<string, Set<string>>,
    strictRecentAvoidance: boolean,
) {
    const canonicalId = resolveExerciseId(recommendation.exercise.id)
    const category = recommendation.exercise.category
    const subcategory = recommendation.exercise.subcategory ?? ''

    let score = 0

    const categoryIndex = slot.categories.indexOf(category)
    if (categoryIndex >= 0) {
        score += 140 - categoryIndex * 12
    }

    if (slot.preferredSubcategories?.length) {
        const subcategoryIndex = slot.preferredSubcategories.indexOf(subcategory)
        if (subcategoryIndex >= 0) {
            score += 90 - subcategoryIndex * 10
        }
    }

    if (slot.preferredExerciseIds?.length) {
        const exerciseIndex = slot.preferredExerciseIds.indexOf(canonicalId)
        if (exerciseIndex >= 0) {
            score += 110 - exerciseIndex * 12
        }
    }

    if (recentExerciseIds.has(canonicalId)) {
        score -= strictRecentAvoidance ? 140 : 36
    }

    if (subcategory && recentSubcategoriesByCategory.get(category)?.has(subcategory)) {
        score -= strictRecentAvoidance ? 32 : 16
    }

    if (recommendation.isRecentlyUsed) {
        score -= 18
    }

    score -= (categoryCounts.get(category) ?? 0) * 14

    return score
}

export function getNextFullBodyVariant(currentVariant?: TrainingDayPlanVariant | null) {
    if (!currentVariant) return 'A'
    const index = FULL_BODY_VARIANT_SEQUENCE.indexOf(currentVariant)
    if (index < 0) return 'A'
    return FULL_BODY_VARIANT_SEQUENCE[(index + 1) % FULL_BODY_VARIANT_SEQUENCE.length]
}

export function buildFullBodyVariantRecommendations(
    catalog: Exercise[],
    entries: WorkoutEntry[],
    preferences: TrainingPreferences,
    variant: TrainingDayPlanVariant,
    recentPlans: TrainingDayPlan[] = [],
) {
    const orderedCategories = getOrderedCategories(preferences)
    if (orderedCategories.length === 0) return []

    const lastUsedDateByExercise = buildLastUsedDateMap(entries)
    const excludedSet = new Set((preferences.excludedExerciseIds ?? []).map((id) => id))
    const filteredRecommendations = catalog
        .filter((exercise) => orderedCategories.includes(exercise.category))
        .filter((exercise) => matchesSubcategoryPreference(exercise, preferences))
        .filter((exercise) => !excludedSet.has(resolveExerciseId(exercise.id)))
        .map((exercise) => {
            const canonicalId = resolveExerciseId(exercise.id)
            const lastUsedDateKey = lastUsedDateByExercise.get(canonicalId) ?? null
            return {
                exercise,
                lastUsedDateKey,
                isRecentlyUsed: isWithinRecentWindow(lastUsedDateKey, preferences.avoidRecentlyUsedDays),
            }
        })
        .sort(sortRecommendations)

    const selected: TrainingRecommendation[] = []
    const selectedIds = new Set<string>()
    const categoryCounts = new Map<string, number>()
    const blueprint = FULL_BODY_VARIANT_BLUEPRINTS[variant]
    const recentSignals = getRecentPlanSignals(catalog, recentPlans)
    const slotTargets = blueprint.slice(0, Math.max(0, preferences.targetExerciseCount))
    const filledSlotIndexes = new Set<number>()

    function addSelection(recommendation: TrainingRecommendation, slotIndex: number) {
        const canonicalId = resolveExerciseId(recommendation.exercise.id)
        selected.push(recommendation)
        selectedIds.add(canonicalId)
        categoryCounts.set(recommendation.exercise.category, (categoryCounts.get(recommendation.exercise.category) ?? 0) + 1)
        filledSlotIndexes.add(slotIndex)
    }

    for (const strictRecentAvoidance of [true, false]) {
        for (const [slotIndex, slot] of slotTargets.entries()) {
            if (filledSlotIndexes.has(slotIndex) || selected.length >= preferences.targetExerciseCount) continue

            const next = filteredRecommendations
                .filter((recommendation) => !selectedIds.has(resolveExerciseId(recommendation.exercise.id)))
                .map((recommendation) => ({
                    recommendation,
                    score: scoreVariantCandidate(
                        recommendation,
                        slot,
                        categoryCounts,
                        recentSignals.recentExerciseIds,
                        recentSignals.recentSubcategoriesByCategory,
                        strictRecentAvoidance,
                    ),
                }))
                .sort(compareCandidateScore)[0]

            if (next) {
                addSelection(next.recommendation, slotIndex)
            }
        }
    }

    const allBuckets = new Map<string, TrainingRecommendation[]>()
    const freshBuckets = new Map<string, TrainingRecommendation[]>()

    for (const category of orderedCategories) {
        const categoryRecommendations = filteredRecommendations.filter((item) => item.exercise.category === category)
        const recentPlanFiltered = categoryRecommendations.filter((item) => !recentSignals.recentExerciseIds.has(resolveExerciseId(item.exercise.id)))
        freshBuckets.set(category, recentPlanFiltered.filter((item) => !item.isRecentlyUsed))
        allBuckets.set(category, categoryRecommendations)
    }

    takeRoundRobin(orderedCategories, freshBuckets, selected, selectedIds, preferences.targetExerciseCount)
    takeRoundRobin(orderedCategories, allBuckets, selected, selectedIds, preferences.targetExerciseCount)

    return selected.slice(0, preferences.targetExerciseCount)
}

export function buildTodayRecommendations(
    catalog: Exercise[],
    entries: WorkoutEntry[],
    preferences: TrainingPreferences,
) {
    return buildFullBodyVariantRecommendations(catalog, entries, preferences, 'A', [])
}