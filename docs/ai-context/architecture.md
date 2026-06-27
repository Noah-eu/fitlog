# Architecture Overview — FitLog

High level
- Mobile-first single-page web app built with React + Vite + TypeScript.
- Client-first UI with Firebase as the primary backend (Auth + Firestore + optional Storage).

Responsibilities
- Client: UI, local validation, charts, offline-friendly reads, minimal business logic.
- Backend (Firebase): authentication, persistent storage, simple server-side rules for data access.

Deployment
- Static site hosting (Vercel / Netlify / Firebase Hosting) serving the built React app.
- Firestore as primary database; use Firebase Authentication for single-user sign-in.

Security & constraints
- Enforce Firestore security rules tying data to `userId`.
- Avoid sharing private progress data publicly.

Extensibility
- Keep architecture modular: separate `exercises` (global templates) from `user` namespaces.
