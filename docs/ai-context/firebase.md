# Firebase Notes — FitLog

Usage
- Authentication: Firebase Auth (email/password or single-provider for MVP).
 - Authentication: Firebase Auth (email/password or single-provider for MVP).
- Database: Cloud Firestore for structured user data.
- Hosting: optional static hosting (Firebase Hosting / Vercel / Netlify).

Recommended Firestore structure (see docs/ai-context/data-model.md)

Security rules (guiding points)
- All user-specific collections require `request.auth != null` and `request.auth.uid == userId` checks.
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
- No Firestore sync implemented yet; localStorage workout and body data remain unchanged.
