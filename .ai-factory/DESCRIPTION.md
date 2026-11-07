# CRONO Project Description

## Purpose

CRONO is a local stopwatch, countdown, and action schedule app for iOS and Android, with a web preview. Its interface supports Romanian (default), English, Russian, Spanish, French, and German through manual saved selection in Settings. Users can time activities, run ordered action sequences, record laps, save sessions, review history, and share results without an account or an application backend.

## Implemented Features

- Start, pause, resume, and reset a stopwatch; resetting requires confirmation.
- Display centiseconds and show hours for long sessions.
- Record lap splits and cumulative times, highlight the fastest laps, and calculate average lap duration.
- Save paused sessions and retain the latest 50 sessions, with up to 1,000 laps per session.
- View session details, share results, and delete sessions with confirmation.
- Run a separate countdown (one second to 23:59:59, five-minute default) alongside the stopwatch, with pause/resume, reset confirmation, restart, and visible completion across tabs/sheets.
- Save up to 20 schedules with 1–50 named actions each, automatic advancement, exact pause/resume, confirmed replacement/reset, and protected running/paused templates. Names are limited to 80 trimmed characters; action durations range from one second to 23:59:59.
- Run one schedule alongside the independent stopwatch and timer. The Planificare tab follows Timer; schedule runs do not enter stopwatch history.
- Select Clasic, Clopoțel, Digital, or Gong with 5/15/30-second looping playback, manual preview, and Stop controls. Defaults are Clasic and five seconds; the retained automatic-alert switch applies to timer and schedule boundaries.
- Play foreground action/final alerts, with one final event for the last action. Reconcile overdue timing silently on return/relaunch, without replaying in-app audio. A separate native notification owner registers future OS alerts in advance.
- Schedule local Android/iOS timer/action/final notifications with default-on saved enablement, gesture-only permission requests, one selected sound clip or silent visual delivery, localized Settings/status/retry and validated tap navigation. Physical delivery remains pending verification in a rebuilt native app.
- Restore active timing state, schedule snapshots/templates, laps, history, and preferences from local storage.
- Save manual white/blue light or navy/blue dark selection (light default), sound ID/duration, automatic alerts, mobile haptic feedback, and screen wake lock preferences independently.
- Select Romanian, English, Russian, Spanish, French or German manually in Settings; save the choice independently, translate built-in copy/dates/counts/sharing/announcements, and retain user-entered names and timing/audio lifecycles.
- Adapt the interface to compact screens, safe areas, and a constrained desktop preview width.

## Technology Stack

Versions below describe the current package manifest, not a requirement to upgrade dependencies.

| Area | Implementation |
|---|---|
| Language | TypeScript with strict checking |
| Framework | Expo SDK 57 (`expo ~57.0.32`), React Native `0.86.3` |
| UI runtime | React `19.2.3`; React Native Web for browser previews |
| Navigation | Expo Router, entry point `expo-router/entry` |
| Shared state | React Context and custom hooks |
| Persistence | AsyncStorage `2.2.0`, JSON schema version 1 |
| Device behavior | Expo Haptics, KeepAwake, SystemUI, StatusBar, and SplashScreen |
| Completion audio | SDK-compatible `expo-audio ~57.0.5` on native, `expo-asset ~57.0.20` and an observed HTML media play promise on web; four bundled original PCM WAV patterns |
| System notifications | SDK-compatible `expo-notifications ~57.0.25`, `expo-intent-launcher ~57.0.1`, date requests and static notification resources; web unsupported |
| Visuals | React Native StyleSheet, react-native-svg, bundled Inter fonts |
| Core tests | Node.js test runner and strict assertions |
| Browser tests | Playwright using locally installed Google Chrome |
| Builds | EAS profiles in `eas.json` |
| Package manager | npm, with `package-lock.json` |

## Architecture

Pattern: **Layered Architecture adapted to a mobile application**, with shared pure stopwatch/countdown/schedule cores, global timing coordinators, one alert playback controller, and a separate OS notification coordinator.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the actual folder structure, dependency boundaries, data flow, and TypeScript examples. The app currently has one small functional domain; additional service, repository, or feature-module layers are not required for routine changes.

## Main Entry Points

