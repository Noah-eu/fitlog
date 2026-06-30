import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import exercises from '../data/exercises'
import { getLocalBodyMeasurements, importLocalBodyMeasurementsToCloud } from '../services/bodyMeasurementStorage'
import {
    DEFAULT_TRAINING_CATEGORIES,
    getDefaultTrainingPreferences,
    saveTrainingPreferences,
    subscribeToTrainingPreferences,
} from '../services/trainingPreferencesStorage'
import { getLocalWorkoutEntries, importLocalWorkoutEntriesToCloud } from '../services/workoutStorage'
import type { TrainingPreferences } from '../types/trainingPreferences'

function formatUpdatedAt(value: string) {
    return new Date(value).toLocaleString('cs-CZ')
}

function orderTrainingCategories(categories: string[]) {
    const priority = [...DEFAULT_TRAINING_CATEGORIES]
    const prioritized = priority.filter((category) => categories.includes(category))
    const rest = categories.filter((category) => !priority.includes(category)).sort((left, right) => left.localeCompare(right, 'cs'))
    return [...prioritized, ...rest]
}

export default function SettingsPage() {
    const { user, logout } = useAuth()
    const [importMessage, setImportMessage] = useState<string | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [bodyImportMessage, setBodyImportMessage] = useState<string | null>(null)
    const [bodyImportError, setBodyImportError] = useState<string | null>(null)
    const [bodyImporting, setBodyImporting] = useState(false)
    const [trainingPreferences, setTrainingPreferences] = useState<TrainingPreferences>(getDefaultTrainingPreferences())
    const [draftPreferences, setDraftPreferences] = useState<TrainingPreferences>(getDefaultTrainingPreferences())
    const [trainingSaveMessage, setTrainingSaveMessage] = useState<string | null>(null)
    const [trainingSaveError, setTrainingSaveError] = useState<string | null>(null)
    const [trainingSaving, setTrainingSaving] = useState(false)
    const localWorkoutCount = useMemo(() => getLocalWorkoutEntries().length, [])
    const localBodyCount = useMemo(() => getLocalBodyMeasurements().length, [])
    const trainingCategories = useMemo(() => {
        const uniqueCategories = Array.from(new Set(exercises.map((exercise) => exercise.category)))
        return orderTrainingCategories(uniqueCategories)
    }, [])

    useEffect(() => {
        return subscribeToTrainingPreferences((preferences) => {
            setTrainingPreferences(preferences)
            setDraftPreferences(preferences)
        })
    }, [])

    async function handleImport() {
        setImportError(null)
        setImportMessage(null)
        setImporting(true)

        try {
            const importedCount = await importLocalWorkoutEntriesToCloud()
            setImportMessage(
                importedCount > 0
                    ? `Do cloudu bylo nahráno ${importedCount} lokálních tréninkových záznamů.`
                    : 'V tomto zařízení nejsou žádné lokální tréninkové záznamy k importu.',
            )
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Import lokálních záznamů selhal.')
        } finally {
            setImporting(false)
        }
    }

    async function handleBodyImport() {
        setBodyImportError(null)
        setBodyImportMessage(null)
        setBodyImporting(true)

        try {
            const importedCount = await importLocalBodyMeasurementsToCloud()
            setBodyImportMessage(
                importedCount > 0
                    ? `Do cloudu bylo nahráno ${importedCount} lokálních měření.`
                    : 'V tomto zařízení nejsou žádná lokální měření k importu.',
            )
        } catch (error) {
            setBodyImportError(error instanceof Error ? error.message : 'Import lokálních měření selhal.')
        } finally {
            setBodyImporting(false)
        }
    }

    function handleToggleCategory(category: string) {
        setTrainingSaveMessage(null)
        setTrainingSaveError(null)
        setDraftPreferences((current) => {
            const enabledCategories = current.enabledCategories.includes(category)
                ? current.enabledCategories.filter((item) => item !== category)
                : orderTrainingCategories([...current.enabledCategories, category])

            return {
                ...current,
                enabledCategories,
            }
        })
    }

    function handleDraftNumberChange(field: 'targetExerciseCount' | 'avoidRecentlyUsedDays', value: number) {
        setTrainingSaveMessage(null)
        setTrainingSaveError(null)
        setDraftPreferences((current) => ({
            ...current,
            [field]: value,
        }))
    }

    async function handleTrainingPreferencesSave() {
        setTrainingSaveMessage(null)
        setTrainingSaveError(null)
        setTrainingSaving(true)

        try {
            const saved = await saveTrainingPreferences(draftPreferences)
            setDraftPreferences(saved)
            setTrainingSaveMessage('Tréninkový plán byl uložen.')
        } catch (error) {
            setTrainingSaveError(error instanceof Error ? error.message : 'Uložení tréninkového plánu selhalo.')
        } finally {
            setTrainingSaving(false)
        }
    }

    return (
        <div className="page">
            <h1>Nastavení</h1>
            <p>Účet a synchronizace.</p>
            <div className="settings-layout">
                <section className="card settings-section">
                    <div className="section-heading">
                        <div>
                            <h3>Tréninkový plán</h3>
                            <span>Určuje blok Dnes doporučeno</span>
                        </div>
                    </div>

                    <label className="settings-field">
                        <span className="settings-field-label">Styl</span>
                        <select
                            value={draftPreferences.style}
                            onChange={(event) => setDraftPreferences((current) => ({ ...current, style: event.target.value as TrainingPreferences['style'] }))}
                        >
                            <option value="fullBody">Full body</option>
                        </select>
                    </label>

                    <div className="settings-field">
                        <span className="settings-field-label">Zapnuté kategorie</span>
                        <div className="settings-chip-group">
                            {trainingCategories.map((category) => {
                                const active = draftPreferences.enabledCategories.includes(category)
                                return (
                                    <button
                                        key={category}
                                        type="button"
                                        className={`settings-chip${active ? ' active' : ''}`}
                                        onClick={() => handleToggleCategory(category)}
                                    >
                                        {category}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="settings-grid">
                        <label className="settings-field">
                            <span className="settings-field-label">Počet doporučených cviků</span>
                            <input
                                type="number"
                                min={3}
                                max={10}
                                value={draftPreferences.targetExerciseCount}
                                onChange={(event) => handleDraftNumberChange('targetExerciseCount', Number(event.target.value))}
                            />
                        </label>

                        <label className="settings-field">
                            <span className="settings-field-label">Vyhnout se posledním dnům</span>
                            <input
                                type="number"
                                min={0}
                                max={14}
                                value={draftPreferences.avoidRecentlyUsedDays}
                                onChange={(event) => handleDraftNumberChange('avoidRecentlyUsedDays', Number(event.target.value))}
                            />
                        </label>
                    </div>

                    <div className="settings-meta">
                        <span>Aktivní kategorie: {trainingPreferences.enabledCategories.join(', ') || 'žádné'}</span>
                        <span>Naposledy uloženo: {formatUpdatedAt(trainingPreferences.updatedAt)}</span>
                    </div>

                    <div className="dashboard-actions">
                        <button type="button" className="primary" onClick={handleTrainingPreferencesSave} disabled={trainingSaving}>
                            {trainingSaving ? 'Ukládám...' : 'Uložit plán'}
                        </button>
                        <button type="button" onClick={() => setDraftPreferences(getDefaultTrainingPreferences())}>
                            Obnovit výchozí
                        </button>
                    </div>

                    {trainingSaveMessage ? <p>{trainingSaveMessage}</p> : null}
                    {trainingSaveError ? <div className="form-error">{trainingSaveError}</div> : null}
                </section>

                <section className="card settings-section">
                    <div><strong>Email:</strong> {user?.email ?? '—'}</div>
                    <div style={{ marginTop: 8 }}>
                        <div><strong>Lokální tréninkové záznamy:</strong> {localWorkoutCount}</div>
                        <button onClick={handleImport} disabled={importing} style={{ marginTop: 8 }}>
                            {importing ? 'Importuji...' : 'Importovat lokální workouty do cloudu'}
                        </button>
                        {importMessage ? <p style={{ marginTop: 8 }}>{importMessage}</p> : null}
                        {importError ? <div className="form-error" style={{ marginTop: 8 }}>{importError}</div> : null}
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <div><strong>Lokální měření:</strong> {localBodyCount}</div>
                        <button onClick={handleBodyImport} disabled={bodyImporting} style={{ marginTop: 8 }}>
                            {bodyImporting ? 'Importuji...' : 'Importovat lokální měření do cloudu'}
                        </button>
                        {bodyImportMessage ? <p style={{ marginTop: 8 }}>{bodyImportMessage}</p> : null}
                        {bodyImportError ? <div className="form-error" style={{ marginTop: 8 }}>{bodyImportError}</div> : null}
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <button onClick={() => logout()}>Odhlásit</button>
                    </div>
                </section>
            </div>
        </div>
    )
}
