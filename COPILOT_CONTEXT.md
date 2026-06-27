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

How Copilot should operate
- Always read APP_PLAN.md and the listed docs before making changes.
- Do not scan the entire repository unless the documented paths are missing or insufficient.
- If a task requires files outside these paths, request permission before broad scanning.

Key rules to enforce in code and design
- Personal data must always be stored and queried with an explicit `userId` key.
- Prevent access to private progress data for logged-out users.
- Keep exercise templates separate from user workout entries.
- Constrain feature scope to the MVP list in APP_PLAN.md.

Notes for future sessions
- Use these docs to reconstruct context quickly.
- Add any newly created long-lived design docs to docs/ai-context and update this file.