| Path | Responsibility |
|---|---|
| `src/app/_layout.tsx` | Fonts, safe areas, shared/theme providers, startup gate, four-tab shell, settings, and notices |
| `src/app/index.tsx` | Stopwatch screen and user actions |
| `src/app/timer.tsx` | Countdown duration editor and controls |
| `src/app/planning.tsx` | Saved-template CRUD, editor composition, and confirmed run replacement |
| `src/app/history.tsx` | Session history, details, sharing, and deletion |
| `src/core/stopwatch.ts` | Types, immutable timing operations, limits, formatting, statistics, and stored-data validation |
| `src/core/timer.ts` | Pure countdown transitions, bounds, restoration, parsing, and ceiling-based display |
| `src/core/planning.ts` | Schedule bounds, validation/CRUD, run snapshots, and cumulative transitions |
| `src/core/sounds.ts`, `src/audio/sources.ts` | Pure preference catalog and separate static asset map |
| `src/hooks/useStopwatch.ts` | Hydration outcome, accepted-update subscriptions, serialized writes and app-state persistence |
| `src/context/CronoContext.tsx` | Shared state, global timer/planning runners, one audio owner, notices, haptics, and one screen wake guard |
| `src/context/ThemeContext.tsx` | Saved theme projection, navigation palette, native appearance and root background |
| `src/hooks/timerCompletion.ts` | Injectable completion coordinator with current-state guards and cancellation |
| `src/hooks/useTimerCompletion.ts` | Readiness and foreground lifecycle adapter for the coordinator |
| `src/hooks/planningRunner.ts`, `usePlanningRunner.ts` | Accepted schedule transitions, boundary identity, and silent lifecycle reconciliation |
| `src/hooks/alertPlayback.ts`, `useAlertPlayback.ts` | Shared duration limits, event priority, preview/Stop, and scoped failures |
| `src/hooks/useAlertSound.ts`, `.web.ts` | Source-bound native/browser playback with explicit cleanup |
| `src/components/StopwatchFace.tsx` | Local display refresh and stopwatch dial |
| `src/components/TimerFace.tsx`, `TimerCompletionNotice.tsx` | Local countdown display and completion feedback in shell/sheets |
| `src/components/ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx` | Controlled drafts, ordered actions, validation, and explicit save/discard |
| `src/components/PlanningRunCard.tsx`, `PlanningNotice.tsx`, `TimingNotices.tsx` | Local schedule display, controls, and shared notices/Stop in shell/sheets |
| `src/core/language.ts`, `src/core/notices.ts` | Pure language registry/defaults and semantic transient notices |
| `src/i18n/`, `src/hooks/useI18n.ts` | Typed stable catalogs, cached locale/plural/share formatting, and saved selection |
| `src/core/notifications.ts`, `src/i18n/notificationContent.ts` | Future projection/payload validation and selected-language notification content |
| `src/hooks/notificationCoordinator.ts`, `useSystemNotifications.ts` | One serialized native request owner, hydration/lifecycle safeguards and gesture permission flow |
| `src/hooks/systemNotifications.ts`, `.web.ts`, `notificationTypes.ts` | Date requests, inventory, channels, permissions, settings and unsupported web policy |
| `src/hooks/notificationResponses.ts`, `useNotificationNavigation.ts` | Validated buffered/deduplicated Router navigation after notification taps |
| `src/audio/notificationSounds.ts`, `src/components/SystemNotificationNotice.tsx` | Native names/channels and independent failure/retry feedback |
| `src/theme.ts` | Pure semantic light/dark palettes and font-family names |

## Data and Persistence

The `AppData` object contains:

- `version: 1` to identify the persisted schema.
- `stopwatch`: accumulated milliseconds, an optional start timestamp, and recorded laps.
- `timer`: status, configured duration, remaining snapshot, optional deadline, and run identity.
- `planning`: saved schedules and an optional run snapshot containing its identity, source ID/name/actions, running/paused/completed status, current index, remaining milliseconds, and optional deadline.
- `sessions`: saved session identifiers, save timestamps, total durations, and laps.
- `preferences`: `language: 'ro' | 'en' | 'ru' | 'es' | 'fr' | 'de'`, `haptics`, `keepAwake`, `timerSound`, and `systemNotifications` booleans, `theme: 'light' | 'dark'`, `alertSoundId: 'classic' | 'bell' | 'digital' | 'gong'`, and `alertDurationSeconds: 5 | 15 | 30`. The legacy `timerSound` name now controls automatic timer and schedule alerts.

