# UI Map — FitLog

Primary screens and key components

- Today / Dashboard
 - Today / Dashboard
  - Summary of today's recorded workout(s): shows latest workout entry (exercise name, date, weight, reps, sets, difficulty)
  - Latest body measurement summary (weight, waist, chest, date)
  - Count of workout entries in the last 7 days
  - Quick action buttons: `Cvičení`, `Deník`, `Moje tělo`
  - Empty-state message when no data present

- Exercises
  - List grouped by `muscleGroup`
  - Search and filter

- Exercise detail
  - Template info (description, muscle group)
  - Last used weight (pulled from `users/{userId}/exerciseStats`)
  - Quick-add to workout
  - Visible in-app `Zpět` button with safe fallback to `/exercises` when the detail route is opened directly

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
- Nested/detail navigation should prefer router history (`navigate(-1)`) with explicit fallbacks for direct opens.

My body details
- `src/pages/MyBodyPage.tsx` supports adding, editing, and deleting local body measurements. Latest measurement summary is shown at the top, history below (newest first).
