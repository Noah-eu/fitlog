# Copilot Context for FitLog

Purpose
- Short, focused instructions for future Copilot sessions to reduce full-repo scanning and token usage.

Primary documents (read these first)
1. APP_PLAN.md
2. docs/ai-context/architecture.md
3. docs/ai-context/data-model.md
4. docs/ai-context/ui-map.md
5. docs/ai-context/firebase.md
6. docs/ai-context/validation.md

Local source map (read these next when editing UI or routing)
- src/main.tsx
- src/App.tsx
- src/components/AppShell.tsx
- src/components/BackButton.tsx
- src/components/BottomNav.tsx
- src/components/ProgressLineChart.tsx
- src/components/WorkoutCalendar.tsx
- src/pages/TodayPage.tsx
- src/pages/ExercisesPage.tsx
- src/pages/WorkoutHistoryPage.tsx
- src/pages/MyBodyPage.tsx
- src/pages/SettingsPage.tsx
- src/styles/global.css
 - src/types/workout.ts
 - src/services/workoutStorage.ts
 - src/services/trainingPreferencesStorage.ts
 - src/services/trainingRecommendations.ts
 - src/pages/ExerciseDetailPage.tsx
 - src/types/body.ts
 - src/types/trainingPreferences.ts
 - src/services/bodyMeasurementStorage.ts
 - src/pages/MyBodyPage.tsx

How Copilot should operate
- Always read APP_PLAN.md and the listed docs before making changes.
- Do not scan the entire repository unless the documented paths are missing or insufficient.
- If a task requires files outside these paths, request permission before broad scanning.

Quick rules for UI/Scaffold edits
- When changing the UI shell or routing, update this file and `docs/ai-context/*` to keep the source map accurate.
- Keep feature scope limited to the MVP in APP_PLAN.md; do not add Firebase, charts, auth, or AI in UI-only edits.
- `src/services/workoutStorage.ts` includes local day helpers used by the dashboard and workout calendar; prefer those helpers over ad-hoc date slicing when working with workout dates.
- Training preferences are stored separately from workout/body entries and should follow the same Firestore-or-local fallback pattern when extended.

Key rules to enforce in code and design
- Personal data must always be stored and queried with an explicit `userId` key.
- Prevent access to private progress data for logged-out users.
- Keep exercise templates separate from user workout entries.
- Constrain feature scope to the MVP list in APP_PLAN.md.

Notes for future sessions
- Use these docs to reconstruct context quickly.
- Add any newly created long-lived design docs to docs/ai-context and update this file.
