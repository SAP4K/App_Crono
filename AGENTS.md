This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project Overview

CRONO is a Romanian/English/Russian/Spanish/French/German stopwatch, countdown, and action schedule app for iOS and Android with a web preview. Read `.ai-factory/DESCRIPTION.md` for the verified stack, implemented behavior, persistence contract, and open technical findings.

The app uses technical layers with shared pure stopwatch/countdown/schedule cores, one effective audio owner, and a separate OS notification coordinator. Rebuilt Android binaries use the native completion broker for foreground/background audio; iOS/web retain foreground loops. Read `.ai-factory/ARCHITECTURE.md` and `.ai-factory/rules/base.md` before implementation.

## Project Structure

```text
src/
  app/          Expo Router routes and application shell
  components/   Dials, native/web duration wheels, schedule editor/run card, notices, sheets
  context/      Shared state, saved theme, interaction motion, notices, and mobile feedback
  hooks/        Persistence, timing/playback owners, OS notifications, native/web adapters
  core/         Pure timing/schedule operations, notification projection, registries, validation
  i18n/         Typed catalogs, plural/date formatting, and localized sharing
  audio/        Bundled playback sources and native notification sound names
  theme.ts      Semantic light/dark palettes and font-family constants
tests/
  language.test.ts      Language defaults, validation, and legacy preservation
  i18n.test.ts          Catalog parity, plurals, locale dates, and shared results
  stopwatch.test.ts     Node.js core logic tests
  timer.test.ts         Countdown boundary/transition tests
  durationPicker.test.ts Bounded parts, conversion and snapping geometry
  durationWheel.test.ts Settling, cancellation, disabled state and changed row geometry
  wheelPresentation.test.ts Visual preset targets, takeover, lifecycle and stale callbacks
  wheelDeceleration.test.ts Progressive easing, delta units, reversal and finite cancellation/deadlines
  timerCompletion.test.ts Completion/audio coordination tests
  theme.test.ts         Preference resolution and palette contrast checks
  themeAppearance.test.ts Appearance lifecycle, cached snapshots and native background ordering
  motionPreference.test.ts Live reduced-motion queries, event races and foreground cleanup
  pressMotion.test.ts Press cancellation, disabled/inactive state and stale animation callbacks
  transitionMotion.test.ts Sheet/panel readiness, supersession, lifecycle and driver failure fallback
  sounds.test.ts        Sound preferences and real PCM asset validation
  planning.test.ts      Schedule CRUD, restoration, and execution transitions
  planningTools.test.ts Template, duplicate and bounded repeated-sequence operations
  backup.test.ts        Strict portable records, limits and additive imports
  backupTransfer.test.ts Transfer cancellation, hydration and latest-state confirmation
  alertPlayback.test.ts Duration, priority, cancellation, and stale callback tests
  completionAlerts.test.ts Shared request/policy, priority and minute boundaries
  nativeAlertPlayback.test.ts Native facade, detached lifecycle and bridge races
  completionNotificationAdapter.test.ts Composed native/ordinary reconciliation
  planningRunner.test.ts Global planning lifecycle and boundary coordination
  notifications.test.ts Future projection, payloads, content, permissions, web fallback
  notificationCoordinator.test.ts Native reconciliation, failures, hydration and races
  notificationReadiness.test.ts Access, channel, permission and registration policy
  notificationRuntime.test.ts Embedded release/development clients versus Expo Go
  notificationPresentation.test.ts Activity handoff and sound presentation
  notificationTrigger.test.ts iOS rounding and elapsed-deadline rejection
  notificationResponses.test.ts Buffered, validated and deduplicated tap navigation
  fixtures/             Literal legacy version-1 saved data
  e2e/                  Timing, themes, languages, sound, planning, notifications, real wheel gestures
modules/                Android access probe and completion alarm/audio Expo modules
assets/                 App icons, splash images, original WAV patterns and legacy Classic copy
assets/audio/notifications/ Four generated 15-second system notification clips
scripts/                Reproducible notification sound generator
.agents/skills/         Installed AI Factory workflows
.ai-factory/            Project context and workflow configuration
```

## Key Entry Points

