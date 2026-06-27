import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            await login(email, password)
            navigate('/')
        } catch (err: any) {
            setError(err?.message || 'Chyba přihlášení')
        }
    }

    return (
        <div className="page">
            <h1>Přihlášení</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input placeholder="Heslo" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="primary" type="submit">Přihlásit</button>
                {error && <div style={{ color: 'red' }}>{error}</div>}
            </form>
        </div>
    )
}
