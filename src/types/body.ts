export type BodyMeasurement = {
  id: string
  date: string // ISO date
  bodyWeight?: number
  chest?: number
  waist?: number
  biceps?: number
  thighs?: number
  note?: string
  createdAt: string // ISO timestamp
  updatedAt?: string // ISO timestamp
}
