# FitLog — App Plan

Summary
- FitLog is a mobile-first personal fitness progress web app for David.
- Target stack: React + Vite + TypeScript (client-side), Firebase for auth and storage (prototype plan).
- First release (MVP) is single-user (authenticated) and mobile-first.

Scope (MVP)
- Login (authenticated single user)
- Dashboard (Today)
- Exercise library (grouped by muscle)
- Exercise detail (show last used weight)
- Workout entry (weight, reps, sets, difficulty, note)
- Workout history
- Body weight & body measurements logging
- Simple progress charts
- User-specific data storage

Main screens
- Today / Dashboard
- Exercises
- Exercise detail
- Workout entry
- Workout history
- My body
- Settings

Constraints & rules
- Personal data must always be tied to `userId`.
- Logged-out users must not access private progress data.
- Exercise templates remain separate from user workout progress.
- Keep MVP small: no AI trainer, diet tracking, community, payments, public sharing, or videos.
- Do not implement code or scaffold the app from this document alone.

Milestones
1. Planning docs (this file + ai-context docs)
2. Minimal Firebase schema & rules
3. UI prototypes (mobile-first)
4. Implement auth + data model
5. Implement screens and sync

Validation (initial)
- Files and docs present and consistent.
- All personal data paths are clearly namespaced under `userId` in docs.
- MVP feature list is adhered to during implementation.