The hook stores the entire object as JSON under `@crono/app-v1`. Actions go through `update(action)`, which applies a functional transformation and queues a write. Its synchronous `{ changed, data }` result confirms in-memory acceptance, not durable storage; stable `getSnapshot()` reads the current accepted state. Additional writes are requested when the app leaves the active state. Display refreshes do not persist a new snapshot on every frame.

`restoreData` validates unknown JSON and filters invalid stored records. Unsupported versions and malformed input fall back to initial data. This fallback is existing behavior, not a migration strategy for future schema changes.

Optional timer/planning/preferences additions retain version 1 and the storage key. Missing or invalid fields independently default to Romanian language, light theme, an idle five-minute timer, empty planning, Clasic, and five-second sound; automatic alerts and system-notification opt-in default on. OS authorization is queried separately and never persisted. Existing valid clocks/history and false preferences are preserved. Schedule restoration filters bad templates independently and rejects incoherent run snapshots independently; validated snapshots can outlive their source template. Valid overdue runs remain running until the provider reconciles them. A literal pre-planning fixture exercises compatibility through restoration, settings, real Classic asset playback, completion, and reload.

Time is derived from `Date.now()` timestamps and accumulated paused time. Background time counts on return. Manual changes to the device clock can affect measurements; this app does not provide a metrological accuracy guarantee.

## Platform Behavior

- Android and iOS are the primary platforms; web provides a preview and browser test target.
- Haptics and screen wake lock are enabled only on mobile and respect saved preferences.
- One wake guard covers any running stopwatch, timer, or schedule. Theme and sound controls also work on web; manual appearance overrides the OS setting. The interactive shell waits for storage/fonts; the static native splash cannot read the saved preference before JavaScript.
- Timer and schedule coordinators belong to the provider and publish effects only after accepted updates. Schedule actions advance against cumulative deadlines; delayed callbacks publish only the latest crossed boundary. Hydration/background return catches up silently; completed hydration never replays sound. System notifications are pre-scheduled separately for future native deadlines; no recording permissions or background audio/remote-notification mode is configured.
- One playback controller arbitrates all alerts and previews. Live alerts outrank previews; later live deadlines win, with exact ties ordered timer completion, schedule completion, then action boundary. The final action emits only a schedule-complete event. Patterns loop for the selected duration after playback starts; startup is limited to four seconds. Stop, mute, sound/duration changes, and lifecycle cleanup cancel obsolete playback without resetting timing. Owner-specific pause/reset cannot cancel another activity's sound. Settings close cancels only preview; preview may play while automatic alerts are muted.
- Native and browser transports create a player for each accepted request and release old resources explicitly. Audio errors match their event/run; a later success clears old feedback without clearing unrelated session-save notices. TimingNotices projects completion and Stop into both shell and open sheets.
- Native sound respects silent mode and mixes with existing audio. Browser autoplay rejection produces visible feedback; the web adapter observes `HTMLMediaElement.play()` because SDK 57's web player does not observe that promise.
- Native system requests survive ordinary backgrounding/owner cleanup, suppress foreground system presentation, and are diffed against accepted future clocks and relevant language/sound/mute/opt-in changes. Failed hydration disables notification mutation, while denied/limited grants and native failures remain separate from saved preference and timing. Android uses four stable sound channels plus silent and a special-access Settings shortcut; OS policy can delay/silence delivery. Taps only navigate to validated timer/planning routes after startup readiness, retaining open drafts.
- Each system notification uses one selected bundled clip; the original Classic remains unchanged and `notification_classic.wav` is a byte-identical Android-safe resource copy. `timerSound: false` retains visual delivery. The looping duration and Stop remain foreground controls. Web explains unsupported behavior; Expo Go/older binaries without CRONO resources report unavailable, requiring a new native build.
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

