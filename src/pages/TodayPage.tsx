import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkoutDateKey, subscribeToEntries } from '../services/workoutStorage'
import { subscribeToMeasurements } from '../services/bodyMeasurementStorage'
import { buildTodayRecommendations } from '../services/trainingRecommendations'
import type { TrainingRecommendation } from '../services/trainingRecommendations'
import { getDefaultTrainingPreferences, subscribeToTrainingPreferences } from '../services/trainingPreferencesStorage'
import exercises from '../data/exercises'
import type { BodyMeasurement } from '../types/body'
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

function buildExerciseNameMap() {
    return new Map(exercises.map((exercise) => [exercise.id, exercise.name]))
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

        const existing = byExercise.get(entry.exerciseId)
        if (!existing) {
            byExercise.set(entry.exerciseId, entry)
            return
        }

        const existingOrderKey = existing.updatedAt ?? existing.createdAt ?? existing.date
        const nextOrderKey = entry.updatedAt ?? entry.createdAt ?? entry.date
        const shouldReplace = entry.weight > (existing.weight ?? Number.NEGATIVE_INFINITY)
            || (entry.weight === existing.weight && nextOrderKey.localeCompare(existingOrderKey) > 0)

        if (shouldReplace) {
            byExercise.set(entry.exerciseId, entry)
        }
    })

    const exerciseNameById = buildExerciseNameMap()

    return Array.from(byExercise.values())
        .map((entry) => ({
            exerciseId: entry.exerciseId,
            exerciseName: exerciseNameById.get(entry.exerciseId) ?? 'Neznámý cvik',
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

function formatRecommendationUsage(recommendation: TrainingRecommendation) {
    if (!recommendation.lastUsedDateKey) return 'Ještě nemáš zapsaný žádný výkon.'
    if (recommendation.isRecentlyUsed) return `Cvičeno nedávno: ${formatDateKey(recommendation.lastUsedDateKey)}`
    return `Naposledy cvičeno: ${formatDateKey(recommendation.lastUsedDateKey)}`
}

export default function TodayPage() {
    const navigate = useNavigate()
    const [entries, setEntries] = useState<WorkoutEntry[]>([])
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
    const [trainingPreferences, setTrainingPreferences] = useState(getDefaultTrainingPreferences())

    useEffect(() => {
        return subscribeToEntries(setEntries)
    }, [])

    useEffect(() => {
        return subscribeToMeasurements(setMeasurements)
    }, [])

    useEffect(() => {
        return subscribeToTrainingPreferences(setTrainingPreferences)
    }, [])

    const latestMeasurement = measurements[0]
    const activitySummary = useMemo(() => buildActivitySummary(entries), [entries])
    const personalRecords = useMemo(() => buildPersonalRecords(entries), [entries])
    const todayRecommendations = useMemo(
        () => buildTodayRecommendations(exercises, entries, trainingPreferences),
        [entries, trainingPreferences],
    )

    return (
        <div className="page">
            <div className="dashboard">
                <section className="card dashboard-hero dashboard-overview-hero">
                    <div>
                        <div className="muted">FitLog / Dnes</div>
                        <h1>Přehled tréninku a progresu</h1>
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
                            <span>Podle tvého full body nastavení</span>
                        </div>
                        <button type="button" onClick={() => navigate('/settings')}>Upravit plán</button>
                    </div>

                    {todayRecommendations.length === 0 ? (
                        <div className="card empty-state-card recommendation-empty-state">
                            <p>Nastav si tréninkový plán v Nastavení.</p>
                            <button type="button" onClick={() => navigate('/settings')} style={{ marginTop: 10 }}>Otevřít nastavení</button>
                        </div>
                    ) : (
                        <div className="recommendation-list">
                            {todayRecommendations.map((recommendation) => (
                                <article key={recommendation.exercise.id} className="card recommendation-card">
                                    <div className="recommendation-thumb">
                                        {recommendation.exercise.imageUrl ? <img src={recommendation.exercise.imageUrl} alt={recommendation.exercise.name} /> : null}
                                    </div>
                                    <div className="recommendation-meta">
                                        <span className="recommendation-category">
                                            {recommendation.exercise.category}
                                            {recommendation.exercise.subcategory ? ` • ${recommendation.exercise.subcategory}` : ''}
                                        </span>
                                        <h4>{recommendation.exercise.name}</h4>
                                        <p>{formatRecommendationUsage(recommendation)}</p>
                                    </div>
                                    <button type="button" onClick={() => navigate(`/exercises/${recommendation.exercise.id}`)}>
                                        Otevřít
                                    </button>
                                </article>
                            ))}
                        </div>
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
