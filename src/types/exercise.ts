export type Exercise = {
    id: string
    name: string
    category: string
    subcategory?: string
    primaryMuscles: string[]
    secondaryMuscles?: string[]
    shortDescription?: string
    instructions?: string
    commonMistakes?: string[]
    imageUrl?: string
    recommendedReps?: string
    recommendedSets?: string
}
