import React from 'react'
import type { Exercise } from '../types/exercise'

type Props = {
    exercise: Exercise
    onOpen: (id: string) => void
}

export default function ExerciseCard({ exercise, onOpen }: Props) {
    return (
        <article className="exercise-card" onClick={() => onOpen(exercise.id)}>
            <div className="thumb" aria-hidden={exercise.imageUrl ? false : true}>
                {exercise.imageUrl ? (
                    <img src={exercise.imageUrl} alt={exercise.name} />
                ) : null}
            </div>
            <div className="meta">
                <div className="name">{exercise.name}</div>
                <div className="cat">{exercise.category}</div>
                <div className="desc">{exercise.shortDescription}</div>
            </div>
        </article>
    )
}
