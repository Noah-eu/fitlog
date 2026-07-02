import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkoutDateKey, subscribeToEntries } from '../services/workoutStorage'
import { subscribeToMeasurements } from '../services/bodyMeasurementStorage'
import { buildFullBodyVariantRecommendations, getNextFullBodyVariant } from '../services/trainingRecommendations'
import { getDefaultTrainingPreferences, subscribeToTrainingPreferences } from '../services/trainingPreferencesStorage'
import { getRecentTrainingPlans, getTodayDateKey, saveTodayTrainingPlan, subscribeToTodayTrainingPlan } from '../services/trainingDayPlanStorage'
import exercises, { findExerciseById, resolveExerciseId } from '../data/exercises'
import type { BodyMeasurement } from '../types/body'
import type { TrainingDayPlan, TrainingDayPlanVariant } from '../types/trainingDayPlan'
import type { WorkoutEntry } from '../types/workout'

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
function formatDateKey(dateKey: string) {
    return parseDateKey(dateKey).toLocaleDateString('cs-CZ')
}

function isDateKeyWithinLastDays(dateKey: string, days: number) {
    const today = parseDateKey(toDateKey(new Date()))
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - (days - 1))
    const entryDay = parseDateKey(dateKey)
    return entryDay >= cutoff && entryDay <= today
}

function buildActivitySummary(entries: WorkoutEntry[]) {
    const uniqueDays = new Set(entries.map((entry) => getWorkoutDateKey(entry.date)))
    const sortedUniqueDays = Array.from(uniqueDays).sort((left, right) => right.localeCompare(left))

    return {
        trainingDaysLast7: sortedUniqueDays.filter((dayKey) => isDateKeyWithinLastDays(dayKey, 7)).length,
        trainingDaysLast30: sortedUniqueDays.filter((dayKey) => isDateKeyWithinLastDays(dayKey, 30)).length,
        lastWorkoutDay: sortedUniqueDays[0] ?? null,
        entriesLast7: entries.filter((entry) => isDateKeyWithinLastDays(getWorkoutDateKey(entry.date), 7)).length,
    }
}

function buildPersonalRecords(entries: WorkoutEntry[]) {
    const byExercise = new Map<string, WorkoutEntry>()

    entries.forEach((entry) => {
        if (typeof entry.weight !== 'number' || !Number.isFinite(entry.weight)) return

        const canonicalExerciseId = resolveExerciseId(entry.exerciseId)

        const existing = byExercise.get(canonicalExerciseId)
        if (!existing) {
            byExercise.set(canonicalExerciseId, entry)
            return
        }

        const existingOrderKey = existing.updatedAt ?? existing.createdAt ?? existing.date
        const nextOrderKey = entry.updatedAt ?? entry.createdAt ?? entry.date
        const shouldReplace = entry.weight > (existing.weight ?? Number.NEGATIVE_INFINITY)
            || (entry.weight === existing.weight && nextOrderKey.localeCompare(existingOrderKey) > 0)

        if (shouldReplace) {
            byExercise.set(canonicalExerciseId, entry)
        }
    })

    return Array.from(byExercise.values())
        .map((entry) => ({
            exerciseId: resolveExerciseId(entry.exerciseId),
            exerciseName: findExerciseById(entry.exerciseId)?.name ?? 'Neznámý cvik',
            entry,
        }))
        .sort((left, right) => {
            const weightDelta = (right.entry.weight ?? 0) - (left.entry.weight ?? 0)
            if (weightDelta !== 0) return weightDelta
            const rightOrderKey = right.entry.updatedAt ?? right.entry.createdAt ?? right.entry.date
            const leftOrderKey = left.entry.updatedAt ?? left.entry.createdAt ?? left.entry.date
            return rightOrderKey.localeCompare(leftOrderKey)
        })
        .slice(0, 5)
}

function formatRecordDetail(entry: WorkoutEntry) {
    const reps = typeof entry.reps === 'number' && Number.isFinite(entry.reps) ? entry.reps : '-'
    const sets = typeof entry.sets === 'number' && Number.isFinite(entry.sets) ? entry.sets : '-'
    return `${reps} opakování • ${sets} série`
}

function formatBodyMetric(value: number | null | undefined, suffix: string) {
    return typeof value === 'number' && Number.isFinite(value) ? `${value} ${suffix}` : '-'
}

function formatLastWorkoutSummary(lastWorkoutDay: string | null) {
    if (!lastWorkoutDay) return 'Zatím nemáš zapsaný žádný trénink.'
    return `Poslední trénink: ${formatDateKey(lastWorkoutDay)}`
}

