import React, { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLocalBodyMeasurements, importLocalBodyMeasurementsToCloud } from '../services/bodyMeasurementStorage'
import { getLocalWorkoutEntries, importLocalWorkoutEntriesToCloud } from '../services/workoutStorage'

export default function SettingsPage() {
    const { user, logout } = useAuth()
    const [importMessage, setImportMessage] = useState<string | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [bodyImportMessage, setBodyImportMessage] = useState<string | null>(null)
    const [bodyImportError, setBodyImportError] = useState<string | null>(null)
    const [bodyImporting, setBodyImporting] = useState(false)
    const localWorkoutCount = useMemo(() => getLocalWorkoutEntries().length, [])
    const localBodyCount = useMemo(() => getLocalBodyMeasurements().length, [])

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

    return (
        <div className="page">
            <h1>Nastavení</h1>
            <p>Účet a synchronizace.</p>
            <div style={{ marginTop: 12 }}>
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
            </div>
        </div>
    )
}
