import React, { useMemo, useState, useEffect } from 'react'
import exercises from '../data/exercises'
import type { Exercise } from '../types/exercise'
import ExerciseCard from '../components/ExerciseCard'
import CategoryTabs from '../components/CategoryTabs'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'

const ALL_SUBCATEGORY = 'Vše'

const SUBCATEGORY_ORDER: Record<string, string[]> = {
    Prsa: ['Tlaky', 'Izolace', 'Kliky / dipy', 'Pullover'],
    Záda: ['Vertikální tahy', 'Horizontální tahy', 'Spodní záda', 'Mrtvé tahy'],
    Ruce: ['Biceps', 'Triceps', 'Předloktí'],
    Ramena: ['Tlaky', 'Boční / přední delty', 'Zadní delty', 'Trapézy'],
    Nohy: ['Kvadricepsy', 'Hamstringy', 'Lýtka', 'Jednonožní', 'Tahy', 'Addukce / abdukce'],
    Zadek: ['Hip thrust / bridge', 'Abdukce', 'Zanožování', 'Dřepy / tahy'],
    Břicho: ['Stabilizace', 'Flexe', 'Rotace', 'Vis / kolečko'],
    Kardio: ['Chůze / běh', 'Stroje', 'Kondice'],
    Mobilita: ['Záda / páteř', 'Kyčle / nohy', 'Ramena / hrudník'],
}

export default function ExercisesPage() {
    const navigate = useNavigate()
    const categories = useMemo(() => {
        const set = new Set<string>()
        exercises.forEach((e) => set.add(e.category))
        return Array.from(set)
    }, [])
    const [searchParams, setSearchParams] = useSearchParams()
    const location = useLocation()

    const defaultCategory = categories[0] ?? 'All'
    const paramCategory = searchParams.get('category')
    const paramSubcategory = searchParams.get('subcategory')

    const [category, setCategory] = useState<string>(paramCategory && categories.includes(paramCategory) ? paramCategory : defaultCategory)
    const [subcategory, setSubcategory] = useState<string>(paramSubcategory ?? ALL_SUBCATEGORY)

    const categoryExercises = useMemo(
        () => exercises.filter((exercise) => exercise.category === category),
        [category],
    )

    const subcategories = useMemo(() => {
        const available = Array.from(new Set(categoryExercises.map((exercise) => exercise.subcategory).filter(Boolean))) as string[]
        const preferredOrder = SUBCATEGORY_ORDER[category] ?? []
        const ordered = [
            ...preferredOrder.filter((item) => available.includes(item)),
            ...available.filter((item) => !preferredOrder.includes(item)),
        ]

        return [ALL_SUBCATEGORY, ...ordered]
    }, [category, categoryExercises])

    const list = useMemo(() => {
        if (subcategory === ALL_SUBCATEGORY) return categoryExercises
        return categoryExercises.filter((exercise) => exercise.subcategory === subcategory)
    }, [categoryExercises, subcategory])

    function handleCategoryChange(nextCategory: string) {
        setCategory(nextCategory)
        setSubcategory(ALL_SUBCATEGORY)
    }

    function open(id: string) {
        // preserve current search params so back navigation restores filters
        navigate(`/exercises/${id}${location.search}`)
    }

    // sync state -> url (push history so back restores previous filter state)
    useEffect(() => {
        const params: Record<string, string> = {}
        if (category) params.category = category
        if (subcategory && subcategory !== ALL_SUBCATEGORY) params.subcategory = subcategory
        setSearchParams(params)
    }, [category, subcategory, setSearchParams])

    return (
        <div className="page">
            <h1>Cvičení</h1>
            <CategoryTabs categories={categories} value={category} onChange={handleCategoryChange} />
            <CategoryTabs categories={subcategories} value={subcategory} onChange={setSubcategory} className="subcategory-tabs" />

            <section className="exercise-list">
                {list.map((ex: Exercise) => (
                    <ExerciseCard key={ex.id} exercise={ex} onOpen={open} />
                ))}
            </section>
        </div>
    )
}
