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

Suggested exercise template fields (frontend/local exercise shape)
- id: string
- name: string
- category: string
- primaryMuscles: string[]
- secondaryMuscles?: string[]
- shortDescription?: string
- instructions?: string
- commonMistakes?: string[]
- imageUrl?: string
- recommendedReps?: string
- recommendedSets?: string

Workout entry shape:
- id: string
- exerciseId: string
- date: string (ISO date)
- weight?: number
- reps?: number
- sets?: number
- difficulty?: 'lehké' | 'akorát' | 'těžké'
- note?: string
- createdAt: string (ISO timestamp)
- updatedAt?: string (ISO timestamp)

Workout entry storage
- Firestore path: `users/{userId}/workoutEntries/{entryId}`
- Ownership: only the authenticated user may read or write entries under their own `userId` path.
- Local fallback: workout entries may remain in browser localStorage only when Firebase Auth/Firestore is unavailable, or until the user manually imports local data into cloud storage.

Local body measurement shape (stored in browser/local storage for MVP):
- id: string
- date: string (ISO date)
- bodyWeight?: number
- chest?: number
- waist?: number
- biceps?: number
- thighs?: number
- note?: string
- createdAt: string (ISO timestamp)
- updatedAt?: string (ISO timestamp)

- `users/{userId}/workoutEntries/{entryId}`
  - id: string
  - exerciseId: string
  - date: string (stored as ISO date-time for stable day keys)
  - weight?: number
  - reps?: number
  - sets?: number
  - difficulty?: 'lehké' | 'akorát' | 'těžké'
  - note?: string
  - createdAt: string
  - updatedAt?: string

- `users/{userId}/measurements/{measurementId}`
  - id: string
  - date: timestamp
  - bodyWeight?: number
  - measurements?: map (waist, chest, arm, leg...)

Notes
- Storing `exercises` as a global collection keeps templates separate from personal progress.
- Workout entries stay separate from exercise templates and are always scoped by `userId`.
