import React, { useEffect, useState } from 'react'
import { getAllEntries } from '../services/workoutStorage'
import type { WorkoutEntry } from '../types/workout'
import exercises from '../data/exercises'

export default function WorkoutHistoryPage() {
    const [entries, setEntries] = useState<WorkoutEntry[]>([])

    useEffect(() => {
        setEntries(getAllEntries())
    }, [])

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
                            <div className="entry-meta">{en.sets ?? '-'}×{en.reps ?? '-'} • {en.weight ?? '-'} kg • {en.difficulty ?? '-'}</div>
                            {en.note && <div className="entry-note">{en.note}</div>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
