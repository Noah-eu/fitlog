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
