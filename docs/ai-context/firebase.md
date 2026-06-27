# Firebase Notes — FitLog

Usage
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
