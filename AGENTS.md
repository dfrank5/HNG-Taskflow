# TaskFlow Agent Rules

## Architecture and modularity
- Keep domain types and task data handlers in `src/lib/tasks.ts`; UI components should not duplicate persistence or date logic.
- Keep the app entry point small and split reusable UI into focused components under `src/components/`.
- Use typed props and explicit boundaries between presentation, state, persistence, and import/export.
- Keep dependencies lightweight. Do not add accounts, remote APIs, analytics, or paid services.
- Persist user task data only in browser `localStorage`; keep backup files user initiated and local.

## Quality and accessibility
- Use semantic HTML, visible focus states, accessible names, keyboard-operable controls, and responsive layouts.
- Treat imported JSON and stored localStorage values as untrusted input. Validate and recover safely from malformed data.
- Confirm destructive task deletion and keep completed tasks out of overdue calculations.
- Prefer simple, readable code and avoid hidden side effects or unnecessary abstractions.

## Strict testing practices
- Add focused unit tests for each task data handler and localStorage parsing behavior.
- Test success paths, edge cases, and malformed input with deterministic fixtures.
- Run `npm test` and `npm run build` after implementation; resolve failures before reporting completion.
- Do not claim a check passed unless its command completed successfully.
