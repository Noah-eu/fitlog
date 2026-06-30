import React from 'react'
import type { Exercise } from '../types/exercise'

type Props = {
    exercise: Exercise
    onOpen: (id: string) => void
    excluded?: boolean
}

export default function ExerciseCard({ exercise, onOpen, excluded = false }: Props) {
    const metaLabel = exercise.subcategory ? `${exercise.category} • ${exercise.subcategory}` : exercise.category

    return (
        <article className="exercise-card" onClick={() => onOpen(exercise.id)}>
            {excluded ? (
                <div className="excluded-badge">Nezařazeno do tréninků</div>
            ) : null}
            <div className="thumb" aria-hidden={exercise.imageUrl ? false : true}>
                {exercise.imageUrl ? (
                    <img src={exercise.imageUrl} alt={exercise.name} />
                ) : null}
            </div>
            <div className="meta">
                <div className="name">{exercise.name}</div>
                <div className="cat">{metaLabel}</div>
                <div className="desc">{exercise.shortDescription}</div>
            </div>
        </article>
    )
}
