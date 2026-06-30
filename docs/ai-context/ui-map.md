# UI Map — FitLog

Primary screens and key components

- Today / Dashboard
 - Today / Dashboard
  - Header with `FitLog / Dnes` and short training/progress subtitle
  - Activity summary cards for unique training days in the last 7 and 30 days, last training day, and workout entry count in the last 7 days
  - `Dnes doporučeno` section backed by a stable per-day stored plan, with completion state and manual regeneration
  - `Moje rekordy` section showing computed top 5 highest recorded weights by exercise with reps, sets, and date
  - Compact latest body summary (body weight, waist, chest, date) when measurements exist
  - Real quick actions only: `Začít cvičit`, `Otevřít deník`, `Moje tělo`
  - Empty states for missing workouts or records

- Exercises
  - List grouped by `muscleGroup`
  - Main category tabs plus second-level subcategory chips with `Vše` fallback
  - Search and filter

- Exercise detail
  - Template info (description, muscle group)
  - Last used weight (pulled from `users/{userId}/exerciseStats`)
  - Quick-add to workout
  - Selected exercise progress chart for bodyweight used over time
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
  - `Tréninkový plán` section for full-body recommendation preferences with clear active/inactive category toggles
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
- `src/pages/MyBodyPage.tsx` supports adding, editing, and deleting body measurements. Logged-in users sync through Firestore; localStorage remains only as fallback/import source. Latest measurement summary is shown at the top, a metric-switchable progress chart appears in the `Vývoj` section, and history remains below (newest first).
- `src/pages/ExerciseDetailPage.tsx` includes a `Vývoj výkonu` chart for the selected exercise based on saved workout weight entries over time.
- `src/pages/TodayPage.tsx` also shows deterministic recommendations based on enabled categories, target exercise count, and recently used history.
- `src/pages/TodayPage.tsx` stores the chosen exercise IDs for the local day so logging a completed item does not reshuffle the rest of the plan.
