# Firebase Notes — FitLog

Usage
- Authentication: Firebase Auth (email/password or single-provider for MVP).
- Database: Cloud Firestore for structured user data.
- Workout entries are stored in Cloud Firestore under `users/{userId}/workoutEntries/{entryId}`.
- Body measurements are stored in Cloud Firestore under `users/{userId}/bodyMeasurements/{measurementId}`.
- Training preferences are stored in Cloud Firestore under `users/{userId}/settings/trainingPreferences`.
- Firebase Storage is not used for workout records.
- Hosting: optional static hosting (Firebase Hosting / Vercel / Netlify).

Recommended Firestore structure (see docs/ai-context/data-model.md)

Security rules (guiding points)
- All user-specific collections require `request.auth != null` and `request.auth.uid == userId` checks.
- Workout entry access is limited to `users/{userId}/workoutEntries/{entryId}` for the authenticated owner only.
- Body measurement access is limited to `users/{userId}/bodyMeasurements/{measurementId}` for the authenticated owner only.
- Training preferences access is limited to `users/{userId}/settings/{settingId}` for the authenticated owner only.
- Exercises collection can be publicly readable but write-restricted to admins.
- Prevent queries that expose other users' documents.

Local development
- Use the Firebase Emulator Suite for emulating Auth and Firestore when developing.

Config
- Store Firebase config and keys in environment variables or CI secrets; do not commit secrets.

Local auth foundation

- The codebase includes a minimal Firebase Auth foundation (modular SDK): `src/firebase/config.ts`, `src/services/authService.ts`, and `src/context/AuthContext.tsx`.
- `LoginPage` at `/login` provides email/password sign-in; protected routes redirect to login when signed out.
- Missing or placeholder `VITE_FIREBASE_*` values should not crash the app; instead, auth surfaces a setup screen that points to `.env.local` and Netlify Environment variables.
- Workout entries sync through `src/services/workoutStorage.ts`, which uses Firestore for logged-in users and falls back to localStorage only when Firebase Auth/Firestore is unavailable.
- Body measurements sync through `src/services/bodyMeasurementStorage.ts`, which uses Firestore for logged-in users and falls back to localStorage only when Firebase Auth/Firestore is unavailable.
- Training preferences sync through `src/services/trainingPreferencesStorage.ts`, which uses Firestore for logged-in users and falls back to localStorage only when Firebase Auth/Firestore is unavailable.
