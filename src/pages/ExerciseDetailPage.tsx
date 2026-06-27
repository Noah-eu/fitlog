import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import exercises from '../data/exercises'
import type { WorkoutEntry } from '../types/workout'
import { getEntriesByExercise, saveEntry, updateEntry, deleteEntry } from '../services/workoutStorage'

function todayISODate() {
    const t = new Date()
    const yyyy = t.getFullYear()
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd = String(t.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export default function ExerciseDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const ex = exercises.find((e) => e.id === id)

    if (!ex) {
        return (
            <div className="page">
                <h1>Nenalezeno</h1>
                <p>Cvičení nebylo nalezeno.</p>
                <button onClick={() => navigate('/exercises')}>Zpět</button>
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


    useEffect(() => {
        if (ex.id) setEntries(getEntriesByExercise(ex.id))
    }, [ex.id])

    const last = useMemo(() => entries[0], [entries])

    function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!ex.id) return
        if (editingId) {
            const updated = updateEntry(editingId, {
                exerciseId: ex.id,
                date: new Date(date).toISOString(),
                weight: typeof weight === 'number' && !Number.isNaN(weight) ? weight : undefined,
                reps: typeof reps === 'number' && !Number.isNaN(reps) ? reps : undefined,
                sets: typeof setsVal === 'number' && !Number.isNaN(setsVal) ? setsVal : undefined,
                difficulty,
                note,
            })
            if (updated) {
                setEntries((s) => [updated, ...s.filter((i) => i.id !== updated.id)])
            }
            setEditingId(null)
        } else {
            const entry = saveEntry({
                exerciseId: ex.id,
                date: new Date(date).toISOString(),
                weight: typeof weight === 'number' && !Number.isNaN(weight) ? weight : undefined,
                reps: typeof reps === 'number' && !Number.isNaN(reps) ? reps : undefined,
                sets: typeof setsVal === 'number' && !Number.isNaN(setsVal) ? setsVal : undefined,
                difficulty,
                note,
            })
            setEntries((s) => [entry, ...s])
        }
        // reset lightweight fields
        setWeight('')
        setReps('')
        setSetsVal('')
        setNote('')
    }

    function startEdit(item: WorkoutEntry) {
        setEditingId(item.id)
        setDate(item.date.slice(0, 10))
        setWeight(item.weight ?? '')
        setReps(item.reps ?? '')
        setSetsVal(item.sets ?? '')
        setDifficulty(item.difficulty ?? 'akorát')
        setNote(item.note ?? '')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function handleDelete(id: string) {
        if (!confirm('Smazat tento záznam?')) return
        const ok = deleteEntry(id)
        if (!ok) return
        setEntries((s) => s.filter((i) => i.id !== id))
    }

    return (
        <div className="page">
            <button className="back" onClick={() => navigate('/exercises')}>Zpět</button>
            <h1>{ex.name}</h1>
            <div className="exercise-detail">
                <div className="thumb large" />
                <div className="meta">
                    <div className="cat">{ex.category}</div>
                    <p><strong>Primární svaly:</strong> {ex.primaryMuscles.join(', ')}</p>
                    {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                        <p><strong>Sekundární svaly:</strong> {ex.secondaryMuscles.join(', ')}</p>
                    )}
                    <p><strong>Instrukce:</strong> {ex.instructions}</p>
                    <p><strong>Časté chyby:</strong> {ex.commonMistakes.join('; ')}</p>
                    <p><strong>Doporučené opakování:</strong> {ex.recommendedReps}</p>
                    <p><strong>Doporučené série:</strong> {ex.recommendedSets}</p>

                    <form className="entry-form" onSubmit={handleSave}>
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
                    </form>

                    {last && (
                        <div className="last-performance">
                            <h3>Poslední výkon</h3>
                            <p>{new Date(last.date).toLocaleString()} — {last.sets ?? '-'}×{last.reps ?? '-'} @ {last.weight ?? '-'} kg ({last.difficulty ?? '-'})</p>
                        </div>
                    )}

                    {entries.length > 0 && (
                        <div className="recent-entries">
                            <h3>Nedávné</h3>
                            <ul>
                                            {entries.map((en) => (
                                                <li key={en.id} className="entry-item">
                                                    <div className="entry-meta">{new Date(en.date).toLocaleDateString()} • {en.sets ?? '-'}×{en.reps ?? '-'} • {en.weight ?? '-'} kg</div>
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
