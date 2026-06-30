import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { findExerciseById, getEquivalentExerciseIds, resolveExerciseId } from '../data/exercises'
import { getTrainingPreferences, subscribeToTrainingPreferences, saveTrainingPreferences } from '../services/trainingPreferencesStorage'
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
    const ex = findExerciseById(id ?? '')

    function hasRouterHistory() {
        if (typeof window === 'undefined') return false
        const state = window.history.state as { idx?: number } | null
        return typeof state?.idx === 'number' && state.idx > 0
    }

    const location = useLocation()

    if (!ex) {
        return (
            <div className="page">
                <BackButton fallbackTo={`/exercises${location.search}`} />
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

    const [trainingPreferences, setTrainingPreferences] = useState(getTrainingPreferences())
    const [prefSaving, setPrefSaving] = useState(false)


    useEffect(() => {
        if (!ex.id) return

        const relatedExerciseIds = new Set(getEquivalentExerciseIds(ex.id))

        return subscribeToEntries((allEntries) => {
            setEntries(allEntries.filter((entry) => relatedExerciseIds.has(entry.exerciseId)))
        })
    }, [ex.id])

    useEffect(() => {
        return subscribeToTrainingPreferences(setTrainingPreferences)
    }, [])

    const canonicalId = ex?.id ? resolveExerciseId(ex.id) : null
    const isExcluded = canonicalId ? (trainingPreferences?.excludedExerciseIds ?? []).includes(canonicalId) : false

    const last = useMemo(() => entries[0], [entries])
    const chartPoints = useMemo(() => getDailyMaxWeightPoints(entries), [entries])

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

            setWeight('')
            setReps('')
            setSetsVal('')
            setNote('')
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
        setDate(getWorkoutDateKey(item.date))
        setWeight(item.weight ?? '')
        setReps(item.reps ?? '')
        setSetsVal(item.sets ?? '')
        setDifficulty(item.difficulty ?? 'akorát')
        setNote(item.note ?? '')
        window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <BackButton fallbackTo={`/exercises${location.search}`} />
            <h1>{ex.name}</h1>
            <div className="exercise-detail">
                <div className="thumb large">
                    {ex.imageUrl ? <img src={ex.imageUrl} alt={ex.name} /> : null}
                </div>
                <div className="meta">
                    <div className="cat">{ex.subcategory ? `${ex.category} • ${ex.subcategory}` : ex.category}</div>
                    <p><strong>Primární svaly:</strong> {ex.primaryMuscles.join(', ')}</p>
                    {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                        <p><strong>Sekundární svaly:</strong> {ex.secondaryMuscles.join(', ')}</p>
                    )}
                    <p><strong>Instrukce:</strong> {ex.instructions}</p>
                    <p><strong>Časté chyby:</strong> {ex.commonMistakes.join('; ')}</p>
                    <p><strong>Doporučené opakování:</strong> {ex.recommendedReps}</p>
                    <p><strong>Doporučené série:</strong> {ex.recommendedSets}</p>

                    <form className="entry-form" onSubmit={handleSave}>
                        <div style={{ marginBottom: 8 }}>
                            {(() => {
                                const excluded = isExcluded
                                return (
                                    <button
                                        type="button"
                                        className="selectable-chip"
                                        onClick={async () => {
                                            if (prefSaving) return
                                            setPrefSaving(true)
                                            try {
                                                const current = trainingPreferences?.excludedExerciseIds ?? []
                                                const next = current.includes(canonicalId) ? current.filter((id) => id !== canonicalId) : [...current, canonicalId]
                                                await saveTrainingPreferences({ excludedExerciseIds: next })
                                            } finally {
                                                setPrefSaving(false)
                                            }
                                        }}
                                    >
                                        {excluded ? 'Znovu zařadit do tréninkového plánu' : 'Nezařazovat do tréninkového plánu'}
                                    </button>
                                )
                            })()}
                        </div>
                        {isExcluded ? (
                            <div className="small muted" style={{ marginBottom: 8 }}>Tento cvik se nebude objevovat v doporučeném plánu.</div>
                        ) : null}
                        <label>
                            Datum
                            <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
                        </label>
                        <label>
                            Váha (kg)
                            <input type="number" value={weight as any} onChange={(ev) => setWeight(ev.target.value === '' ? '' : Number(ev.target.value))} />
                        </label>
                        <label>
                            Opakování
                            <input type="number" value={reps as any} onChange={(ev) => setReps(ev.target.value === '' ? '' : Number(ev.target.value))} />
                        </label>
                        <label>
                            Série
                            <input type="number" value={setsVal as any} onChange={(ev) => setSetsVal(ev.target.value === '' ? '' : Number(ev.target.value))} />
                        </label>
                        <label>
                            Obtížnost
                            <select value={difficulty} onChange={(ev) => setDifficulty(ev.target.value as any)}>
                                <option value="lehké">lehké</option>
                                <option value="akorát">akorát</option>
                                <option value="těžké">těžké</option>
                            </select>
                        </label>
                        <label>
                            Poznámka
                            <textarea value={note} onChange={(ev) => setNote(ev.target.value)} />
                        </label>
                        <button type="submit" className="primary">Zapsat výkon</button>
                        {saveError ? <div className="form-error">{saveError}</div> : null}
                    </form>

                    {last && (
                        <div className="last-performance">
                            <h3>Poslední výkon</h3>
                            <p>{new Date(last.date).toLocaleDateString('cs-CZ')} — {last.sets ?? '-'}×{last.reps ?? '-'} @ {last.weight ?? '-'} kg ({last.difficulty ?? '-'})</p>
                        </div>
                    )}

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