function formatRecommendationUsage(lastUsedDateKey: string | null) {
    if (!lastUsedDateKey) return 'Ještě nemáš zapsaný žádný výkon.'
    return `Naposledy cvičeno: ${formatDateKey(lastUsedDateKey)}`
}

function formatVariantLabel(variant: TrainingDayPlanVariant | undefined) {
    return `Full body ${variant ?? 'A'}`
}

export default function TodayPage() {
    const navigate = useNavigate()
    const [entries, setEntries] = useState<WorkoutEntry[]>([])
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
    const [trainingPreferences, setTrainingPreferences] = useState(getDefaultTrainingPreferences())
    const [todayPlan, setTodayPlan] = useState<TrainingDayPlan | null>(null)
    const [planSaving, setPlanSaving] = useState(false)
    const [planError, setPlanError] = useState<string | null>(null)

    useEffect(() => {
        return subscribeToEntries(setEntries)
    }, [])

    useEffect(() => {
        return subscribeToMeasurements(setMeasurements)
    }, [])

    useEffect(() => {
        return subscribeToTrainingPreferences(setTrainingPreferences)
    }, [])

    useEffect(() => {
        return subscribeToTodayTrainingPlan(setTodayPlan)
    }, [])

    const latestMeasurement = measurements[0]
    const activitySummary = useMemo(() => buildActivitySummary(entries), [entries])
    const personalRecords = useMemo(() => buildPersonalRecords(entries), [entries])
    const todayDateKey = useMemo(() => getTodayDateKey(), [])
    const completedExerciseIds = useMemo(() => {
        const ids = entries
            .filter((entry) => getWorkoutDateKey(entry.date) === todayDateKey)
            .map((entry) => resolveExerciseId(entry.exerciseId))

        return new Set(ids)
    }, [entries, todayDateKey])
    const storedExercises = useMemo(() => {
        if (!todayPlan) return []

        const lastUsedDateByExercise = entries.reduce<Map<string, string>>((map, entry) => {
            const canonicalExerciseId = resolveExerciseId(entry.exerciseId)
            const nextDateKey = getWorkoutDateKey(entry.date)
            const existing = map.get(canonicalExerciseId)
            if (!existing || nextDateKey > existing) {
                map.set(canonicalExerciseId, nextDateKey)
            }
            return map
        }, new Map())

        return todayPlan.exerciseIds
            .map((exerciseId) => {
                const exercise = findExerciseById(exerciseId)
                if (!exercise) return null

                const canonicalId = resolveExerciseId(exercise.id)
                const excluded = (trainingPreferences?.excludedExerciseIds ?? []).includes(canonicalId)

                return {
                    exercise,
                    completed: completedExerciseIds.has(exercise.id),
                    lastUsedDateKey: lastUsedDateByExercise.get(exercise.id) ?? null,
                    excluded,
                }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .filter((item) => !item.excluded)
    }, [todayPlan, entries, completedExerciseIds])
    const completedCount = storedExercises.filter((item) => item.completed).length

    async function generateAndSavePlan(source: 'auto' | 'manual') {
        const recentPlans = await getRecentTrainingPlans(3)
        const pastPlans = recentPlans.filter((plan) => plan.dateKey !== todayDateKey)
        const recentReferencePlans = todayPlan ? [todayPlan, ...pastPlans] : pastPlans
        const variant = source === 'manual'
            ? getNextFullBodyVariant(todayPlan?.variant ?? recentPlans[0]?.variant ?? null)
            : getNextFullBodyVariant(pastPlans[0]?.variant ?? null)

        const generatedExerciseIds = buildFullBodyVariantRecommendations(
            exercises,
            entries,
            trainingPreferences,
            variant,
            recentReferencePlans,
        ).map((recommendation) => recommendation.exercise.id)

        if (generatedExerciseIds.length === 0) {
            return null
        }

        return saveTodayTrainingPlan(generatedExerciseIds, {
            source,
            variant,
            preferencesSnapshot: {
                enabledCategories: [...trainingPreferences.enabledCategories],
                targetExerciseCount: trainingPreferences.targetExerciseCount,
                avoidRecentlyUsedDays: trainingPreferences.avoidRecentlyUsedDays,
            },
        })
    }

    useEffect(() => {
        if (todayPlan || planSaving) return

        if (process.env.NODE_ENV === 'development') {
            console.warn('[TodayPage] generating initial plan for today')
        }

        let cancelled = false
        setPlanSaving(true)
        setPlanError(null)

        generateAndSavePlan('auto')
            .then((plan) => {
                if (!plan && !cancelled) {
                    setPlanError('Nepodařilo se vygenerovat dnešní plán.')
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setPlanError(error instanceof Error ? error.message : 'Nepodařilo se vygenerovat dnešní plán.')
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setPlanSaving(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [todayPlan, planSaving])

    useEffect(() => {
        if (!todayPlan || !trainingPreferences) return
        if (planSaving) return

        const excludedSet = new Set(
            (trainingPreferences.excludedExerciseIds ?? []).map((id) => resolveExerciseId(id)),
        )
        const validIds = todayPlan.exerciseIds.filter((id) => !excludedSet.has(resolveExerciseId(id)))
        const targetCount = trainingPreferences.targetExerciseCount
        const missingCount = targetCount - validIds.length

        if (missingCount <= 0 && validIds.length === todayPlan.exerciseIds.length) return

        async function doRepair() {
            setPlanSaving(true)
            try {
                let repairedIds = [...validIds]

                if (missingCount > 0) {
                    const recentPlans = await getRecentTrainingPlans(3)
                    const pastPlans = recentPlans.filter((plan) => plan.dateKey !== todayDateKey)
                    const recentReferencePlans = [todayPlan, ...pastPlans]

                    const relaxedPrefs = { ...trainingPreferences, targetExerciseCount: Math.min(targetCount + missingCount, 20) }
                    const recommendations = buildFullBodyVariantRecommendations(
                        exercises,
                        entries,
                        relaxedPrefs,
                        todayPlan.variant,
                        recentReferencePlans,
                    )

                    const validIdSet = new Set(repairedIds.map((id) => resolveExerciseId(id)))
                    const fillers = recommendations
                        .filter((r) => !validIdSet.has(resolveExerciseId(r.exercise.id)))
                        .map((r) => r.exercise.id)
                        .slice(0, missingCount)

                    repairedIds = [...repairedIds, ...fillers]
                }

                await saveTodayTrainingPlan(repairedIds, {
                    source: todayPlan.source,
                    variant: todayPlan.variant,
                    preferencesSnapshot: todayPlan.preferencesSnapshot,
                })
            } catch (error) {
                console.warn('[TodayPage] failed to repair plan', error)
            } finally {
                setPlanSaving(false)
            }
        }

        doRepair()
    }, [todayPlan, trainingPreferences])

    async function handleRegeneratePlan() {
        setPlanSaving(true)
        setPlanError(null)

        try {
            const plan = await generateAndSavePlan('manual')
            if (!plan) {
                throw new Error('Nepodařilo se vygenerovat nový plán.')
            }
        } catch (error) {
            setPlanError(error instanceof Error ? error.message : 'Nepodařilo se vygenerovat nový plán.')
        } finally {
            setPlanSaving(false)
        }
    }

    return (
        <div className="page">
            <div className="dashboard">
                <section className="card dashboard-hero dashboard-overview-hero">
                    <div>
                        <div className="muted">FitLog / Dnes</div>
                        <h1>Přehled tréninku a progresu</h1>
                        <div className="muted">{new Date().toLocaleDateString('cs-CZ')}</div>
                        <p className="dashboard-subtitle">Rychlý přehled aktivity, rekordů a dalšího kroku pro dnešní trénink.</p>
                    </div>
                    <div className="dashboard-status-pill">{formatLastWorkoutSummary(activitySummary.lastWorkoutDay)}</div>
                </section>

                <section className="dashboard-section">
                    <div className="section-heading">
                        <h3>Aktivita</h3>
                        <span>Poslední týdny bez duplicitních dnů</span>
                    </div>

                    <div className="dashboard-stat-grid">
                        <article className="card dashboard-stat-card">
                            <span>Tréninkové dny za 7 dní</span>
                            <strong>{activitySummary.trainingDaysLast7}</strong>
                        </article>
                        <article className="card dashboard-stat-card">
                            <span>Tréninkové dny za 30 dní</span>
                            <strong>{activitySummary.trainingDaysLast30}</strong>
                        </article>
                        <article className="card dashboard-stat-card">
                            <span>Poslední tréninkový den</span>
                            <strong>{activitySummary.lastWorkoutDay ? formatDateKey(activitySummary.lastWorkoutDay) : 'Zatím nic'}</strong>
                        </article>
                        <article className="card dashboard-stat-card">
                            <span>Zapsané výkony za 7 dní</span>
                            <strong>{activitySummary.entriesLast7}</strong>
                        </article>
                    </div>
                </section>

                <section className="dashboard-section">
                    <div className="section-heading">
                        <div>
                            <h3>Dnes doporučeno</h3>
                            <span>{todayPlan ? `${formatVariantLabel(todayPlan.variant)} • stabilní plán pro dnešek` : 'Stabilní plán pro dnešek'}</span>
                        </div>
                        <div className="dashboard-actions">
                            <button type="button" onClick={() => navigate('/settings')}>Upravit plán</button>
                            <button type="button" onClick={handleRegeneratePlan} disabled={planSaving}> {planSaving ? 'Generuji...' : 'Vygenerovat nový plán'} </button>
                        </div>
                    </div>

                    {planError ? <div className="form-error">{planError}</div> : null}

                    {storedExercises.length === 0 ? (
                        <div className="card empty-state-card recommendation-empty-state">
                            <p>Nastav si tréninkový plán v Nastavení.</p>
                            <button type="button" onClick={() => navigate('/settings')} style={{ marginTop: 10 }}>Otevřít nastavení</button>
                        </div>
                    ) : (
                        <>
                            <div className="dashboard-plan-summary">
                                <strong>{formatVariantLabel(todayPlan?.variant)} • Hotovo {completedCount} / {storedExercises.length}</strong>
                                <span>{completedCount === storedExercises.length ? 'Dnešní plán hotový' : 'Splněné cviky zůstávají na stejném místě.'}</span>
                            </div>
                            <div className="recommendation-list">
                                {storedExercises.map((item) => (
                                    <article key={item.exercise.id} className={`card recommendation-card${item.completed ? ' completed' : ''}`}>
                                        <div className="recommendation-thumb">
                                            {item.exercise.imageUrl ? <img src={item.exercise.imageUrl} alt={item.exercise.name} /> : null}
                                        </div>
                                        <div className="recommendation-meta">
                                            <span className="recommendation-category">
                                                {item.exercise.category}
                                                {item.exercise.subcategory ? ` • ${item.exercise.subcategory}` : ''}
                                            </span>
                                            <h4>{item.exercise.name}</h4>
                                            <p>{formatRecommendationUsage(item.lastUsedDateKey)}</p>
                                            <div className={`recommendation-status${item.completed ? ' done' : ''}`}>
                                                {item.completed ? 'Dnes zapsáno' : 'Čeká na splnění'}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => navigate(`/exercises/${item.exercise.id}`)}>
                                            Otevřít
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                <section className="dashboard-section">
                    <div className="section-heading">
                        <h3>Moje rekordy</h3>
                        <span>Top 5 nejtěžších výkonů</span>
                    </div>

                    {personalRecords.length === 0 ? (
                        <div className="card empty-state-card">
                            <p>Rekordy se zobrazí po zapsání prvních výkonů.</p>
                        </div>
                    ) : (
                        <div className="record-list">
                            {personalRecords.map((record) => (
                                <article key={record.exerciseId} className="card record-card">
                                    <div className="record-head">
                                        <div>
                                            <h4>{record.exerciseName}</h4>
                                            <span>{formatRecordDetail(record.entry)}</span>
                                        </div>
                                        <strong>{record.entry.weight} kg</strong>
                                    </div>
                                    <div className="record-foot">
                                        <span>{formatDateKey(getWorkoutDateKey(record.entry.date))}</span>
                                        <span>{record.entry.difficulty ?? 'Obtížnost neuvedena'}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {latestMeasurement ? (
                    <section className="card dashboard-body-summary">
                        <div className="section-heading">
                            <h3>Moje tělo</h3>
                            <span>{formatDateKey(getWorkoutDateKey(latestMeasurement.date))}</span>
                        </div>
                        <div className="dashboard-body-grid">
                            <div>
                                <span>Váha</span>
                                <strong>{formatBodyMetric(latestMeasurement.bodyWeight, 'kg')}</strong>
                            </div>
                            <div>
                                <span>Pas</span>
                                <strong>{formatBodyMetric(latestMeasurement.waist, 'cm')}</strong>
                            </div>
                            <div>
                                <span>Hrudník</span>
                                <strong>{formatBodyMetric(latestMeasurement.chest, 'cm')}</strong>
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className="dashboard-section">
                    <div className="section-heading">
                        <h3>Co otevřít dál</h3>
                        <span>Pouze reálné akce</span>
                    </div>

                    <div className="dashboard-actions">
                        <button type="button" onClick={() => navigate('/exercises')} className="primary">Začít cvičit</button>
                        <button type="button" onClick={() => navigate('/history')}>Otevřít deník</button>
                        <button type="button" onClick={() => navigate('/body')}>Moje tělo</button>
                    </div>
                </section>
            </div>
        </div>
    )
}
