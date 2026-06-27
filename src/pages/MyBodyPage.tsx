import React, { useEffect, useState } from 'react'
import type { BodyMeasurement } from '../types/body'
import { getAllMeasurements, saveMeasurement, updateMeasurement, deleteMeasurement } from '../services/bodyMeasurementStorage'

function todayISODate() {
    const t = new Date()
    const yyyy = t.getFullYear()
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd = String(t.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export default function MyBodyPage() {
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
    const [date, setDate] = useState<string>(todayISODate())
    const [bodyWeight, setBodyWeight] = useState<number | ''>('')
    const [chest, setChest] = useState<number | ''>('')
    const [waist, setWaist] = useState<number | ''>('')
    const [biceps, setBiceps] = useState<number | ''>('')
    const [thighs, setThighs] = useState<number | ''>('')
    const [note, setNote] = useState<string>('')
    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        setMeasurements(getAllMeasurements())
    }, [])

    function resetForm() {
        setDate(todayISODate())
        setBodyWeight('')
        setChest('')
        setWaist('')
        setBiceps('')
        setThighs('')
        setNote('')
        setEditingId(null)
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (editingId) {
            const updated = updateMeasurement(editingId, {
                date: new Date(date).toISOString(),
                bodyWeight: typeof bodyWeight === 'number' ? bodyWeight : undefined,
                chest: typeof chest === 'number' ? chest : undefined,
                waist: typeof waist === 'number' ? waist : undefined,
                biceps: typeof biceps === 'number' ? biceps : undefined,
                thighs: typeof thighs === 'number' ? thighs : undefined,
                note,
            })
            if (updated) setMeasurements(getAllMeasurements())
            resetForm()
            return
        }

        const saved = saveMeasurement({
            date: new Date(date).toISOString(),
            bodyWeight: typeof bodyWeight === 'number' ? bodyWeight : undefined,
            chest: typeof chest === 'number' ? chest : undefined,
            waist: typeof waist === 'number' ? waist : undefined,
            biceps: typeof biceps === 'number' ? biceps : undefined,
            thighs: typeof thighs === 'number' ? thighs : undefined,
            note,
        })
        setMeasurements((s) => [saved, ...s])
        resetForm()
    }

    function startEdit(m: BodyMeasurement) {
        setEditingId(m.id)
        setDate(m.date.slice(0, 10))
        setBodyWeight(m.bodyWeight ?? '')
        setChest(m.chest ?? '')
        setWaist(m.waist ?? '')
        setBiceps(m.biceps ?? '')
        setThighs(m.thighs ?? '')
        setNote(m.note ?? '')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function handleDelete(id: string) {
        if (!confirm('Smazat toto měření?')) return
        const ok = deleteMeasurement(id)
        if (!ok) return
        setMeasurements(getAllMeasurements())
    }

    const latest = measurements[0]

    return (
        <div className="page">
            <h1>Moje tělo</h1>

            <form className="entry-form" onSubmit={handleSubmit}>
                <label>
                    Datum
                    <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
                </label>
                <label>
                    Váha (kg)
                    <input type="number" value={bodyWeight as any} onChange={(ev) => setBodyWeight(ev.target.value === '' ? '' : Number(ev.target.value))} />
                </label>
                <label>
                    Hrudník (cm)
                    <input type="number" value={chest as any} onChange={(ev) => setChest(ev.target.value === '' ? '' : Number(ev.target.value))} />
                </label>
                <label>
                    Pas (cm)
                    <input type="number" value={waist as any} onChange={(ev) => setWaist(ev.target.value === '' ? '' : Number(ev.target.value))} />
                </label>
                <label>
                    Biceps (cm)
                    <input type="number" value={biceps as any} onChange={(ev) => setBiceps(ev.target.value === '' ? '' : Number(ev.target.value))} />
                </label>
                <label>
                    Stehna (cm)
                    <input type="number" value={thighs as any} onChange={(ev) => setThighs(ev.target.value === '' ? '' : Number(ev.target.value))} />
                </label>
                <label>
                    Poznámka
                    <textarea value={note} onChange={(ev) => setNote(ev.target.value)} />
                </label>
                <div style={{display:'flex',gap:8}}>
                    <button type="submit" className="primary">{editingId ? 'Uložit' : 'Přidat měření'}</button>
                    {editingId && <button type="button" onClick={resetForm}>Zrušit</button>}
                </div>
            </form>

            {latest && (
                <div className="last-performance">
                    <h3>Poslední měření</h3>
                    <div>Datum: {new Date(latest.date).toLocaleDateString()}</div>
                    <div>Váha: {latest.bodyWeight ?? '-'} kg</div>
                    <div>Hrudník: {latest.chest ?? '-'} cm • Pas: {latest.waist ?? '-'} cm</div>
                    <div>Biceps: {latest.biceps ?? '-'} cm • Stehna: {latest.thighs ?? '-'} cm</div>
                    {latest.note && <div>Poznámka: {latest.note}</div>}
                </div>
            )}

            <div className="entry-list">
                {measurements.length === 0 ? (
                    <p>Žádná měření.</p>
                ) : (
                    measurements.map((m) => (
                        <div key={m.id} className="entry-item">
                            <div className="entry-top">
                                <div className="entry-title">{new Date(m.date).toLocaleDateString()}</div>
                                <div className="entry-actions">
                                    <button onClick={() => startEdit(m)}>Upravit</button>
                                    <button onClick={() => handleDelete(m.id)}>Smazat</button>
                                </div>
                            </div>
                            <div className="entry-meta">{m.bodyWeight ?? '-'} kg • {m.chest ?? '-'} cm / {m.waist ?? '-'} cm</div>
                            {m.note && <div className="entry-note">{m.note}</div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
