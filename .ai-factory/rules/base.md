# CRONO Base Rules

These conventions are based on the existing code and repository instructions. Read [../../AGENTS.md](../../AGENTS.md) for the authoritative Expo workflow and [../ARCHITECTURE.md](../ARCHITECTURE.md) for dependency boundaries.

## Naming and Types

- Use TypeScript and preserve strict compiler checking.
- Name React component files and components in PascalCase, hooks with a `use` prefix, and other functions and variables in camelCase.
- Use uppercase snake case for shared limits such as `MAX_SESSIONS` and `MAX_LAPS`.
- Keep stored-data types and stopwatch transformations in `src/core/stopwatch.ts` unless a concrete change justifies splitting that module.
- Narrow unknown persisted values with explicit validation rather than assertions that bypass schema checks.

## Module Boundaries

- Keep route and navigator files in `src/app/`; place reusable components, hooks, state, and utilities outside that directory.
- Keep `src/core/` independent of React, React Native, Expo, storage, and presentation modules.
- Own local persistence in `src/hooks/`; screens and components change shared state through the context's functional `update` API.
- Keep haptics, screen wake lock, and shared notices in `CronoContext`; keep platform-specific behavior behind explicit platform checks.
- Use relative imports, shared theme tokens, and the existing Expo Router navigation conventions.
- Preserve the established small-module structure when changing a feature.

## State and Timing

- Return new state objects for effective changes; preserve the original reference for no-op domain operations where practical.
- Calculate elapsed time from timestamps and accumulated duration. Use intervals only to refresh the display.
- Preserve injected `now` arguments in core operations so tests remain deterministic.
- Keep high-frequency display state local to `StopwatchFace`.
- Retain bounded history and lap counts unless a requirement explicitly changes them.
- Keep persisted schema changes versioned and define how existing user data will be preserved.

## Errors and Control Flow

- Prefer guard clauses, early returns, and small named helpers when they keep the main path clear.
- Preserve cleanup for timers and app-state subscriptions, and guard asynchronous state updates after unmount.
- Keep persistence writes ordered so an older write cannot replace a later action.
- Surface recoverable storage failures through the existing warning/notice mechanism.
- Treat the initial storage-read failure and oversized storage entry findings in `DESCRIPTION.md` as unresolved follow-up work; they are not established safe fallback patterns.
- The app has no logging framework. Keep routine rendering free of console noise and avoid logging stored session payloads or credentials.

## Mobile UI

- Keep interface copy in Romanian unless localization is explicitly requested.
- Reuse colors and fonts from `src/theme.ts` and existing reusable components.
- Respect safe areas, compact screen sizes, readable text, and accessible labels and roles on interactive controls.
- Preserve confirmation flows for reset and session deletion.
- Consider list virtualization when changing behavior near the supported lap limit.

## Expo and Dependencies

- Before changing Expo, EAS, or React Native API usage, read the installed Expo major version and its matching documentation, as required by `AGENTS.md`.
- Use `npx expo install <package>` for app dependency changes. This repository currently uses npm; use `bunx` if it later adopts a `bun.lock`.
- Configure native behavior in app configuration and config plugins. Keep generated native directories out of version control.
- Check native-module availability in the chosen runtime and use a development build when required by the added module.

## Validation

- Run `npm run lint` and `npm run typecheck` before declaring a task complete.
- Run `npm test` for changes to stopwatch calculations, saved-data validation, or session transformations.
- Run the relevant browser scenarios for changes to screens, sharing, settings, or session interactions. Playwright currently requires locally installed Google Chrome.
- When fixing a defect that needs regression coverage, reproduce it before the fix and rerun the same check afterward.
- Use native/device validation for mobile-only behavior. A browser test or bundle export does not prove a signed native build works.

## Git and Generated Files

- Use `master` as the configured base branch. Respect existing work on the current branch.
- Keep `package-lock.json`, app source, tests, and shared AI Factory context under version control.
- Honor `.gitignore` for environment files, signing credentials, generated builds, screenshots, caches, and test output.
- Preserve unrelated local edits while preparing a scoped change.
