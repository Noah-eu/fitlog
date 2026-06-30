export type TrainingDayPlanSource = 'auto' | 'manual'

export type TrainingDayPlan = {
    dateKey: string
    exerciseIds: string[]
    generatedAt: string
    source: TrainingDayPlanSource
    preferencesSnapshot?: {
        enabledCategories: string[]
        targetExerciseCount: number
        avoidRecentlyUsedDays: number
    }
}
