# Validation Checklist — FitLog

Purpose
- Quick checks to ensure planning docs are consistent and implementation starts with correct constraints.

Checklist
- [ ] APP_PLAN.md exists and lists MVP features (login, dashboard, exercises, workout entry, history, body measurements, charts).
- [ ] COPILOT_CONTEXT.md instructs Copilot to read APP_PLAN.md and docs/ai-context first.
- [ ] Data model documents bind personal data to `userId` and separate exercise templates.
- [ ] Firebase notes include security rule guidance to prevent unauthorized access.
- [ ] UI map matches MVP screens and remains mobile-first.
- [ ] No implementation or scaffolding performed in docs phase.

Verification steps after implementation starts
- Run unit tests and Firestore emulator tests for rules.
- Confirm that logged-out access is blocked for user-specific paths.
