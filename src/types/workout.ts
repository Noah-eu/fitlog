export type Difficulty = 'lehké' | 'akorát' | 'těžké'

export type WorkoutEntry = {
    id: string
    exerciseId: string
    date: string // ISO date string
    weight?: number
    reps?: number
    sets?: number
    difficulty?: Difficulty
    note?: string
    createdAt: string // ISO timestamp
    updatedAt?: string // ISO timestamp
}
