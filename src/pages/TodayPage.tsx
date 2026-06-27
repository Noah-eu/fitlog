import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkoutDateKey, subscribeToEntries } from '../services/workoutStorage'
import { subscribeToMeasurements } from '../services/bodyMeasurementStorage'
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

function last7DaysCount(entries: { date: string }[]) {
    const today = parseDateKey(toDateKey(new Date()))
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - 6)
    return entries.filter((entry) => {
        const entryDay = parseDateKey(getWorkoutDateKey(entry.date))
        return entryDay >= cutoff && entryDay <= today
    }).length
}

function buildPerformanceOverview(entries: WorkoutEntry[]) {
    const byExercise = new Map<string, { latest: WorkoutEntry; bestWeight?: number }>()

    entries.forEach((entry) => {
        const existing = byExercise.get(entry.exerciseId)
        const bestWeight = typeof entry.weight === 'number'
            ? Math.max(existing?.bestWeight ?? Number.NEGATIVE_INFINITY, entry.weight)
            : existing?.bestWeight

        if (existing) {
            byExercise.set(entry.exerciseId, {
                latest: existing.latest,
                bestWeight: Number.isFinite(bestWeight ?? Number.NaN) ? bestWeight : undefined,
            })
            return
        }

        byExercise.set(entry.exerciseId, {
            latest: entry,
            bestWeight: typeof entry.weight === 'number' ? entry.weight : undefined,
        })
    })

    return Array.from(byExercise.entries())
        .map(([exerciseId, summary]) => {
            const exercise = exercises.find((item) => item.id === exerciseId)
            return {
                exerciseId,
                name: exercise?.name ?? 'Neznámý cvik',
                category: exercise?.category ?? 'Bez kategorie',
                latest: summary.latest,
                bestWeight: summary.bestWeight,
            }
        })
        .sort((a, b) => b.latest.date.localeCompare(a.latest.date) || b.latest.createdAt.localeCompare(a.latest.createdAt))
}

export default function TodayPage() {
    const navigate = useNavigate()
    const [entries, setEntries] = useState<WorkoutEntry[]>([])
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])

    useEffect(() => {
        return subscribeToEntries(setEntries)
    }, [])

    useEffect(() => {
        return subscribeToMeasurements(setMeasurements)
    }, [])

    const latestMeasurement = measurements[0]
    const weekCount = last7DaysCount(entries)
    const performanceOverview = useMemo(() => buildPerformanceOverview(entries), [entries])

    return (
        <div className="page">
            <h1>FitLog / Dnes</h1>

            <div className="dashboard">
                <section className="card dashboard-hero">
                    <div>
                        <div className="muted">Moje výkony</div>
                        <h2>Přehled aktuálních vah a posledních výkonů</h2>
                    </div>
                    <div className="dashboard-week-summary">
                        <strong>{weekCount}</strong>
                        <span>záznamů za posledních 7 dní</span>
                    </div>
                </section>

                <div className="dashboard-actions">
                    <button onClick={() => navigate('/exercises')} className="primary">Začít cvičit</button>
                    <button onClick={() => navigate('/history')}>Zobrazit deník</button>
                    <button onClick={() => navigate('/body')}>Přidat měření</button>
                </div>

                <section className="dashboard-section">
                    <div className="section-heading">
                        <h3>Moje výkony</h3>
                        <span>{performanceOverview.length} cviků se záznamem</span>
                    </div>

                    {performanceOverview.length === 0 ? (
                        <div className="card empty-state-card">
                            <p>Ještě tu nejsou žádné uložené výkony. Otevřete cvičení a zapište první sérii, ať se začne budovat přehled.</p>
                        </div>
                    ) : (
                        <div className="performance-list">
                            {performanceOverview.map((item) => (
                                <article key={item.exerciseId} className="card performance-card">
                                    <div className="performance-head">
                                        <div>
                                            <h4>{item.name}</h4>
                                            <div className="muted">{item.category}</div>
                                        </div>
                                        <div className="performance-date">{formatDateKey(getWorkoutDateKey(item.latest.date))}</div>
                                    </div>

                                    <div className="performance-grid">
                                        <div>
                                            <span>Poslední výkon</span>
                                            <strong>{item.latest.weight ?? '-'} kg</strong>
                                        </div>
                                        <div>
                                            <span>Opakování a série</span>
                                            <strong>{item.latest.sets ?? '-'}×{item.latest.reps ?? '-'}</strong>
                                        </div>
                                        <div>
                                            <span>Obtížnost</span>
                                            <strong>{item.latest.difficulty ?? '-'}</strong>
                                        </div>
                                        <div>
                                            <span>Nejvyšší váha</span>
                                            <strong>{item.bestWeight ?? '-'} kg</strong>
                                        </div>
                                    </div>

                                    {item.latest.note ? <p className="small">Poznámka: {item.latest.note}</p> : null}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {latestMeasurement ? (
                    <section className="card body-summary-card">
                        <div className="section-heading">
                            <h3>Moje tělo</h3>
                            <span>{new Date(latestMeasurement.date).toLocaleDateString('cs-CZ')}</span>
                        </div>
                        <div className="performance-grid body-summary-grid">
                            <div>
                                <span>Váha</span>
                                <strong>{latestMeasurement.bodyWeight ?? '-'} kg</strong>
                            </div>
                            <div>
                                <span>Pas</span>
                                <strong>{latestMeasurement.waist ?? '-'} cm</strong>
                            </div>
                            <div>
                                <span>Hrudník</span>
                                <strong>{latestMeasurement.chest ?? '-'} cm</strong>
                            </div>
                            <div>
                                <span>Stehna</span>
                                <strong>{latestMeasurement.thighs ?? '-'} cm</strong>
                            </div>
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    )
}
