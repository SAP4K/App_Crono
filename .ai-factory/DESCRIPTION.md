# CRONO Project Description

## Purpose

CRONO is a local stopwatch and countdown app for iOS and Android, with a web preview. Its interface is Romanian. Users can time an activity, record laps, save sessions, review history, and share results without an account or an application backend.

## Implemented Features

- Start, pause, resume, and reset a stopwatch; resetting requires confirmation.
- Display centiseconds and show hours for long sessions.
- Record lap splits and cumulative times, highlight the fastest laps, and calculate average lap duration.
- Save paused sessions and retain the latest 50 sessions, with up to 1,000 laps per session.
- View session details, share results, and delete sessions with confirmation.
- Run a separate countdown (one second to 23:59:59, five-minute default) alongside the stopwatch, with pause/resume, reset confirmation, restart, and visible completion across tabs/sheets.
- Play an original bundled completion sound in the foreground; show overdue completion silently on return/relaunch.
- Restore active timing state, countdown, laps, history, and preferences from local storage.
- Save manual light/dark selection (light default), completion sound, mobile haptic feedback, and screen wake lock preferences independently.
- Adapt the interface to compact screens, safe areas, and a constrained desktop preview width.

## Technology Stack

Versions below describe the current package manifest, not a requirement to upgrade dependencies.

| Area | Implementation |
|---|---|
| Language | TypeScript with strict checking |
| Framework | Expo SDK 57 (`expo ~57.0.31`), React Native `0.86.3` |
| UI runtime | React `19.2.3`; React Native Web for browser previews |
| Navigation | Expo Router, entry point `expo-router/entry` |
| Shared state | React Context and custom hooks |
| Persistence | AsyncStorage `2.2.0`, JSON schema version 1 |
| Device behavior | Expo Haptics, KeepAwake, SystemUI, StatusBar, and SplashScreen |
| Completion audio | SDK-compatible `expo-audio ~57.0.5` on native, `expo-asset ~57.0.20` and an observed HTML media play promise on web; bundled PCM WAV |
| Visuals | React Native StyleSheet, react-native-svg, bundled Inter fonts |
| Core tests | Node.js test runner and strict assertions |
| Browser tests | Playwright using locally installed Google Chrome |
| Builds | EAS profiles in `eas.json` |
| Package manager | npm, with `package-lock.json` |

## Architecture

Pattern: **Layered Architecture adapted to a mobile application**, with shared pure stopwatch/countdown cores.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the actual folder structure, dependency boundaries, data flow, and TypeScript examples. The app currently has one small functional domain; additional service, repository, or feature-module layers are not required for routine changes.

## Main Entry Points

| Path | Responsibility |
|---|---|
| `src/app/_layout.tsx` | Fonts, safe areas, shared/theme providers, startup gate, three-tab shell, settings, and notices |
| `src/app/index.tsx` | Stopwatch screen and user actions |
| `src/app/timer.tsx` | Countdown duration editor and controls |
| `src/app/history.tsx` | Session history, details, sharing, and deletion |
| `src/core/stopwatch.ts` | Types, immutable timing operations, limits, formatting, statistics, and stored-data validation |
| `src/core/timer.ts` | Pure countdown transitions, bounds, restoration, parsing, and ceiling-based display |
| `src/hooks/useStopwatch.ts` | Hydration, shared data updates, serialized writes, and app-state persistence |
| `src/context/CronoContext.tsx` | Shared state, global timer/audio owner, notices, haptics, and one screen wake guard |
| `src/context/ThemeContext.tsx` | Saved theme projection, navigation palette, native appearance and root background |
| `src/hooks/timerCompletion.ts` | Injectable completion coordinator with current-state guards and cancellation |
| `src/hooks/useTimerCompletion.ts` | Readiness and foreground lifecycle adapter for the coordinator |
| `src/hooks/useTimerSound.ts`, `.web.ts` | Managed native playback and browser autoplay-error handling |
| `src/components/StopwatchFace.tsx` | Local display refresh and stopwatch dial |
| `src/components/TimerFace.tsx`, `TimerCompletionNotice.tsx` | Local countdown display and completion feedback in shell/sheets |
| `src/theme.ts` | Pure semantic light/dark palettes and font-family names |

## Data and Persistence

The `AppData` object contains:

- `version: 1` to identify the persisted schema.
- `stopwatch`: accumulated milliseconds, an optional start timestamp, and recorded laps.
- `timer`: status, configured duration, remaining snapshot, optional deadline, and run identity.
- `sessions`: saved session identifiers, save timestamps, total durations, and laps.
- `preferences`: `haptics`, `keepAwake`, and `timerSound` booleans, plus `theme: 'light' | 'dark'`.

