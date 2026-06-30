export type TrainingDayPlanSource = 'auto' | 'manual'
export type TrainingDayPlanVariant = 'A' | 'B' | 'C'

export type TrainingDayPlan = {
    dateKey: string
    exerciseIds: string[]
    variant: TrainingDayPlanVariant
    generatedAt: string
    source: TrainingDayPlanSource
    preferencesSnapshot?: {
        enabledCategories: string[]
        targetExerciseCount: number
        avoidRecentlyUsedDays: number
    }
}
