# UI Map — FitLog

Primary screens and key components

- Today / Dashboard
  - Summary of today's planned/recorded workout
  - Quick add workout entry button
  - Mini progress charts (weight, recent PRs)

- Exercises
  - List grouped by `muscleGroup`
  - Search and filter

- Exercise detail
  - Template info (description, muscle group)
  - Last used weight (pulled from `users/{userId}/exerciseStats`)
  - Quick-add to workout

- Workout entry
  - Form to capture date, exercise, sets (weight/reps/difficulty), notes
  - Show suggested last weight per exercise

- Workout history
  - Chronological list, tap to view/edit an entry

- My body
  - Log body weight and measurements
  - Trend charts

- Settings
  - Account and sync options

Design notes
- Mobile-first responsive layout; components designed for thumb reach and compact lists.
- Keep screens minimal and focused for quick logging.

Current pages (scaffolded)
- `src/pages/TodayPage.tsx` — Today / Dashboard
- `src/pages/ExercisesPage.tsx` — Exercises list
- `src/pages/WorkoutHistoryPage.tsx` — Workout history (Deník)
- `src/pages/MyBodyPage.tsx` — My body
- `src/pages/SettingsPage.tsx` — Settings

- `src/pages/ExerciseDetailPage.tsx` — Exercise detail (opened from `Cvičení`)

Navigation
- Top-level routing is in `src/App.tsx` and the mobile bottom nav is `src/components/BottomNav.tsx`.

My body details
- `src/pages/MyBodyPage.tsx` supports adding, editing, and deleting local body measurements. Latest measurement summary is shown at the top, history below (newest first).
