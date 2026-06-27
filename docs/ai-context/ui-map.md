# UI Map — FitLog

Primary screens and key components

- Today / Dashboard
 - Today / Dashboard
  - `Moje výkony` overview for every exercise with saved workout data
  - Latest performance per exercise (weight, reps, sets, difficulty, date)
  - Optional best/heaviest recorded weight per exercise
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
  - Monthly calendar with highlighted workout days
  - Selected-day list of entries below the calendar
  - Edit/delete support from the selected-day list

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
- `src/pages/MyBodyPage.tsx` supports adding, editing, and deleting body measurements. Logged-in users sync through Firestore; localStorage remains only as fallback/import source. Latest measurement summary is shown at the top, history below (newest first).