The hook stores the entire object as JSON under `@crono/app-v1`. Actions go through `update(action)`, which applies a functional transformation and queues a write. Its synchronous `{ changed, data }` result confirms in-memory acceptance, not durable storage; stable `getSnapshot()` reads the current accepted state. Additional writes are requested when the app leaves the active state. Display refreshes do not persist a new snapshot on every frame.

`restoreData` validates unknown JSON and filters invalid stored records. Unsupported versions and malformed input fall back to initial data. This fallback is existing behavior, not a migration strategy for future schema changes.

Optional timer/preferences additions retain version 1 and the storage key. Missing or invalid theme defaults to light; missing or invalid timer defaults to an idle five-minute countdown; sound defaults on. These fields restore independently while preserving valid stopwatch/history data and existing false boolean preferences. Valid overdue running timers remain running until the global coordinator reconciles them.

Time is derived from `Date.now()` timestamps and accumulated paused time. Background time counts on return. Manual changes to the device clock can affect measurements; this app does not provide a metrological accuracy guarantee.

## Platform Behavior

- Android and iOS are the primary platforms; web provides a preview and browser test target.
- Haptics and screen wake lock are enabled only on mobile and respect saved preferences.
- One wake guard covers either running clock. Theme and sound controls also work on web; manual appearance overrides the OS setting. The interactive shell waits for storage/fonts; the static native splash cannot read the saved preference before JavaScript.
- Completion effects belong to the provider, independent of the active route. Each accepted foreground completion has at most one audio attempt per live run. Mute/reset/restart/lifecycle cleanup invalidate pending work; completed hydration never replays audio. No background notifications or recording permissions are configured.
- Native sound respects silent mode and mixes with existing audio. Browser autoplay rejection produces visible feedback; the web adapter observes `HTMLMediaElement.play()` because SDK 57's web player does not observe that promise.
- Mobile sharing uses React Native Share. Web uses native browser sharing when available, otherwise the clipboard.
- Application data remains on the device or in browser storage. Uninstalling the app or clearing browser data removes it.
- Native projects are generated through Expo Continuous Native Generation. The repository has no checked-in `ios/` or `android/` directories.

## Development and Verification

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run web` | Start the web preview |
| `npm run lint` | Run Expo ESLint checks |
| `npm run typecheck` | Run TypeScript without emitting output |
| `npm test` | Run core logic tests; requires Node.js 24 LTS or later |
| `npm run test:e2e` | Run browser scenarios; starts or reuses port 8091 |
| `npm run export` | Export JavaScript/assets for all platforms |
| `npx expo-doctor` | Diagnose Expo dependency and configuration issues |

Feature checks on 2026-11-05: 31 Node tests, 20 Playwright scenarios against the web export, lint/typecheck, Android/iOS/web export, dependency compatibility, and 21 Expo Doctor checks pass. Native config introspection contains no microphone/recording permission or background audio mode. Phone sound/appearance/wake-lock behavior and signed builds remain unverified.

Install app dependencies through `npx expo install <package>` to resolve SDK-compatible versions. Follow [AGENTS.md](../AGENTS.md) for versioned documentation requirements and EAS commands. Browser tests and successful exports do not establish physical-device behavior or signed-build readiness.

## Known Follow-up Work

These findings were identified during the repository review on November 4, 2026. Context setup does not resolve them:

1. A failed initial storage read leaves the hook ready with initial data. A subsequent action can overwrite previously stored history. This was reproduced with a simulated browser storage read failure.
2. The permitted maximum history can produce a single JSON entry larger than Android AsyncStorage's [documented per-entry read limit](https://react-native-async-storage.github.io/2.0/advanced/Limits/). A generated valid 50-session history with 1,000 laps per session was approximately 2.33 MiB. Physical-device reproduction is still needed.
3. Dependency audit alerts require triage before release; no CI workflow or signed APK/IPA build verification is present.
4. Lap lists currently render all recorded rows without virtualization.

Plan fixes separately and verify the relevant behavior before changing storage formats or release assumptions.

## AI Factory Context

- Configuration: `config.yaml`.
- Architecture: `ARCHITECTURE.md`.
- Base conventions: `rules/base.md`.
- Repository map and Expo requirements: `../AGENTS.md`.
- Installed workflow skills: `../.agents/skills/` (33 existing AI Factory skills).
- Communication and generated artifact languages: English, as configured.
- Git base branch: `master`; new full/ultra plans may create branches using `feature/`.
- Active full plan: `plans/feature-dark-mode-preference.md`; no roadmap or research artifact is present.

The connected GitHub app is available in the current agent session. No repository-level MCP server configuration is present. Reuse host-provided integrations when available; additional servers should address a concrete project need.
