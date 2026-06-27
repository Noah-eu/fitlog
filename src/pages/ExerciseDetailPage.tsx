import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import exercises from '../data/exercises'

export default function ExerciseDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const ex = exercises.find((e) => e.id === id)

    if (!ex) {
        return (
            <div className="page">
                <h1>Nenalezeno</h1>
                <p>Cvičení nebylo nalezeno.</p>
                <button onClick={() => navigate('/exercises')}>Zpět</button>
            </div>
        )
    }

    return (
        <div className="page">
            <button className="back" onClick={() => navigate('/exercises')}>Zpět</button>
            <h1>{ex.name}</h1>
            <div className="exercise-detail">
                <div className="thumb large" />
                <div className="meta">
                    <div className="cat">{ex.category}</div>
                    <p><strong>Primární svaly:</strong> {ex.primaryMuscles.join(', ')}</p>
                    {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                        <p><strong>Sekundární svaly:</strong> {ex.secondaryMuscles.join(', ')}</p>
                    )}
                    <p><strong>Instrukce:</strong> {ex.instructions}</p>
                    <p><strong>Časté chyby:</strong> {ex.commonMistakes.join('; ')}</p>
                    <p><strong>Doporučené opakování:</strong> {ex.recommendedReps}</p>
                    <p><strong>Doporučené série:</strong> {ex.recommendedSets}</p>
                    <button disabled className="primary">Zapsat výkon</button>
                    <small>Bude přidáno v další fázi</small>
                </div>
            </div>
        </div>
    )
}
