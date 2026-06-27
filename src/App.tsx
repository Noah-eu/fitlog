import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import TodayPage from './pages/TodayPage'
import ExercisesPage from './pages/ExercisesPage'
import WorkoutHistoryPage from './pages/WorkoutHistoryPage'
import MyBodyPage from './pages/MyBodyPage'
import SettingsPage from './pages/SettingsPage'
import ExerciseDetailPage from './pages/ExerciseDetailPage'
import LoginPage from './pages/LoginPage'
import { RequireAuth } from './context/AuthContext'

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route index element={<TodayPage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route path="exercises/:id" element={<ExerciseDetailPage />} />
                <Route path="history" element={<WorkoutHistoryPage />} />
                <Route path="body" element={<MyBodyPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
