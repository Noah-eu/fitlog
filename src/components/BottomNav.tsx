import React from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
    { to: '/', label: 'Dnes' },
    { to: '/exercises', label: 'Cvičení' },
    { to: '/history', label: 'Deník' },
    { to: '/body', label: 'Moje tělo' },
    { to: '/settings', label: 'Nastavení' },
]

export default function BottomNav() {
    return (
        <nav className="bottom-nav">
            {tabs.map((t) => (
                <NavLink
                    to={t.to}
                    key={t.to}
                    end={t.to === '/'}
                    className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
                >
                    {t.label}
                </NavLink>
            ))}
        </nav>
    )
}
