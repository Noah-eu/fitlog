export type BodyMeasurement = {
    id: string
    date: string // ISO date
    bodyWeight?: number | null
    chest?: number | null
    waist?: number | null
    biceps?: number | null
    thighs?: number | null
    note?: string
    createdAt: string // ISO timestamp
    updatedAt?: string // ISO timestamp
}
