import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import exercises from '../data/exercises'
import type { WorkoutEntry } from '../types/workout'
import { deleteEntry, getWorkoutDateKey, saveEntry, subscribeToEntries, toStoredWorkoutDate, updateEntry } from '../services/workoutStorage'
import BackButton from '../components/BackButton'
import ProgressLineChart from '../components/ProgressLineChart'

function todayISODate() {
    const t = new Date()
    const yyyy = t.getFullYear()
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd = String(t.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

function formatChartDate(date: string) {
    const [year, month, day] = date.split('-').map(Number)
    if (!year || !month || !day) return date
    return `${day}. ${month}.`
}

function formatEntryDate(date: string) {
    return new Date(date).toLocaleDateString('cs-CZ')
}

function formatPerformanceMetric(value: number | undefined, suffix?: string) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
    return suffix ? `${value} ${suffix}` : `${value}`
}

function formatPreviousPerformanceHint(entry: WorkoutEntry) {
    return `${formatPerformanceMetric(entry.weight, 'kg')} × ${formatPerformanceMetric(entry.reps)} × ${formatPerformanceMetric(entry.sets)}`
}

function getDailyMaxWeightPoints(entries: WorkoutEntry[]) {
    const dailyMaxByDate = new Map<string, { value: number; orderKey: string }>()

    for (const entry of entries) {
        if (typeof entry.weight !== 'number' || !Number.isFinite(entry.weight)) continue

        const dayKey = getWorkoutDateKey(entry.date)
        const orderKey = entry.updatedAt ?? entry.createdAt ?? entry.date
        const existing = dailyMaxByDate.get(dayKey)

        if (!existing || entry.weight > existing.value || (entry.weight === existing.value && orderKey.localeCompare(existing.orderKey) > 0)) {
            dailyMaxByDate.set(dayKey, {
                value: entry.weight,
                orderKey,
            })
        }
    }

    return Array.from(dailyMaxByDate.entries())
        .sort(([leftDay], [rightDay]) => leftDay.localeCompare(rightDay))
        .map(([dayKey, point]) => ({
            label: formatChartDate(dayKey),
            value: point.value,
        }))
}

export default function ExerciseDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const ex = exercises.find((e) => e.id === id)

    function hasRouterHistory() {
        if (typeof window === 'undefined') return false
        const state = window.history.state as { idx?: number } | null
        return typeof state?.idx === 'number' && state.idx > 0
    }

    if (!ex) {
        return (
            <div className="page">
                <BackButton fallbackTo="/exercises" />
                <h1>Nenalezeno</h1>
                <p>Cvičení nebylo nalezeno.</p>
            </div>
        )
    }
    const [entries, setEntries] = useState<WorkoutEntry[]>([])
    const [date, setDate] = useState<string>(todayISODate())
    const [weight, setWeight] = useState<number | ''>('')
    const [reps, setReps] = useState<number | ''>('')
    const [setsVal, setSetsVal] = useState<number | ''>('')
    const [difficulty, setDifficulty] = useState<'lehké' | 'akorát' | 'těžké'>('akorát')
    const [note, setNote] = useState<string>('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [autoFilledEntryId, setAutoFilledEntryId] = useState<string | null>(null)

    function applyPerformanceValues(source?: Pick<WorkoutEntry, 'weight' | 'reps' | 'sets'>) {
        setWeight(source?.weight ?? '')
        setReps(source?.reps ?? '')
        setSetsVal(source?.sets ?? '')
    }

    function resetEntryForm() {
        setDate(todayISODate())
        applyPerformanceValues()
        setDifficulty('akorát')
        setNote('')
        setEditingId(null)
        setSaveError(null)
        setAutoFilledEntryId(null)
    }

    useEffect(() => {
        if (!ex.id) return

        return subscribeToEntries((allEntries) => {
            setEntries(allEntries.filter((entry) => entry.exerciseId === ex.id))
        })
    }, [ex.id])

    useEffect(() => {
        resetEntryForm()
    }, [ex.id])

    const last = useMemo(() => entries[0], [entries])
    const chartPoints = useMemo(() => getDailyMaxWeightPoints(entries), [entries])

    useEffect(() => {
        if (!last || editingId) return
        if (autoFilledEntryId === last.id) return
        if (weight !== '' || reps !== '' || setsVal !== '') return

        applyPerformanceValues(last)
        setAutoFilledEntryId(last.id)
    }, [autoFilledEntryId, editingId, last, reps, setsVal, weight])

    function handleUseLastPerformance() {
        if (!last) return
        applyPerformanceValues(last)
        setAutoFilledEntryId(last.id)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!ex.id) return
        setSaveError(null)
        const wasEditing = Boolean(editingId)

        try {
            if (editingId) {
                await updateEntry(editingId, {
                    exerciseId: ex.id,
                    date: toStoredWorkoutDate(date),
                    weight: typeof weight === 'number' && !Number.isNaN(weight) ? weight : undefined,
                    reps: typeof reps === 'number' && !Number.isNaN(reps) ? reps : undefined,
                    sets: typeof setsVal === 'number' && !Number.isNaN(setsVal) ? setsVal : undefined,
                    difficulty,
                    note,
                })
                setEditingId(null)
            } else {
                await saveEntry({
                    exerciseId: ex.id,
                    date: toStoredWorkoutDate(date),
                    weight: typeof weight === 'number' && !Number.isNaN(weight) ? weight : undefined,
                    reps: typeof reps === 'number' && !Number.isNaN(reps) ? reps : undefined,
                    sets: typeof setsVal === 'number' && !Number.isNaN(setsVal) ? setsVal : undefined,
                    difficulty,
                    note,
                })
            }

            resetEntryForm()
            if (!wasEditing) {
                if (hasRouterHistory()) {
                    navigate(-1)
                } else {
                    navigate('/exercises', { replace: true })
                }
            }
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Nepodařilo se uložit výkon.')
        }
    }

    function startEdit(item: WorkoutEntry) {
        setEditingId(item.id)
        setSaveError(null)
        setDate(getWorkoutDateKey(item.date))
        applyPerformanceValues(item)
        setDifficulty(item.difficulty ?? 'akorát')
        setNote(item.note ?? '')
        setAutoFilledEntryId(item.id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function cancelEdit() {
        resetEntryForm()
    }

    async function handleDelete(id: string) {
        if (!confirm('Smazat tento záznam?')) return
        try {
            await deleteEntry(id)
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Nepodařilo se smazat záznam.')
        }
    }

    return (
        <div className="page">
            <BackButton fallbackTo="/exercises" />
            <h1>{ex.name}</h1>
            <div className="exercise-detail">
                <div className="thumb large">
                    {ex.imageUrl ? <img src={ex.imageUrl} alt={ex.name} /> : null}
                </div>
                <div className="meta">
                    <div className="cat">{ex.subcategory ? `${ex.category} • ${ex.subcategory}` : ex.category}</div>
                    {ex.shortDescription ? <p>{ex.shortDescription}</p> : null}

                    <section className="quick-entry-panel">
                        <div className="quick-entry-head">
                            <div>
                                <h3>Rychlý zápis</h3>
                                {last ? (
                                    <p className="quick-entry-summary">Minule: {formatPreviousPerformanceHint(last)}</p>
                                ) : (
                                    <p className="quick-entry-summary">Zatím nemáš předchozí výkon pro tento cvik.</p>
                                )}
                            </div>
                            {editingId ? <span className="quick-entry-badge">Upravuješ záznam</span> : null}
                        </div>

                        {last ? (
                            <div className="performance-grid quick-entry-grid">
                                <div>
                                    <span>Váha</span>
                                    <strong>{formatPerformanceMetric(last.weight, 'kg')}</strong>
                                </div>
                                <div>
                                    <span>Opakování</span>
                                    <strong>{formatPerformanceMetric(last.reps)}</strong>
                                </div>
                                <div>
                                    <span>Série</span>
                                    <strong>{formatPerformanceMetric(last.sets)}</strong>
                                </div>
                                <div>
                                    <span>Datum</span>
                                    <strong>{formatEntryDate(last.date)}</strong>
                                </div>
                                <div className="quick-entry-grid-full">
                                    <span>Obtížnost</span>
                                    <strong>{last.difficulty ?? '-'}</strong>
                                </div>
                            </div>
                        ) : null}

                        <form className="entry-form" onSubmit={handleSave}>
                            <div className="entry-form-grid">
                                <label>
                                    Datum
                                    <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
                                </label>
                                <label>
                                    Obtížnost
                                    <select value={difficulty} onChange={(ev) => setDifficulty(ev.target.value as 'lehké' | 'akorát' | 'těžké')}>
                                        <option value="lehké">lehké</option>
                                        <option value="akorát">akorát</option>
                                        <option value="těžké">těžké</option>
                                    </select>
                                </label>
                                <label>
                                    Váha (kg)
                                    <input type="number" inputMode="decimal" min="0" step="0.5" value={weight as number | ''} onChange={(ev) => setWeight(ev.target.value === '' ? '' : Number(ev.target.value))} />
                                </label>
                                <label>
                                    Opakování
                                    <input type="number" inputMode="numeric" min="0" step="1" value={reps as number | ''} onChange={(ev) => setReps(ev.target.value === '' ? '' : Number(ev.target.value))} />
                                </label>
                                <label>
                                    Série
                                    <input type="number" inputMode="numeric" min="0" step="1" value={setsVal as number | ''} onChange={(ev) => setSetsVal(ev.target.value === '' ? '' : Number(ev.target.value))} />
                                </label>
                                <label className="entry-field-full">
                                    Poznámka (volitelné)
                                    <textarea value={note} onChange={(ev) => setNote(ev.target.value)} />
                                </label>
                            </div>

                            <div className="entry-form-actions">
                                <button type="submit" className="primary">Uložit výkon</button>
                                {last ? (
                                    <button type="button" onClick={handleUseLastPerformance}>Použít minule</button>
                                ) : null}
                                {editingId ? (
                                    <button type="button" onClick={cancelEdit}>Zrušit úpravu</button>
                                ) : null}
                            </div>

                            {saveError ? <div className="form-error">{saveError}</div> : null}
                        </form>
                    </section>

                    <div className="exercise-detail-copy">
                    <p><strong>Primární svaly:</strong> {ex.primaryMuscles.join(', ')}</p>
                    {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                        <p><strong>Sekundární svaly:</strong> {ex.secondaryMuscles.join(', ')}</p>
                    )}
                    <p><strong>Instrukce:</strong> {ex.instructions}</p>
                    <p><strong>Časté chyby:</strong> {ex.commonMistakes.join('; ')}</p>
                    <p><strong>Doporučené opakování:</strong> {ex.recommendedReps}</p>
                    <p><strong>Doporučené série:</strong> {ex.recommendedSets}</p>
                    </div>

                    <section className="chart-section card">
                        <div className="section-heading">
                            <h3>Vývoj výkonu</h3>
                            <span>Nejvyšší váha za den</span>
                        </div>
                        <ProgressLineChart
                            points={chartPoints}
                            valueSuffix="kg"
                            emptyStateText="Zatím nemáš žádné váhové záznamy pro tento cvik."
                            singlePointText="Pro čárový graf přidej ještě jeden den s výkonem tohoto cviku."
                        />
                    </section>

                    {entries.length > 0 && (
                        <div className="recent-entries">
                            <h3>Nedávné</h3>
                            <ul>
                                {entries.map((en) => (
                                    <li key={en.id} className="entry-item">
                                        <div className="entry-meta">{new Date(en.date).toLocaleDateString('cs-CZ')} • {en.sets ?? '-'}×{en.reps ?? '-'} • {en.weight ?? '-'} kg</div>
                                        <div className="entry-note">{en.note}</div>
                                        <div className="entry-actions">
                                            <button onClick={() => startEdit(en)}>Upravit</button>
                                            <button onClick={() => handleDelete(en.id)}>Smazat</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
