export type TrainingStyle = 'fullBody'

export type TrainingPreferences = {
    style: TrainingStyle
    enabledCategories: string[]
    enabledSubcategoriesByCategory?: Record<string, string[]>
    targetExerciseCount: number
    avoidRecentlyUsedDays: number
    updatedAt: string
}