Language expansion checks on 2026-11-07: lint/typecheck, all 96 Node tests, all 162 browser scenarios in one full run (8.0min), and fresh Android/iOS/web exports passed on the source identified in `plans/feature-additional-languages.md`. All six languages cover both themes at 390px; Spanish/French/German/Russian also cover 320/430/1024px. The new languages cover 130% web text and reduced motion. Final catalog glyphs exist in all five loaded Inter weights; representative screenshots were inspected. Saved/default selection, exact plurals/dates/sharing, literal legacy data, native-content reconciliation, mounted drafts, independent clocks, notice deadlines and real pending/playing playback are covered. Native devices/accessibility/OS delivery and independent linguistic review remain pending. No dependency, storage schema/key, native config or timing/audio policy changed for this expansion.

Notification implementation checks on 2026-11-06: lint/typecheck, 89 Node tests, all 104 browser scenarios in one full run (4.7min), fresh Android/iOS/web exports, dependency compatibility and 21/21 Expo Doctor checks passed. The five recommended SDK-57 patch updates were installed through Expo. Fresh isolated Android CNG verified SCHEDULE_EXACT_ALARM and byte-identical raw sound resources; iOS config introspection has no microphone or audio/remote-notification background mode. The native implementation is excluded from web. Physical Home/lock delivery, audible/visual behavior, permissions, exact access/Doze/channel/reboot settings and cold/warm taps remain pending; no APK/IPA or signed build was produced. Detailed evidence and source fingerprint are in the active notification plan.

Earlier multilingual checks on 2026-11-06: lint/typecheck, all 59 Node tests, all 95 browser scenarios in one complete 4.6-minute run, and fresh Android/iOS/web exports passed. Both themes cover all three languages at 390px; Russian also covers 320/430/1024px. Tests cover manual saved choice, defaults/legacy data, user text, localized sharing, concurrent timing, pending/playing real audio, silent catch-up and unchanged feedback lifetimes. Native-device and independent native-speaker checks remain pending.

Historical theme-refresh checks on 2026-11-05: 51 Node tests, lint/typecheck, and all 56 Playwright scenarios pass in one full browser run (7.6 minutes) against the development server on port 8091. The unchanged stopwatch journey passes in 21.7 seconds; 45-second timeouts and no retries are retained. Android/iOS/web export passed before the test-configuration fix, which does not change application code.

The preceding verification run passed 55/56 browser scenarios: repeated compressed Metro bundle loads exhausted the stopwatch journey's time limit, including a 90-second diagnostic. Playwright now requests uncompressed responses from the local server, resolving that verification failure without changing assertions or application behavior.

Both palettes cover 320/390/430/1024px, saved/legacy preferences, concurrent clocks, and pending/playing audio through theme changes; representative screenshots were inspected. Each palette checks 31 foreground/surface contrast pairs. All 12 sound/duration combinations retain controller coverage; browser checks observe playback calls and decode all four actual assets.

The earlier baseline passed dependency compatibility and 21 Expo Doctor checks before this notification change. The current change adds native notification/intent modules and notification resource/plugin configuration while retaining playback-only audio settings. Physical-phone audible duration/Stop, silent mode/routing, keyboard, appearance, wake lock, and locked/background return remain pending because no native device/runtime is available. Signed builds remain unverified.

Install app dependencies through `npx expo install <package>` to resolve SDK-compatible versions. Follow [AGENTS.md](../AGENTS.md) for versioned documentation requirements and EAS commands. Browser tests and successful exports do not establish physical-device behavior or signed-build readiness.

## Known Follow-up Work

These findings were identified during the repository review on November 4, 2026. Context setup does not resolve them:

1. A failed initial storage read leaves the hook ready with initial data. A subsequent action can overwrite previously stored history. This was reproduced with a simulated browser storage read failure. The notification feature now guards its own writes/inventory on failed hydration; unrelated existing writes still require a separate storage fix.
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
- Latest implementation plan: `plans/feature-additional-languages.md` (six-language code/CLI/browser/exports/docs complete; native acceptance pending). Earlier notification work remains at `plans/feature-background-notifications.md` (physical native acceptance pending), and original multilingual work at `plans/feature-multilingual-support.md`. Earlier completed implementations remain at `plans/feature-planning-button-feedback.md`, `plans/feature-white-blue-theme.md`, `plans/feature-sound-settings-schedules.md`, and `plans/feature-dark-mode-preference.md`. No roadmap or research artifact is present.

The connected GitHub app is available in the current agent session. No repository-level MCP server configuration is present. Reuse host-provided integrations when available; additional servers should address a concrete project need.
