# Data Model — FitLog

Principles
- Personal data must be namespaced by `userId`.
- Exercise templates are separate, read-only for users (can be curated later).
- Keep records small and query-friendly for mobile devices.

Firestore schema (recommended)
- `exercises/{exerciseId}` (global templates)
  - id: string
  - name: string
  - muscleGroup: string
  - equipment?: string
  - description?: string

- `users/{userId}/workouts/{workoutId}`
  - id: string
  - date: timestamp
  - notes?: string
  - exercises: array of exercise instances
    - exerciseId: string
    - name: string (denormalized)
    - sets: array of {weight: number, reps: number, difficulty?: number, note?: string}

- `users/{userId}/measurements/{measurementId}`
  - id: string
  - date: timestamp
  - bodyWeight?: number
  - measurements?: map (waist, chest, arm, leg...)

- `users/{userId}/exerciseStats/{exerciseId}` (optional)
  - lastUsedWeight?: number
  - lastPerformed: timestamp

Notes
- Storing `exercises` as a global collection keeps templates separate from personal progress.
- Denormalize `name` on workout entries to keep history robust against template edits.