| File | Purpose |
|---|---|
| `src/app/_layout.tsx` | Fonts, providers, navigation shell, settings, and notices |
| `src/app/index.tsx` | Stopwatch route and user actions |
| `src/app/timer.tsx` | Compact setup, presets and active countdown controls |
| `src/app/planning.tsx` | Saved schedules, date filter, editor, and confirmed run replacement |
| `src/app/history.tsx` | History, details, sharing, and deletion |
| `src/core/stopwatch.ts` | Types, transitions, limits, validation, and formatting |
| `src/core/timer.ts` | Pure countdown transitions, validation, and formatting |
| `src/core/durationPicker.ts` | Numeric duration parts, finite bounds, conversion and snap index |
| `src/components/DurationPicker.tsx`, `DurationWheel.tsx`, `.web.tsx` | Shared themed picker, native adjustable columns and web spinbuttons |
| `src/hooks/durationWheel.ts`, `useDurationWheel.ts` | Manual settling/cancellation and explicit preset-presentation lifecycle bridge |
| `src/hooks/wheelPresentation.ts` | Finite visual wheel targets, takeover/settlement and stale callbacks; no selection/busy ownership |
| `src/hooks/wheelDeceleration.ts` | Bounded browser wheel easing and unit normalization; visual offsets only, manual controller retains selection/busy |
| `src/core/planning.ts` | Schedule bounds, CRUD, snapshot restoration, and cumulative deadlines |
| `src/core/planningTools.ts` | Pure templates, independent copies and bounded repeated steps |
| `src/core/backup.ts` | Strict portable projection/parser and additive fresh-ID merge |
| `src/core/planningCalendar.ts` | Civil date validation, weekday normalization, and matching saved rules |
| `src/core/sounds.ts`, `src/audio/sources.ts` | Pure sound preferences and separate asset map |
| `src/hooks/useStopwatch.ts` | Hydration outcome, accepted-update subscriptions, functional updates, ordered writes |
| `src/context/CronoContext.tsx` | Shared state, timer/planning runners, one audio owner, haptics, wake lock |
| `src/context/ThemeContext.tsx` | Saved theme, navigation palette, native appearance |
| `src/context/MotionContext.tsx`, `src/hooks/motionPreference.ts` | Shared live reduced-motion/activity policy and covered-surface scopes |
| `src/components/MotionPressable.tsx`, `src/hooks/pressMotion.ts`, `usePressMotion.ts` | Ref-safe button feedback; finite cancellable visual transitions |
| `src/components/NavigationScene.tsx`, `.web.tsx` | Focused input/accessibility gates around navigator slides |
| `src/hooks/transitionMotion.ts`, `useSheetMotion.ts`, `src/components/PanelTransition.tsx` | Finite visual controllers, sheet presence and incoming panels |
| `src/hooks/useSheetPresentation.ts` | Bounded token-guarded display payloads through visual exits |
| `src/core/themePreference.ts`, `src/hooks/themeAppearance.ts`, `useSystemTheme.ts` | Saved System/Light/Dark, resolved palettes and live/foreground appearance |
| `src/hooks/timerCompletion.ts` | Injectable completion coordinator and fresh-state audio guards |
| `src/hooks/useTimerCompletion.ts` | Readiness and foreground lifecycle bridge |
| `src/hooks/planningRunner.ts`, `usePlanningRunner.ts` | Global schedule execution, accepted updates, and silent catch-up |
| `src/hooks/alertPlayback.ts`, `useAlertPlayback.ts` | Shared duration limits, priority, previews, and event-scoped failures |
| `src/core/completionAlerts.ts`, `src/hooks/nativeAlertPlayback.ts` | Shared protocol/policy and Android snapshots/scoped playback |
| `src/hooks/completionNotificationAdapter.ts`, `completionAlerts.ts`, `.web.ts` | Composed delivery adapter and optional native bridge |
| `modules/crono-completion-alerts/` | Atomic delivery ledger, next alarm, bounded player/service, Open/Stop |
| `src/hooks/useAlertSound.ts`, `.web.ts` | Source-bound native/web players with explicit cleanup |
| `src/core/notifications.ts`, `src/i18n/notificationContent.ts` | Future event projection/payload validation and localized OS content |
| `src/hooks/notificationCoordinator.ts`, `useSystemNotifications.ts` | One serialized OS request owner, hydration guard and accepted-update bridge |
| `src/hooks/systemNotifications.ts`, `.web.ts`, `notificationTypes.ts` | Native date/channel/permission adapter and native-free web fallback |
| `modules/crono-background-access/`, `src/hooks/backgroundAccess.ts`, `.web.ts` | Read-only exact-alarm and battery observations |
| `src/hooks/notificationReadiness.ts`, `notificationPresentation.ts`, `notificationTrigger.ts` | Delivery policy, activity handoff, native date mapping |
| `src/components/BackgroundNotificationHelp.tsx`, `src/i18n/notificationStatus.ts` | Localized native setup and readiness |
| `src/hooks/notificationResponses.ts`, `useNotificationNavigation.ts` | Validated, buffered notification taps through Expo Router |
| `src/audio/notificationSounds.ts`, `src/components/SystemNotificationNotice.tsx` | Native sound names/channels and separate failure/retry feedback |
| `scripts/generate-notification-sounds.mjs` | Generate the four 15-second notification WAVs from original foreground patterns |
| `src/hooks/appActivity.ts` | Shared foreground checks and lifecycle subscription |
| `src/components/ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx` | Controlled virtualized action editor with explicit save/discard |
| `src/components/ScheduleCalendarPanel.tsx`, `CalendarDateFields.tsx` | Weekly and fixed-date editing with shared numeric date fields |
| `src/components/EditorBody.tsx`, `.web.tsx` | Preserve covered editor layout while hiding interaction/accessibility |
| `src/components/PlanningRunCard.tsx`, `TimingNotices.tsx` | Run controls and shared feedback/Stop in shell and sheets |
| `src/components/ActiveActivities.tsx`, `src/hooks/useForegroundNow.ts` | Cross-tab owner controls with local foreground display ticks |
| `src/components/ScheduleCard.tsx`, `ScheduleRepeatPanel.tsx` | Card disclosure and explicit repeated-sequence preview |
| `src/components/SettingsSheet.tsx`, `BackupSettings.tsx` | Grouped preferences and reviewed file transfers |
| `src/hooks/backupTransfer.ts`, `useBackupTransfer.ts` | Transfer lifecycle, stale-operation guards and one import update |
| `src/hooks/backupFiles.ts`, `.web.ts` | Optional native file modules and browser download/upload |
| `src/hooks/sheetIsolation.ts`, `.web.ts` | Modal background interaction/accessibility isolation |
| `src/core/language.ts`, `src/i18n/`, `src/hooks/useI18n.ts` | Saved language, catalogs, formatting, and shared-state selection |
| `src/core/notices.ts` | Semantic transient toast/completion/audio codes |
| `app.json` | Expo app identity, plugins, and native configuration |
| `eas.json` | Development, preview, and production build profiles |
| `playwright.config.ts` | Browser setup and web server on port 8091 |
| `tests/e2e/navigationTransitions.spec.ts`, `sheetTransitions.spec.ts` | Real route/sheet/panel motion, isolation and lifecycle regressions |

