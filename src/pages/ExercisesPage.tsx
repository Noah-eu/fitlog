import React, { useMemo, useState } from 'react'
import exercises from '../data/exercises'
import type { Exercise } from '../types/exercise'
import ExerciseCard from '../components/ExerciseCard'
import CategoryTabs from '../components/CategoryTabs'
import { useNavigate } from 'react-router-dom'

export default function ExercisesPage() {
    const navigate = useNavigate()
    const categories = useMemo(() => {
        const set = new Set<string>()
        exercises.forEach((e) => set.add(e.category))
        return Array.from(set)
    }, [])
    const [category, setCategory] = useState<string>(categories[0] ?? 'All')

    const list = useMemo(() => exercises.filter((e) => e.category === category), [category])

    function open(id: string) {
        navigate(`/exercises/${id}`)
    }

    return (
        <div className="page">
            <h1>Cvičení</h1>
            <CategoryTabs categories={categories} value={category} onChange={setCategory} />

            <section className="exercise-list">
                {list.map((ex: Exercise) => (
                    <ExerciseCard key={ex.id} exercise={ex} onOpen={open} />
                ))}
            </section>
        </div>
    )
}
