import React, { useEffect, useState } from 'react'
import { getAllEntries, updateEntry, deleteEntry } from '../services/workoutStorage'
import type { WorkoutEntry } from '../types/workout'
import exercises from '../data/exercises'

export default function WorkoutHistoryPage() {
    const [entries, setEntries] = useState<WorkoutEntry[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editNote, setEditNote] = useState<string>('')
    const [editWeight, setEditWeight] = useState<number | ''>('')
    const [editReps, setEditReps] = useState<number | ''>('')
    const [editSets, setEditSets] = useState<number | ''>('')
    const [editDate, setEditDate] = useState<string>('')
    const [editDifficulty, setEditDifficulty] = useState<'lehké' | 'akorát' | 'těžké'>('akorát')

    useEffect(() => {
        setEntries(getAllEntries())
    }, [])

    function startEdit(en: WorkoutEntry) {
        setEditingId(en.id)
        setEditNote(en.note ?? '')
        setEditWeight(en.weight ?? '')
        setEditReps(en.reps ?? '')
        setEditSets(en.sets ?? '')
        setEditDate(en.date.slice(0, 10))
        setEditDifficulty(en.difficulty ?? 'akorát')
    }

    function cancelEdit() {
        setEditingId(null)
    }

    function saveEdit(id: string) {
        const updated = updateEntry(id, {
            date: new Date(editDate).toISOString(),
            weight: typeof editWeight === 'number' ? editWeight : undefined,
            reps: typeof editReps === 'number' ? editReps : undefined,
            sets: typeof editSets === 'number' ? editSets : undefined,
            difficulty: editDifficulty,
            note: editNote,
        })
        if (updated) setEntries(getAllEntries())
        setEditingId(null)
    }

    function handleDelete(id: string) {
        if (!confirm('Smazat tento záznam?')) return
        const ok = deleteEntry(id)
        if (!ok) return
        setEntries(getAllEntries())
    }


    function nameFor(id: string) {
        const ex = exercises.find((e) => e.id === id)
        return ex ? ex.name : id
    }

    return (
        <div className="page">
            <h1>Deník</h1>
            {entries.length === 0 ? (
                <p>Žádné záznamy.</p>
            ) : (
                <ul className="entry-list">
                    {entries.map((en) => (
                        <li key={en.id} className="entry-item">
                            <div className="entry-top">
                                <div className="entry-title">{nameFor(en.exerciseId)}</div>
                                <div className="entry-date">{new Date(en.date).toLocaleString()}</div>
                            </div>
                            {editingId === en.id ? (
                                <div className="edit-form">
                                    <label>Date<input type="date" value={editDate} onChange={(ev) => setEditDate(ev.target.value)} /></label>
                                    <label>Váha<input type="number" value={editWeight as any} onChange={(ev) => setEditWeight(ev.target.value === '' ? '' : Number(ev.target.value))} /></label>
                                    <label>Opakování<input type="number" value={editReps as any} onChange={(ev) => setEditReps(ev.target.value === '' ? '' : Number(ev.target.value))} /></label>
                                    <label>Série<input type="number" value={editSets as any} onChange={(ev) => setEditSets(ev.target.value === '' ? '' : Number(ev.target.value))} /></label>
                                    <label>Obtížnost
                                        <select value={editDifficulty} onChange={(ev) => setEditDifficulty(ev.target.value as any)}>
                                            <option value="lehké">lehké</option>
                                            <option value="akorát">akorát</option>
                                            <option value="těžké">těžké</option>
                                        </select>
                                    </label>
                                    <label>Poznámka<textarea value={editNote} onChange={(ev) => setEditNote(ev.target.value)} /></label>
                                    <div className="edit-actions">
                                        <button onClick={() => saveEdit(en.id)}>Uložit</button>
                                        <button onClick={cancelEdit}>Zrušit</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="entry-meta">{en.sets ?? '-'}×{en.reps ?? '-'} • {en.weight ?? '-'} kg • {en.difficulty ?? '-'}</div>
                                    {en.note && <div className="entry-note">{en.note}</div>}
                                    <div className="entry-actions">
                                        <button onClick={() => startEdit(en)}>Upravit</button>
                                        <button onClick={() => handleDelete(en.id)}>Smazat</button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
