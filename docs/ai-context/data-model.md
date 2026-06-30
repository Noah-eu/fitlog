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
- subcategory?: string
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

Body measurement shape:
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

Body measurement storage
- Firestore path: `users/{userId}/bodyMeasurements/{measurementId}`
- Ownership: only the authenticated user may read or write measurements under their own `userId` path.
- Local fallback: body measurements may remain in browser localStorage only when Firebase Auth/Firestore is unavailable, or until the user manually imports local data into cloud storage.

Training preferences shape:
- style: 'fullBody'
- enabledCategories: string[]
- enabledSubcategoriesByCategory?: Record<string, string[]>
- targetExerciseCount: number
- avoidRecentlyUsedDays: number
- updatedAt: string (ISO timestamp)

Training preferences storage
- Firestore path: `users/{userId}/settings/trainingPreferences`
- Ownership: only the authenticated user may read or write preferences under their own `userId` path.
- Local fallback: training preferences may remain in browser localStorage only when Firebase Auth/Firestore is unavailable.

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

- `users/{userId}/bodyMeasurements/{measurementId}`
  - id: string
  - date: string (stored as ISO date-time)
  - bodyWeight?: number
  - chest?: number
  - waist?: number
  - biceps?: number
  - thighs?: number
  - note?: string
  - createdAt: string
  - updatedAt?: string

Notes
- Storing `exercises` as a global collection keeps templates separate from personal progress.
- Exercise templates may include an optional `subcategory` string for second-level filtering within each main exercise category.
- Workout entries stay separate from exercise templates and are always scoped by `userId`.
- Body measurements are personal records and are always scoped by `userId`.
- Training preferences stay separate from workout/body records and are stored as a single user-scoped settings document.
