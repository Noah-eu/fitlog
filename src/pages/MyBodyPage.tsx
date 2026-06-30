import React, { useEffect, useMemo, useState } from 'react'
import type { BodyMeasurement } from '../types/body'
import { deleteMeasurement, saveMeasurement, subscribeToMeasurements, updateMeasurement } from '../services/bodyMeasurementStorage'
import ProgressLineChart from '../components/ProgressLineChart'

type MeasurementMetricKey = 'bodyWeight' | 'chest' | 'waist' | 'biceps' | 'thighs'

const MEASUREMENT_METRICS: { key: MeasurementMetricKey; label: string; suffix: string }[] = [
    { key: 'bodyWeight', label: 'Váha', suffix: 'kg' },
    { key: 'chest', label: 'Hrudník', suffix: 'cm' },
    { key: 'waist', label: 'Pas', suffix: 'cm' },
    { key: 'biceps', label: 'Biceps', suffix: 'cm' },
    { key: 'thighs', label: 'Stehna', suffix: 'cm' },
]

function formatChartDate(date: string) {
    const [year, month, day] = date.split('-').map(Number)
    if (!year || !month || !day) return date
    return `${day}. ${month}.`
}

function getMeasurementDayKey(date: string) {
    return date.slice(0, 10)
}

function getDailyMetricPoints(measurements: BodyMeasurement[], metric: MeasurementMetricKey) {
    const latestValueByDate = new Map<string, { value: number; orderKey: string }>()

    for (const measurement of measurements) {
        const value = measurement[metric]
        if (typeof value !== 'number' || !Number.isFinite(value)) continue

        const dayKey = getMeasurementDayKey(measurement.date)
        const orderKey = measurement.updatedAt ?? measurement.createdAt ?? measurement.date
        const existing = latestValueByDate.get(dayKey)

        if (!existing || orderKey.localeCompare(existing.orderKey) > 0) {
            latestValueByDate.set(dayKey, {
                value,
                orderKey,
            })
        }
    }

    return Array.from(latestValueByDate.entries())
        .sort(([leftDay], [rightDay]) => leftDay.localeCompare(rightDay))
        .map(([dayKey, point]) => ({
            label: formatChartDate(dayKey),
            value: point.value,
        }))
}

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
    const [saveError, setSaveError] = useState<string | null>(null)
    const [selectedMetric, setSelectedMetric] = useState<MeasurementMetricKey>('bodyWeight')

    useEffect(() => {
        return subscribeToMeasurements(setMeasurements)
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaveError(null)

        try {
            if (editingId) {
                await updateMeasurement(editingId, {
                    date: new Date(date).toISOString(),
                    bodyWeight: typeof bodyWeight === 'number' ? bodyWeight : undefined,
                    chest: typeof chest === 'number' ? chest : undefined,
                    waist: typeof waist === 'number' ? waist : undefined,
                    biceps: typeof biceps === 'number' ? biceps : undefined,
                    thighs: typeof thighs === 'number' ? thighs : undefined,
                    note,
                })
                resetForm()
                return
            }

            await saveMeasurement({
                date: new Date(date).toISOString(),
                bodyWeight: typeof bodyWeight === 'number' ? bodyWeight : undefined,
                chest: typeof chest === 'number' ? chest : undefined,
                waist: typeof waist === 'number' ? waist : undefined,
                biceps: typeof biceps === 'number' ? biceps : undefined,
                thighs: typeof thighs === 'number' ? thighs : undefined,
                note,
            })
            resetForm()
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Nepodařilo se uložit měření.')
        }
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

    async function handleDelete(id: string) {
        if (!confirm('Smazat toto měření?')) return
        setSaveError(null)

        try {
            await deleteMeasurement(id)
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Nepodařilo se smazat měření.')
        }
    }

    const latest = measurements[0]
    const chartMeasurements = useMemo(() => [...measurements].sort((a, b) => a.date.localeCompare(b.date)), [measurements])
    const metricsWithData = useMemo(
        () => new Set<MeasurementMetricKey>(
            MEASUREMENT_METRICS
                .filter(({ key }) => chartMeasurements.some((measurement) => typeof measurement[key] === 'number'))
                .map(({ key }) => key),
        ),
        [chartMeasurements],
    )
    const preferredMetric = useMemo(() => {
        if (metricsWithData.has('bodyWeight')) return 'bodyWeight'
        return MEASUREMENT_METRICS.find(({ key }) => metricsWithData.has(key))?.key ?? 'bodyWeight'
    }, [metricsWithData])
    const selectedMetricConfig = MEASUREMENT_METRICS.find(({ key }) => key === selectedMetric) ?? MEASUREMENT_METRICS[0]
    const chartPoints = useMemo(() => getDailyMetricPoints(chartMeasurements, selectedMetric), [chartMeasurements, selectedMetric])

    useEffect(() => {
        if (!metricsWithData.size) return
        if (!metricsWithData.has(selectedMetric)) {
            setSelectedMetric(preferredMetric)
        }
    }, [metricsWithData, preferredMetric, selectedMetric])

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
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="primary">{editingId ? 'Uložit' : 'Přidat měření'}</button>
                    {editingId && <button type="button" onClick={resetForm}>Zrušit</button>}
                </div>
                {saveError ? <div className="form-error">{saveError}</div> : null}
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

            <section className="chart-section card">
                <div className="section-heading">
                    <h3>Vývoj</h3>
                    <span>Poslední platná hodnota za den</span>
                </div>

                <div className="chart-tabs" role="tablist" aria-label="Metriky vývoje těla">
                    {MEASUREMENT_METRICS.map((metric) => (
                        <button
                            key={metric.key}
                            type="button"
                            className={`chart-tab selectable-chip ${metric.key === selectedMetric ? 'selectable-chip--active active' : ''}`}
                            onClick={() => setSelectedMetric(metric.key)}
                            aria-pressed={metric.key === selectedMetric}
                        >
                            {metric.label}
                        </button>
                    ))}
                </div>

                <ProgressLineChart
                    points={chartPoints}
                    valueSuffix={selectedMetricConfig.suffix}
                    emptyStateText={`Zatím nemáš žádná data pro tuto hodnotu.`}
                    singlePointText={`Pro čárový graf přidej ještě jeden den měření.`}
                />
            </section>

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
