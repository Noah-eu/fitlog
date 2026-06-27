import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllEntries } from '../services/workoutStorage'
import { getAllMeasurements } from '../services/bodyMeasurementStorage'
import exercises from '../data/exercises'

function last7DaysCount(entries: { date: string }[]) {
    const now = new Date()
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return entries.filter((e) => {
        const d = new Date(e.date)
        return d >= cutoff
    }).length
}

export default function TodayPage() {
    const navigate = useNavigate()
    const entries = useMemo(() => getAllEntries(), [])
    const measurements = useMemo(() => getAllMeasurements(), [])

    const latestEntry = entries[0]
    const latestMeasurement = measurements[0]
    const weekCount = last7DaysCount(entries)

    function nameFor(id?: string) {
        if (!id) return 'Neznámý cvik'
        const ex = exercises.find((e) => e.id === id)
        return ex ? ex.name : 'Neznámý cvik'
    }

    return (
        <div className="page">
            <h1>FitLog / Dnes</h1>

            {(!latestEntry && !latestMeasurement) ? (
                <div>
                    <p>Žádná data zatím. Začněte záznamem cvičení nebo měřením těla.</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={() => navigate('/exercises')} className="primary">Začít cvičit</button>
                        <button onClick={() => navigate('/history')}>Zobrazit deník</button>
                        <button onClick={() => navigate('/body')}>Přidat měření</button>
                    </div>
                </div>
            ) : (
                <div className="dashboard">
                    <div className="cards">
                        <section className="card">
                            <h3>Poslední výkon</h3>
                            {latestEntry ? (
                                <div>
                                    <div className="muted">{nameFor(latestEntry.exerciseId)}</div>
                                    <div>{new Date(latestEntry.date).toLocaleString()}</div>
                                    <div className="small">{latestEntry.sets ?? '-'}×{latestEntry.reps ?? '-'} @ {latestEntry.weight ?? '-'} kg • {latestEntry.difficulty ?? '-'}</div>
                                </div>
                            ) : (
                                <div>Žádné záznamy výkonu.</div>
                            )}
                        </section>

                        <section className="card">
                            <h3>Moje tělo</h3>
                            {latestMeasurement ? (
                                <div>
                                    <div className="muted">{new Date(latestMeasurement.date).toLocaleDateString()}</div>
                                    <div>Váha: {latestMeasurement.bodyWeight ?? '-'} kg</div>
                                    <div className="small">Pas: {latestMeasurement.waist ?? '-'} cm • Hrudník: {latestMeasurement.chest ?? '-'} cm</div>
                                </div>
                            ) : (
                                <div>Žádná měření.</div>
                            )}
                        </section>

                        <section className="card">
                            <h3>Tento týden</h3>
                            <div style={{ fontSize: 20, fontWeight: 600 }}>{weekCount}</div>
                            <div className="small">záznamů v posledních 7 dnech</div>
                        </section>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={() => navigate('/exercises')} className="primary">Začít cvičit</button>
                        <button onClick={() => navigate('/history')}>Zobrazit deník</button>
                        <button onClick={() => navigate('/body')}>Přidat měření</button>
                    </div>
                </div>
            )}
        </div>
    )
}
