import React, { useEffect, useMemo, useState } from 'react'
import { deleteEntry, getWorkoutDateKey, subscribeToEntries, toStoredWorkoutDate, updateEntry } from '../services/workoutStorage'
import type { WorkoutEntry } from '../types/workout'
import exercises from '../data/exercises'
import WorkoutCalendar from '../components/WorkoutCalendar'

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
    return parseDateKey(dateKey).toLocaleDateString('cs-CZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function shiftDateKeyByMonths(dateKey: string, delta: number) {
    const current = parseDateKey(dateKey)
    const targetMonthDate = new Date(current.getFullYear(), current.getMonth() + delta, 1, 12)
    const lastDayOfTargetMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0, 12).getDate()
    const day = Math.min(current.getDate(), lastDayOfTargetMonth)
    return toDateKey(new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), day, 12))
}

export default function WorkoutHistoryPage() {
    const [entries, setEntries] = useState<WorkoutEntry[]>([])
    const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()))
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editNote, setEditNote] = useState<string>('')
    const [editWeight, setEditWeight] = useState<number | ''>('')
    const [editReps, setEditReps] = useState<number | ''>('')
    const [editSets, setEditSets] = useState<number | ''>('')
    const [editDate, setEditDate] = useState<string>('')
    const [editDifficulty, setEditDifficulty] = useState<'lehké' | 'akorát' | 'těžké'>('akorát')
    const [entryError, setEntryError] = useState<string | null>(null)

    useEffect(() => {
        return subscribeToEntries((nextEntries) => {
            const todayKey = toDateKey(new Date())
            const workoutDays = new Set(nextEntries.map((entry) => getWorkoutDateKey(entry.date)))

            setEntries(nextEntries)
            setSelectedDateKey((currentDateKey) => {
                if (workoutDays.has(currentDateKey)) return currentDateKey
                if (workoutDays.has(todayKey)) return todayKey
                return nextEntries[0] ? getWorkoutDateKey(nextEntries[0].date) : todayKey
            })
        })
    }, [])

    useEffect(() => {
        setCurrentMonth(parseDateKey(selectedDateKey))
    }, [selectedDateKey])

    const workoutDays = useMemo(() => new Set(entries.map((entry) => getWorkoutDateKey(entry.date))), [entries])
    const selectedDayEntries = useMemo(
        () => entries.filter((entry) => getWorkoutDateKey(entry.date) === selectedDateKey),
        [entries, selectedDateKey],
    )

    function startEdit(en: WorkoutEntry) {
        setEditingId(en.id)
        setEditNote(en.note ?? '')
        setEditWeight(en.weight ?? '')
        setEditReps(en.reps ?? '')
        setEditSets(en.sets ?? '')
        setEditDate(getWorkoutDateKey(en.date))
        setEditDifficulty(en.difficulty ?? 'akorát')
    }

    function cancelEdit() {
        setEditingId(null)
    }

    async function saveEdit(id: string) {
        setEntryError(null)

        try {
            await updateEntry(id, {
                date: toStoredWorkoutDate(editDate),
                weight: typeof editWeight === 'number' ? editWeight : undefined,
                reps: typeof editReps === 'number' ? editReps : undefined,
                sets: typeof editSets === 'number' ? editSets : undefined,
                difficulty: editDifficulty,
                note: editNote,
            })
            setEditingId(null)
        } catch (error) {
            setEntryError(error instanceof Error ? error.message : 'Nepodařilo se uložit změny.')
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Smazat tento záznam?')) return
        setEntryError(null)

        try {
            await deleteEntry(id)
        } catch (error) {
            setEntryError(error instanceof Error ? error.message : 'Nepodařilo se smazat záznam.')
        }
    }

    function handleSelectDate(dateKey: string) {
        setSelectedDateKey(dateKey)
        setCurrentMonth(parseDateKey(dateKey))
    }

    function handleChangeMonth(delta: number) {
        const nextDateKey = shiftDateKeyByMonths(selectedDateKey, delta)
        setSelectedDateKey(nextDateKey)
        setCurrentMonth(parseDateKey(nextDateKey))
    }


    function nameFor(id: string) {
        const ex = exercises.find((e) => e.id === id)
        return ex ? ex.name : id
    }

    return (
        <div className="page">
            <h1>Deník</h1>
            <WorkoutCalendar
                month={currentMonth}
                selectedDateKey={selectedDateKey}
                highlightedDateKeys={workoutDays}
                todayDateKey={toDateKey(new Date())}
                onSelectDate={handleSelectDate}
                onChangeMonth={handleChangeMonth}
            />

            <section className="history-day-section">
                <div className="section-heading">
                    <h2>{formatDateKey(selectedDateKey)}</h2>
                    <span>{selectedDayEntries.length} záznamů</span>
                </div>

                {selectedDayEntries.length === 0 ? (
                    <div className="card empty-state-card">
                        <p>Pro tento den zatím není uložený žádný trénink.</p>
                    </div>
                ) : (
                    <>
                        {entryError ? <div className="form-error">{entryError}</div> : null}
                        <ul className="entry-list">
                            {selectedDayEntries.map((en) => (
                                <li key={en.id} className="entry-item">
                                    <div className="entry-top">
                                        <div className="entry-title">{nameFor(en.exerciseId)}</div>
                                        <div className="entry-date">{new Date(en.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    {editingId === en.id ? (
                                        <div className="edit-form">
                                            <label>Datum<input type="date" value={editDate} onChange={(ev) => setEditDate(ev.target.value)} /></label>
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
                    </>
                )}
            </section>
        </div>
    )
}