## Documentation and AI Context

| File | Purpose |
|---|---|
| `README.md` | Setup, gentler wheels, presets, navigation, themes, notifications and checks |
| `docs/background-notifications.md` | Android minute playback, setup, limits and verification |
| `docs/backups.md` | Portable export/import, selected theme compatibility, limits and recovery |
| `AGENTS.md` | Repository map and authoritative Expo workflow requirements |
| `.ai-factory/DESCRIPTION.md` | Project purpose, stack, data model, and known follow-ups |
| `.ai-factory/ARCHITECTURE.md` | Layered architecture, dependencies, and data flow |
| `.ai-factory/rules/base.md` | Naming, state, persistence, UI, and testing conventions |
| `.ai-factory/plans/feature-screen-sheet-transitions.md` | Transition checks, source identity and deferred native acceptance |
| `.ai-factory/plans/feature-directional-screen-transitions.md` | Horizontal route slides, lifecycle and compatibility checks |
| `.ai-factory/config.yaml` | Languages, artifact paths, Git defaults, and workflow preferences |

## Project Workflow

- Use npm with the committed `package-lock.json`; tests that run TypeScript directly require Node.js 24 LTS or later.
- Keep Romanian as the default interface language; localize app copy through the typed catalogs. Follow the configured language for generated documents.
- Use `master` as the configured Git base branch. Work from the intended development or feature branch and preserve unrelated local edits.
- Run shell operations separately when a later action depends on an earlier result, so failures can be inspected before continuing.
- Use `npm test` for core logic changes and relevant Playwright scenarios for UI changes, alongside the required lint and typecheck.
- Keep the pure core free of React, native APIs, and persistence imports. Send shared data changes through `useCrono().update`.
- Completion duration choices are 5/15/30/60 seconds, with 60 for fresh/missing/invalid values; retain valid shorter saves. Android native delivery persists projections/receipts only, never a second editable timing store. Separate lifecycle suspension from explicit cancellation; failed hydration cannot clear armed work. Physical minute/lock acceptance remains pending, deferred by the user on 2026-11-08.

## Adding a Language

Add the ID, autonym and locale in `src/core/language.ts`, then provide a complete `Messages` catalog in `src/i18n/` and register it in `src/i18n/index.ts`. Keep timing/core modules free of translation imports and route saved selection through `useI18n` / `useCrono().update`. Extend plural/date, persistence and browser-flow tests; check bundled font glyphs and compact layouts in both themes, and record unavailable native accessibility checks as pending. Preserve saved user text and semantic event identities.
