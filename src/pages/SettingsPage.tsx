import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
    const { user, logout } = useAuth()

    return (
        <div className="page">
            <h1>Nastavení</h1>
            <p>Účet a synchronizace.</p>
            <div style={{ marginTop: 12 }}>
                <div><strong>Email:</strong> {user?.email ?? '—'}</div>
                <div style={{ marginTop: 8 }}>
                    <button onClick={() => logout()}>Odhlásit</button>
                </div>
            </div>
        </div>
    )
}
