import React from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppShell() {
    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="brand-lockup">
                    <span className="brand-kicker">TRAINING LOG</span>
                    <span className="brand-title">FitLog</span>
                </div>
            </header>
            <main className="app-content">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    )
}
