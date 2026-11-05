# Implementation Plan: Saved Dark Mode, Countdown Timer, and Audio Alerts

Branch: `feature/dark-mode-preference`
Base branch: `master`
Base commit: `a1e8445ce3738e1e95f95b0823f61c9b17b4c341`
Created: 2026-11-05
Mode: full
Updated: 2026-11-05
Status: implementation complete; native device validation pending
Current task: none (all 15 tasks complete)

## Original Request

adauga mod intunecat cu preferinta salvata

## Additional Request

poti te rog sa adaugi si timer, plus efectul audio

This request extends the existing full plan. Preserve its branch and file path so branch-scoped consumers continue to find the same plan. No implementation has started and no completed tasks are being renumbered.

## Settings

- Testing: yes
- Logging: minimal
- Docs: yes
- Communication language: English
- Artifact language: English; preserve Romanian application copy.
- Theme selection: manual light/dark toggle; light is the default.
- User-confirmed preferences: "Manual light/dark toggle, with light as the default (Recommended)" and "Tests + documentation + minimal logging (Recommended)".
- Documentation policy: mandatory completion checkpoint through `$aif-docs` for the README, with the affected AI context synchronized through its owner workflow.
- No roadmap or research artifact exists; this plan does not create or modify either.
- This refinement updates the existing plan only. App changes, dependency installation, commits, and publication belong to later execution.
- Countdown interpretation: a separate countdown timer, independent of the existing elapsed-time stopwatch.
- Proposed product defaults: five-minute initial duration; editable hours/minutes/seconds from one second through 23:59:59; one short bundled completion sound; saved `timerSound` preference enabled by default. These are implementation choices, not quoted user requirements.
- User-confirmed delivery policy: "Sound while the app is open; show expired state on return (Recommended)". No overdue sound on return/relaunch; no background notification scheduling or permissions.

## Outcome and Scope

Add a Romanian **Mod întunecat** switch in settings. Turning it on applies a dark palette immediately; turning it off restores light mode. The choice persists across app restarts and browser reloads using the current shared preferences storage. It works on iOS, Android, and the web preview.

Theme changes preserve stopwatch state, laps, session history, current navigation, and other preferences. Cover the shell, tabs, dial/SVG, lap rows, history, details, settings, confirmation sheets, notices, and native appearance integration. Retain the lime brand accent and the light theme's visual identity, with color adjustments where needed for legibility.

Add a third `Timer` tab with a Romanian countdown interface: configure a duration, start, pause, resume, reset, and restart after completion. The timer and stopwatch may run at the same time. Persist the configured duration and current timer state through the existing AppData store; changing theme, navigating, or opening settings must not reset either clock. Show `Timpul a expirat` visibly when the countdown completes and play the completion sound when allowed by the selected delivery scope, saved sound preference, and platform audio policy.

Automatic system-theme selection, a third theme option, recurring/multiple timers, countdown entries in stopwatch session history, additional click sounds, music/streaming/recording, animations, a UI redesign, storage restructuring, unrelated persistence repairs, dependency-audit remediation, and release publication are outside this feature.

## Requirements Reconciliation

Authority: the original request, additional request, and the user's clarifications define behavior. The additional request extends the theme feature with a countdown and completion audio; it does not replace the saved-theme requirement. `AGENTS.md` defines Expo/mobile workflow constraints. `.ai-factory/ARCHITECTURE.md` and `.ai-factory/rules/base.md` define module boundaries and conventions. Existing source describes compatibility requirements, not a requirement to keep the app light-only or stopwatch-only. Product defaults below are identified separately from confirmed requirements.

| Decision | Source | Verification evidence |
|---|---|---|
| Provide a manual toggle and persist its choice; default to light | Original Request and user clarification | Settings interaction and reload/relaunch scenarios |
| Keep schema version 1 and `@crono/app-v1`; add independently validated theme, timer sound, and countdown fields | `src/core/stopwatch.ts:16-31,105-129`; `src/hooks/useStopwatch.ts:6,16-22,37-43` | Legacy restoration tests preserve sessions, active timing, laps, and existing boolean preferences |
| Store through the existing functional `update` API | `src/components/SettingsSheet.tsx:9-12`; architecture, User Actions and Persistence | Switching and rapid-toggle tests inspect the final saved preference |
| Keep palettes pure, runtime state in context, and storage in the hook | Architecture, Dependency Rules; base rules, Module Boundaries | Core/theme unit tests run without React; source import review |
| Keep UI copy Romanian and preserve mobile behavior | `AGENTS.md`, Project Workflow; base rules, Mobile UI | Accessible switch label, existing browser journey, and native checks |
| Replace the fixed native light setting with support for both styles, then explicitly apply the saved choice | `app.json:9`; Expo color-themes guide; React Native 0.86 Appearance docs | App config diagnosis; opposite OS-theme scenarios on Android/iOS |
| Retain component identity while changing theme | `StopwatchFace.tsx:12-26`; architecture, Display and Device Behavior | Fixed-clock running-stopwatch scenario with laps, theme changes, and reload |
| Add an independent countdown and completion sound | Additional Request; existing stopwatch contract | Countdown transitions, simultaneous-clock E2E, and playback verification |
| Use a five-minute default and a one-second to 23:59:59 duration range | Proposed product defaults; bounded-input design choice | Boundary validation and duration input tests |
| Use absolute deadlines, local display refreshes, and one shared completion owner | Base rules, State and Timing; current provider and persistence ownership | Deadline/lifecycle tests; expiry from the history tab and settings |
| Preserve the existing stopwatch history; do not mix countdown runs into saved sessions | Existing `Session` contract; Additional Request adds no history requirement | Session count/content unchanged by countdown operations |
| Resolve the foreground/background sound scope before marking the plan ready | User confirmed foreground-only audio; SDK 57 Audio documentation | Selected delivery policy and corresponding platform scenarios |
| Use tests, documentation, and warnings/errors only | User clarification; base rules, Errors and Control Flow | Tasks 1, 7-10, 13-15 and logging review |

### Supported Combinations

| Input/state | Persisted state or transition | Output and invariants | Verification |
|---|---|---|---|
| Fresh install or no stored value | Default `preferences.theme = 'light'`; saved on the next normal update | Light UI with existing preference defaults | Core default test; browser context without storage |
| Legacy valid v1 payload without theme | Restore theme as light; retain all valid older fields | History, laps, running timestamp, haptics, and keep-awake survive | Explicit legacy payload based on the existing v1 test cases |
| Valid saved `light` or `dark` | Restore the same value | First interactive shell uses that theme | Serialization round trip and persisted startup E2E tests |
| Missing, null, non-string, or unsupported theme, including `system` | Normalize only theme to light | Retain other valid data; expected legacy normalization produces no noisy logs | Table-driven restoration tests |
| Manual switch while running, paused, or idle | Update only `preferences.theme` through `update` | Immediate repaint; no timing reset, new lap, session mutation, navigation reset, or modal dismissal | Fixed-clock E2E and state assertions |
| Several rapid switches | Existing ordered queue persists the last selected mode | Final visual choice and reloaded preference agree | Wait for final stored value, then reload |
| OS/browser scheme differs from selected theme | Persisted manual theme remains authoritative | No automatic switching; native appearance matches the app selection | Browser media emulation and native checks |
| Storage or native appearance synchronization fails | Preserve the existing storage warning behavior; handle native failures at WARN/ERROR level | No new independent storage path; do not claim a failed write persisted | Error-path review and relevant existing warning checks |
| Legacy payload lacks timer and timer-sound fields | Restore an idle five-minute timer and `timerSound = true`; retain valid existing fields | Theme, history, stopwatch, haptics, and wake preference survive | Extend the existing legacy restoration fixture and reload scenario |
| Missing/malformed timer or invalid sound preference | Default only the invalid new field; validate finite integers and coherent timer state | A bad timer must not discard valid sessions or theme | Table-driven corruption/isolation tests |
| Valid duration while idle/completed | Accept whole seconds in 00:00:01–23:59:59; clear completion when editing | Never start a zero/invalid duration; active/paused runs require reset before editing | Numeric input and boundary tests |
| Running stopwatch plus running countdown, in either theme | Preserve independent state; derive countdown remaining from its deadline | Starting/pausing/resetting either clock does not affect the other or saved sessions | Fixed-clock simultaneous operation with theme changes |
| Countdown paused then resumed, including after reload | Freeze remaining time on pause; resume with a new deadline and the same run identity | Paused time does not consume the remaining duration | Core transitions and persisted paused-resume E2E |
| Foreground deadline reached on Timer, History, or Settings | Transition the current run to completed once and persist it | Visible completion plus permitted sound; no dependence on focused route | Expiry while another tab/sheet is visible |
| Reset/restart or mute while audio work is pending | Invalidate stale callbacks and recheck run identity, sound preference, and app state before playback | An old completion cannot sound for a newer/cancelled run | Injected-adapter race tests |
| Completed run restored, repeated completion callback, or theme rerender | Preserve completed state and reject duplicate completion effects | No repeated sound or duplicate persistence for the same in-process completion | Reload/duplicate-callback regressions |
| Browser playback blocked or asset/audio setup fails | Keep countdown transitions and visible completion working | Recoverable Romanian notice, limited diagnostics, no unhandled promise rejection | Injected failure tests, browser fallback, and native listening checks |

Representative existing artifacts: retain `tests/stopwatch.test.ts` as the v1 data-contract baseline and rerun the existing stopwatch/history/settings journey in `tests/e2e/crono.spec.ts` after integration. Extend a valid legacy fixture with a running stopwatch, laps, a saved session, and false boolean preferences; change theme and operate the countdown, then reload and verify all independent fields. New tests must exercise actual rendered surfaces, stored state, and completion effects, not only an enum helper.

Meaning preservation: PASS — the original requests are preserved. The user confirmed foreground-only timer sound; expired state is shown silently on return/relaunch.

## Design and Integration Decisions

### Preference Contract

- Add `ThemeMode = 'light' | 'dark'` and `theme: ThemeMode` to `Preferences` in `src/core/stopwatch.ts`.
- Initialize light mode and accept only the two explicit strings in `restoreData`. Missing/invalid theme must not invalidate the rest of a valid v1 payload.
- Keep the current schema version and storage key. Theme changes spread previous data/preferences and use `useCrono().update`; they do not write to AsyncStorage directly.
- Preserve the existing no-op/domain state behavior and stopwatch references when a preference changes.
- Add `timerSound: boolean` with a true default and independent boolean validation. Preserve haptics, keep-awake, and theme when changing it.
- Add an independent `timer` field to AppData, validated through the new pure timer module. Leave the existing ordered storage queue as the only persistence owner; no second key or per-tick writes.
- Extend the existing state API with a stable `getSnapshot()` reading the hook's current ref and an `update(action)` result `{ changed, data }` describing the synchronous in-memory update. Existing callers may ignore this result. A rejected completion guard returns the previous AppData reference and `changed: false`; it must not authorize sound. This result is not an acknowledgement that AsyncStorage has finished writing. Keep transformations pure and all persistence in the existing queue.

### Semantic Palettes and Reactive Styles

- Keep `src/theme.ts` pure: export the existing fonts, a shared palette type, and typed light/dark palettes. Import the persisted theme type as a type-only dependency if needed.
- Separate primary text from action/featured/toast backgrounds. Current `c.ink` is used for all of these; blindly making it light breaks button and hero-card contrast.
- Include roles for page/desktop/surface backgrounds, text and muted text, borders, selected/disabled controls, accent/on-accent, action background/text/icon, featured background/text, danger states, switch tracks/thumb, dial ticks, overlay/handle, and toast/shadow.
- Keep `onAccent` dark on the lime logo and brand tiles in both modes. Pass explicit foregrounds for icons on filled surfaces.
- Use stable palettes and styles cached by mode, or memoized on palette changes. Do not rebuild StyleSheets or palette objects on every 32 ms stopwatch refresh.
- Cover inline colors and SVG props as well as StyleSheet entries. A temporary light `colors` compatibility export may exist during tasks 2-5; remove or stop using it once all UI consumers are converted.
- Target at least 4.5:1 for normal readable text and its background in both palettes. Exempt decorative/disabled elements as appropriate rather than falsely treating every stroke as text. Preserve brand identity while correcting affected low-contrast pairs.

### Theme Context, Navigation, and Native Appearance

- Create `src/context/ThemeContext.tsx` with a `ThemeProvider` and `useTheme()` exposing the selected mode and stable palette. It derives from `useCrono()` and owns no second persisted state.
- Place it below `CronoProvider`. Keep providers, tabs, and screens mounted across mode changes; do not use `key={theme}` or replace the navigation container.
- Use Expo Router's existing `ThemeProvider`, `DefaultTheme`, and `DarkTheme` exports, aliasing its provider to distinguish it from the local provider. They are present in the installed SDK 57 `expo-router/build/exports.d.ts:22-24`. Merge navigation colors with the app palette and retain base theme fields.
- Move the fixed `<StatusBar style="dark" />` into the themed subtree. Use light content in dark mode and dark content in light mode.
- During implementation, install SDK-compatible `expo-system-ui` with `npx expo install expo-system-ui`; update `package.json` and `package-lock.json`. Change `app.json` from `userInterfaceStyle: 'light'` to `automatic` so both native styles are supported. This native configuration does not add an automatic mode to the product.
- Apply the manual app-level native override using React Native `Appearance.setColorScheme(mode)` on mobile. Synchronize the root background using the SDK 57 SystemUI API. Effects depend on mode/readiness and handle failures without render-time or per-frame side effects.
- Use the existing splash-screen module to keep the first interactive native frame gated on fonts and storage readiness; release it on the existing font/storage error fallback paths as well. The static native launch image/background appears before JavaScript can read AsyncStorage and is not promised to reflect the saved manual preference.
- Keep the browser path functional without invoking unsupported native Appearance overrides. Browser media changes must not replace the selected preference.

### Countdown State and Timing

- Create `src/core/timer.ts` for pure types, defaults, validation, formatting, remaining-time calculation, and immutable transitions. Keep stopwatch behavior in its existing module. Runtime imports used by direct Node TypeScript tests must resolve explicitly, such as `./timer.ts`; type-only imports may remain erased.
- Use `status: 'idle' | 'running' | 'paused' | 'completed'`, configured `durationMs`, snapshot `remainingMs`, `deadlineAt: number | null`, and `runId: string | null`. Validate a coherent combination of fields and finite integer ranges. Do not silently coerce malformed persisted states into active runs.
- Idle has no run/deadline and its remaining amount equals the configured duration. Running has a positive snapshot remaining amount, valid deadline, and nonempty run identity; paused retains a positive remaining amount and run identity without a deadline; completed retains its run identity with zero remaining and no deadline. Valid running data may have a deadline in the past. Validate configured durations as whole seconds, while preserving millisecond precision for paused/running snapshots.
- Default to 300,000 ms. Configuration accepts whole seconds from 1,000 to 86,399,000 ms. Start/restart creates a new run identity; resume retains that identity. Inject `now` and identity creation at the transition boundary so tests remain deterministic.
- While running, derive remaining time as the deadline difference, clamped to zero and the snapshot remaining amount. Intervals update display-only state and never subtract/persist a second on every tick. Pause freezes derived remaining time; pause at/after the deadline completes instead of creating a paused zero-duration run.
- Reset cancels the active run, returns to idle, and restores the configured duration. Editing duration is allowed only when idle/completed; changing a completed duration returns to idle. Resetting an active/paused run uses the existing confirmation pattern. Completed runs stay visibly completed until edit/reset/restart; they do not create stopwatch sessions.
- `restoreData` retains valid overdue running data for lifecycle reconciliation. It does not play audio, silently complete the run before the controller can apply policy, or discard unrelated valid data. Invalid/missing timer data falls back independently.

### Shared Completion and Device Behavior

- Mount `useTimerCompletion` inside `CronoProvider`, passing the existing shared data/update/readiness/notice capabilities into it. Keep the controller outside all routes and outside theme-dependent keys. A framework-free coordinator helper in `src/hooks/timerCompletion.ts` accepts injected clock/state/effect adapters for deterministic lifecycle and race tests.
- Reconcile only after storage readiness, on current-run/deadline changes, at a foreground deadline callback, and on app/browser visibility return. Reschedule early callbacks against the absolute deadline; reconcile overdue callbacks instead of relying on a perfectly punctual interval. Use native AppState and an explicit web visibility adapter where required by the runtime.
- A completion transition is idempotent and guarded by the latest running state/run identity and deadline. Commit through the existing functional `update`; use its in-memory `{ changed, data }` result to confirm that this callback actually applied completion before claiming any effect. Issue sound/notices outside pure updater callbacks. Read `getSnapshot()` again after asynchronous setup/seek and immediately before playback to reject a reset, replacement, mute, or incompatible current state; React render snapshots alone are insufficient.
- Pause/resume retains `runId` but changes `deadlineAt`. An old deadline callback must be rejected or reconciled against the latest deadline, not accepted merely because the run identity matches. Cancel schedules using a captured deadline or generation token and cover a queued old callback after resume. Theme and notice updates must not recreate a claimed completion effect.
- Clear obsolete callbacks and listeners on pause/reset/replacement/unmount. Late asset setup/seek work cannot alert a newer run, play after mute, or replay because of a theme change. Hydrating an already-completed run never replays it. A crash between persisting completion and playback cannot provide a transactional exactly-once sound guarantee; document that limit accurately.
- Extend the existing mobile keep-awake guard to remain active when either the stopwatch or countdown is running and `keepAwake` is enabled. Completing/pausing one must not release the guard while the other still runs. Update the existing setting description to cover both clocks.
- The confirmed foreground-only policy requires silent overdue reconciliation on return/relaunch. Background playback and notification scheduling are disabled.

### Countdown Screen, Tabs, and Audio

- Add only the route at `src/app/timer.tsx`; keep reusable UI in `src/components/TimerFace.tsx` and timer logic outside `src/app/`. Use `Timer` for the tab and `Temporizator` for the screen heading, with labelled `Ore`, `Minute`, and `Secunde` inputs and Romanian validation feedback.
- Provide accessible start, pause, resume, reset, and restart actions. Show stable whole-second remaining time, a progress indication, and `Timpul a expirat` on completion. Announce completion once, not on each display tick; audio supplements visible feedback.
- Proposed input/display clarification: hours accept 0–23 and minutes/seconds 0–59, using complete decimal-digit strings with leading zeroes allowed. Keep empty text temporarily editable, but disable Start until all fields are nonempty, valid, and total at least one second. Reject signed, fractional, exponent, nonnumeric, and out-of-range text rather than relying on permissive `parseInt` coercion. Invalid drafts do not overwrite the last valid configured duration. Display positive remaining milliseconds with `Math.ceil(remainingMs / 1000)` so zero is shown only at expiry; clamp the progress value to its valid range.
- Add a shared `TimerCompletionNotice` derived from completed timer state. Render it in the app shell and within each active `Sheet`, above its scrolling content, so settings/details/confirmation modals cannot cover the only completion message. Do not rely solely on the existing 3.5-second toast underneath the native Modal. Preserve the open sheet and its current action; completion stays visible until timer edit/reset/restart, and only the active accessible surface announces it.
- Replace `_layout.tsx`'s current `route.name === 'history'` binary label/icon mapping with explicit metadata for `index`, `timer`, and `history`. Preserve tab press behavior and use each clock's own running indicator. Adjust the tab arrangement to fit three distinct targets at 320 px without truncating labels or changing the existing navigation contract.
- Add `Sunet temporizator` to settings, persisted independently of haptics and theme. Muting cancels any active/pending timer sound; enabling sound does not replay an old completion. Haptics retain their existing preference and mobile-only behavior. Keep the web note explicit about which settings are mobile-only.
- Install SDK-compatible `expo-audio` through `npx expo install expo-audio` during implementation. Bundle an original, short non-looping alert at `assets/audio/timer-complete.wav`, usable offline, and document its generated origin; do not download an unlicensed track or add recording features.
- Keep playback in a long-lived `useTimerSound` hook. Use SDK 57's managed player, await rewinding before repeat playback, and observe load/error/end status; `play()` returns void and must not be treated as a promise. Clean up player resources and handle failures without breaking timer state. Browser autoplay limits require a visible fallback; do not assume reloading a running timer grants audio activation.
- Explicitly disable microphone permission, Android recording permission, and background recording in the audio plugin. Select background playback configuration only after the delivery preference is resolved. Do not change system volume or claim sound bypasses silent mode/Do Not Disturb. For short foreground effects, respect device silent mode and mix with other audio.

### Confirmed Delivery Decision

The user confirmed: **Sound while the app is open; show expired state on return.**

Use the shared deadline coordinator and bundled audio for foreground completion. Reconcile overdue state silently on return/relaunch and show completion. Disable background audio in the plugin and add no notification dependency or permission prompt. Phone-locked/background alarm delivery is outside this implementation.

## Evidence and Planned File Changes

| Path | Planned change |
|---|---|
| `src/core/stopwatch.ts` | Theme/sound preference defaults, AppData timer field, independent v1 restoration |
| `src/core/timer.ts` | New pure countdown state, limits, validation, formatting, and transitions |
| `src/theme.ts` | Semantic light/dark palettes and shared palette type; retain fonts |
| `src/context/ThemeContext.tsx` | New reactive theme context derived from existing preferences |
| `src/context/CronoContext.tsx` | Mount shared completion/audio ownership and extend the wake-lock condition |
| `src/hooks/useStopwatch.ts` | Preserve ordered writes; expose a stable current-snapshot read and an in-memory conditional-update result for completion coordination |
| `src/hooks/timerCompletion.ts`, `src/hooks/useTimerCompletion.ts` | New injectable completion coordinator and platform lifecycle hook |
| `src/hooks/useTimerSound.ts` | New managed audio lifecycle and cancellation/error handling |
| `src/app/_layout.tsx` | Provider composition, three-route metadata, themed shell/navigation, startup gate, status/native appearance |
| `src/app/timer.tsx`, `src/components/TimerFace.tsx` | New countdown route, input/actions, local display refresh, and completion state |
| `src/components/TimerCompletionNotice.tsx`, `src/components/Sheet.tsx` | Shared completion feedback visible in the shell and inside active modal sheets |
| `src/components/SettingsSheet.tsx` | Saved theme/sound controls, wake-lock copy, themed settings, and precise web notes |
| `src/components/Icon.tsx` | Theme-aware defaults, timer icon, and explicit filled-surface foregrounds |
| `src/app/index.tsx` | Themed stopwatch actions, labels, empty/disabled states, and footer |
| `src/components/StopwatchFace.tsx` | Themed SVG geometry colors, digits, status, and current lap |
| `src/components/LapList.tsx` | Themed rows, fastest-lap state, statistics, separators, and empty state |
| `src/app/history.tsx` | Themed overview, session cards, details, and share/delete controls |
| `src/components/Sheet.tsx` | Themed overlay, surface, handle, close, and confirmation controls |
| `app.json` | Enable both native appearance styles and configure playback permissions without hand-editing native directories |
| `assets/audio/timer-complete.wav` | New small original bundled completion effect |
| `package.json`, `package-lock.json` | Expo-compatible SystemUI/audio dependencies; include every new Node test explicitly |
| `tests/stopwatch.test.ts` | Theme/sound/timer default, legacy, valid, invalid, and serialization regressions |
| `tests/timer.test.ts`, `tests/timerCompletion.test.ts` | New pure countdown and injected-coordinator race/lifecycle tests |
| `tests/theme.test.ts` | New meaningful palette-pair legibility checks |
| `tests/e2e/theme.spec.ts` | New theme, persistence, startup, running-state, and layout scenarios |
| `tests/e2e/timer.spec.ts` | New input, countdown, concurrent clocks, completion, audio fallback, and responsive scenarios |
| `README.md` | Explain theme/timer/sound controls, persistence, delivery scope, and native validation limits |
| `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `AGENTS.md` | Synchronize theme/countdown contract, side-effect ownership, dependencies, and repository map |

The existing context/persistence boundaries remain authoritative. Extend `CronoContext` for countdown side effects and the persistence hook for the current-snapshot/conditional-update contract described above; its generic AppData snapshot queue already carries new fields without another writer. A second storage owner or broad refactor is not planned. Keep existing tests and the current history limit intact. No native notification paths or dependencies are needed for the confirmed foreground-only policy.

## Commit Plan

- **Commit 1** (after tasks 1-3): `feat(theme): add persisted theme state and runtime foundation`
- **Commit 2** (after tasks 4-6): `feat(theme): apply light and dark palettes across Crono`
- **Commit 3** (after tasks 7-9): `feat(timer): add persisted countdown and completion lifecycle`
- **Commit 4** (after tasks 10-12): `feat(timer): add countdown screen and completion audio`
- **Commit 5** (after tasks 13-15): `test: verify themes and timer and document controls`

These are implementation checkpoints, not commits created by planning. Some files, including `src/theme.ts` and `package.json`, span checkpoints; commit only the hunks implemented at each checkpoint. Pre-existing README/context edits must not be swept into feature commits without resolving their staging scope.

## Tasks

### Phase 1: Compatible State and Runtime Foundation

- [x] Task 1: Extend and validate the persisted theme preference without losing v1 data.
  - **Files:** `src/core/stopwatch.ts`, `tests/stopwatch.test.ts`.
  - **Deliverable:** `ThemeMode`, light default, and whitelist restoration following the Preference Contract.
  - **Tests:** Build an explicit legacy v1 payload using the existing restoration test patterns, including a running stopwatch with laps, a valid saved session, and false existing preferences. Assert no field is lost. Cover both theme round trips and missing/null/invalid/non-string values falling back independently.
  - **Acceptance:** Existing 14 tests and the added restoration cases pass; neither schema version nor storage key changes.
  - **Logging:** None for normal pure transformations or expected legacy fallback; preserve the existing error-reporting path.
  - **Dependencies/source:** None; user saved-preference requirement and reconciliation rows 1-3.

- [x] Task 2: Define semantic light/dark palettes and a reusable style-selection pattern.
  - **Files:** `src/theme.ts`; preparation of style factories stays with each consumer's later task.
  - **Deliverable:** Typed palettes with the roles listed above; dark surfaces, readable text, lime accent, and separate filled-control foregrounds. Keep `fonts` stable.
  - **Acceptance:** Palettes share the same shape, remain importable in Node without React/native modules, and do not conflate text color with filled backgrounds. Document intended foreground/background pairs for task 13, including timer inputs and completion feedback.
  - **Logging:** None; this is pure configuration.
  - **Dependencies/source:** Task 1 for the theme type; architecture dependency rules and the existing `c.ink` usage audit.

- [x] Task 3: Wire the theme provider, navigation, startup, and native appearance.
  - **Files:** new `src/context/ThemeContext.tsx`, `src/app/_layout.tsx`, `app.json`, `package.json`, `package-lock.json`.
  - **Deliverable:** Follow the Theme Context, Navigation, and Native Appearance decisions. Read the installed Expo version before using APIs; install SystemUI through Expo, not a generic package-manager add. Keep the custom tab bar, loading states, toast, and storage warning reactive.
  - **Acceptance:** Saved dark data yields a dark first interactive shell; fresh data stays light even when the OS is dark. Navigation/providers retain identity, status-bar contrast follows the app, and loading/error paths do not trap the splash indefinitely.
  - **Logging:** Warnings/errors only for failed native appearance/root-background/splash synchronization. Avoid success, render, tick, and stored-payload logs.
  - **Dependencies/source:** Tasks 1-2; SDK/RN references below and current `_layout.tsx:17-19,44-61`.

### Phase 2: Manual Control and Complete UI Coverage

- [x] Task 4: Add the saved manual switch and correct shared icon/settings colors.
  - **Files:** `src/components/SettingsSheet.tsx`, `src/components/Icon.tsx`.
  - **Deliverable:** Accessible switch labelled `Mod întunecat`; checked means dark. Use the existing functional preference update with spreads and existing haptic feedback. Keep settings open while its palette changes. Convert switch off-tracks, thumbs, icon tiles, dividers, labels, and brand marks.
  - **Acceptance:** Theme selection works on web as well as mobile. Rewrite the current "Aceste două opțiuni" web note to identify haptics and screen wake lock explicitly, so it cannot imply the theme toggle is mobile-only. Icons on lime keep a readable dark foreground.
  - **Logging:** No routine toggle logs; storage failures continue through the existing warning mechanism.
  - **Dependencies/source:** Tasks 1-3; existing settings update and icon default patterns.

- [x] Task 5: Apply both palettes to the stopwatch and all lap states.
  - **Files:** `src/app/index.tsx`, `src/components/StopwatchFace.tsx`, `src/components/LapList.tsx`.
  - **Deliverable:** Convert all static and inline colors, including SVG ticks/rings/progress/marker, button states, current lap, fastest-lap highlight, counters, summaries, empty state, and footer. Cache styles by mode rather than per refresh.
  - **Acceptance:** Idle, running, paused, lap-limit, empty, and populated states remain legible in both themes. A switch changes presentation without changing `startedAt`, accumulated time, lap values, or the running effect's lifecycle.
  - **Logging:** No render, timer, formatting, or per-lap styling logs.
  - **Dependencies/source:** Tasks 2-4; `StopwatchFace.tsx:12-26,40-66`, `LapList.tsx:22-35,43-67`, and stopwatch route actions/styles.

- [x] Task 6: Apply both palettes to history, details, and shared sheets.
  - **Files:** `src/app/history.tsx`, `src/components/Sheet.tsx`, `src/theme.ts` if removing the temporary light compatibility export.
  - **Deliverable:** Theme overview/cards, selected-session details, sharing/deletion controls, empty history, overlay/handle/close control, confirmations, and their text. Preserve separate featured/action/toast roles instead of using the primary text token as a background.
  - **Acceptance:** Both tabs and already-open sheets update immediately. Session selection, close/reset/delete confirmations, and sharing behavior remain intact. Audit all `src/` imports and color literals so no visible consumer remains bound to the old static light palette; deliberate constant brand/decorative values must have an explicit role.
  - **Logging:** Preserve existing sharing/error notices; no styling or routine navigation logs.
  - **Dependencies/source:** Tasks 3-5; history styles/actions and `Sheet.tsx:11-20,37-48`.

### Phase 3: Countdown State, Compatibility, and Completion Ownership

- [x] Task 7: Implement the pure countdown model and its boundary tests.
  - **Files:** new `src/core/timer.ts`, new `tests/timer.test.ts`; extend the explicit `package.json` test list as tests are added.
  - **Deliverable:** Implement the Countdown State and Timing contract, including defaults, bounded input validation, injected time/run identity, start/pause/resume/reset/restart, completion, and remaining-time formatting. Invalid operations preserve state where practical.
  - **Tests:** Fresh state; duration minimum/maximum and invalid/non-finite/fractional values; exact deadline and overdue completion; pause/resume; pause at expiry; reset/restart identity; backwards-clock clamping; idempotent completion; independent stopwatch state. Distinguish configured whole-second duration from millisecond paused remaining time. Check display rounding at 1, 999, 1000, and 1001 ms, plus minute/hour boundaries: every positive remaining amount displays at least one second.
  - **Acceptance:** New tests run through Node 24 without React/Expo/storage dependencies. No countdown operation mutates stopwatch data or appends a session; elapsed time depends on a deadline rather than counted callbacks.
  - **Logging:** None in pure transitions, formatting, or validation.
  - **Dependencies/source:** Task 1's compatible AppData conventions; Additional Request, base timing rules, and the proposed bounded-duration defaults.

- [x] Task 8: Persist and independently restore countdown state and sound preference.
  - **Files:** `src/core/stopwatch.ts`, `src/hooks/useStopwatch.ts`, `tests/stopwatch.test.ts`.
  - **Deliverable:** Add `timer` to AppData and `timerSound` to preferences, with independent default/validation. Use the existing single storage key, version, functional updates, lifecycle snapshot, and write queue. Define coherent status/deadline/remaining/run-identity combinations and retain valid overdue running data for reconciliation. Provide the stable `getSnapshot()` and synchronous `update(action): { changed, data }` contract described above, preserving existing callers and distinguishing in-memory acceptance from durable persistence.
  - **Tests:** Original legacy v1 fixture; theme-only legacy fixture from task 1; all countdown status round trips; overdue running snapshot; malformed timer isolation; invalid sound fallback; false sound/haptics/keep-awake preserved; existing running stopwatch/laps/sessions retained. Verify existing save/reset operations spread and preserve the new fields.
  - **Acceptance:** Version 1 and `@crono/app-v1` remain unchanged; no migration discards valid prior data; no timer tick writes storage. Use explicit `.ts` runtime imports where Node test execution requires them.
  - **Logging:** No normal restoration/fallback noise; storage failures keep the existing user-visible warning mechanism.
  - **Dependencies/source:** Tasks 1 and 7; current restoration contract and ordered AppData persistence.

- [x] Task 9: Add shared, cancellable countdown completion coordination.
  - **Files:** new `src/hooks/timerCompletion.ts`, new `src/hooks/useTimerCompletion.ts`, `src/context/CronoContext.tsx`, new `tests/timerCompletion.test.ts`, `package.json` test script.
  - **Deliverable:** Implement one readiness-gated provider-level coordinator using injected clock/state/visual/audio adapters. Handle current deadlines, foreground callbacks, visibility/AppState return, expiry discovered by actions, and hydration according to the selected delivery policy. Keep UI refresh state out of the context and side effects out of pure state updaters.
  - **Tests:** Duplicate expiry/lifecycle events; hydration of completed versus overdue running data; completion while the route is absent; pause/reset/restart around deadline; pause/resume with the same run identity and an obsolete queued deadline callback; stale async seek/load; mute/reset between the captured render snapshot and conditional update; failure cleanup and unmount. Assert that rejected updates produce no sound, post-await checks read the actual current snapshot, and an accepted completion changes state once with at most one playback attempt per run within the live coordinator. Register `tests/timerCompletion.test.ts` in `npm test` in this task and run it before the phase-3 commit, alongside the already registered stopwatch/timer tests.
  - **Acceptance:** Navigation, settings, and theme changes cannot interrupt ownership or duplicate effects. An expired pause action reaches the same completion pathway. Persisted completed data does not replay on restart, and late work cannot alert a replacement run. Apply the confirmed foreground-only delivery policy.
  - **Logging:** Limited warnings/errors for genuine coordination/platform failures; no scheduling, tick, state-payload, or success logs.
  - **Dependencies/source:** Tasks 7-8; Shared Completion and Device Behavior decisions. Audio is an injected capability here; its concrete adapter follows in task 10.

### Phase 4: Completion Audio, Countdown Interface, and Device Integration

- [x] Task 10: Add the bundled completion effect and managed audio adapter.
  - **Files:** new `src/hooks/useTimerSound.ts`, new `assets/audio/timer-complete.wav`, `app.json`, `package.json`, `package-lock.json`; wire the concrete adapter into the shared coordinator.
  - **Deliverable:** Recheck SDK 57 docs and install `expo-audio` through Expo. Generate a small original non-looping effect, configure playback-only permissions, and implement preloading/readiness, repeat playback from the beginning, error observation, cancellation, and cleanup. Separate preparation from the final play command, or accept a coordinator-supplied guard evaluated after asynchronous setup/seek and immediately before `player.play()`. A cancelled/muted attempt is not an audio failure and produces no failure notice. Apply the confirmed delivery scope; do not implement background alarm delivery with a JavaScript timer.
  - **Tests:** Injected playback setup/seek/load failures; cancellation and mute during pending setup; repeated distinct runs; blocked browser playback fallback. Verify the shipped asset is bundled and decodable, rather than only asserting a filename exists.
  - **Acceptance:** Audio failure never blocks visual completion or future timer runs; playback is attempted only for an allowed current completion. No microphone request, recording, unlicensed media, looping sound, system-volume change, or unhandled rejection is introduced. Real audible output requires the native checks in task 14.
  - **Logging:** WARN/ERROR for actual audio/setup failures only, rate-limited per failed attempt; recoverable Romanian notice without exposing stored data.
  - **Dependencies/source:** Task 9; SDK 57 Audio reference and the user-selected delivery policy. If that policy requires notifications, expand this phase before implementation.

- [x] Task 11: Add the themed countdown route and correct three-tab navigation.
  - **Files:** new `src/app/timer.tsx`, new `src/components/TimerFace.tsx`, new `src/components/TimerCompletionNotice.tsx`, `src/components/Sheet.tsx`, `src/app/_layout.tsx`, `src/components/Icon.tsx`.
  - **Deliverable:** Add the labelled duration editor and timer controls described above. Use explicit metadata for all three routes, distinct running indicators, local foreground display refresh, accessible completion feedback, safe areas, and shared palette roles. Preserve existing tab press behavior and use Expo Router exclusively.
  - **Acceptance:** Zero/empty/invalid input cannot start; use the explicit per-field parsing and positive-time ceiling rules above. Running/paused configuration requires reset before editing. Remaining time stays accurate after navigation and does not go negative. All three tabs, inputs, controls, and completion feedback fit 320/430/1024 px in both themes. Completion is visible and accessible inside an open settings/details/confirmation dialog as well as the shell, without closing the dialog or replaying sound. Theme changes do not replace the timer run or route identity.
  - **Logging:** None for display refresh, input editing, routine actions, or navigation.
  - **Dependencies/source:** Tasks 2-6 and 7-10; existing custom tab mapping and Romanian UI conventions.

- [x] Task 12: Integrate saved sound control and shared screen wake behavior.
  - **Files:** `src/components/SettingsSheet.tsx`, `src/context/CronoContext.tsx`, coordinator/audio integration, relevant new coordinator tests.
  - **Deliverable:** Add accessible `Sunet temporizator`, preserve independent theme/haptics/wake preferences, cancel pending playback on mute, and extend the existing single wake guard to either running clock. Explain both clocks in the wake setting and precisely identify mobile-only options in the web note.
  - **Acceptance:** Sound defaults on and persists off/on independently; enabling it does not replay an old completion. Muting leaves visible completion working. With keep-awake enabled, stopping one clock while the other runs retains the guard; neither running clock means the guard is released. No second storage path is introduced.
  - **Logging:** No ordinary preference or wake-guard lifecycle logs; preserve existing failure handling and minimal logging.
  - **Dependencies/source:** Tasks 4, 8-11; current settings update pattern and `CronoContext.tsx` wake guard.

### Phase 5: Regression Coverage, Platform Checks, and Documentation

- [x] Task 13: Add palette, theme, and countdown end-to-end regression coverage.
  - **Files:** new `tests/theme.test.ts`, new `tests/e2e/theme.spec.ts`, new `tests/e2e/timer.spec.ts`, `package.json` test script.
  - **Deliverable:** Verify meaningful text/background contrast pairs in both palettes. Add `theme.test.ts` to the existing explicit test list and ensure `npm test` executes all four paths (`stopwatch`, `timer`, `timerCompletion`, `theme`), avoiding shell-specific glob assumptions. Use existing Playwright discovery and Romanian accessible locators. For deadline-driven countdown tests, call `page.clock.install()` before app startup, then advance callbacks and time with `runFor`/`fastForward`; `setFixedTime` alone changes Date but does not advance a queued timeout to its deadline. Retain the existing stopwatch journey's suitable fixed-Date checks and use controlled scheduling only where needed.
  - **Scenarios:** Light by default; dark and light round trips; legacy data retained after changing theme; final rapid-toggle value persisted; OS/browser scheme does not override the manual choice; visible colors on shell/settings/dial/laps/history/details/confirmations; widths 320, 430, and 1024 in both themes; first interactive dark shell after hydration.
  - **Running-state regression:** Start, record a lap, open settings, change theme, advance the fixed clock, close/reopen settings, and reload. Assert exact elapsed time, unchanged laps, history, and selected theme. Include paused/idle coverage where state transitions differ.
  - **Countdown scenarios:** Per-field input bounds and pasted invalid text; sub-second remaining-time rounding; start/pause/resume/reset/restart; persisted running and paused states; overdue/reloaded completion policy; expiry while viewing History/Settings and inside session/reset/delete dialogs; no duplicate alert after reload; independent stopwatch plus countdown with theme changes; sound preference persistence; muted/blocked audio fallback; all three tabs at compact widths. Scope modal completion assertions inside the active dialog and verify that its existing action still works. Drive a real scheduled deadline with the installed Playwright clock rather than only calling a pure completion helper. Include assertions at the playback adapter boundary, not only completion text; leave actual audible-device validation to task 14.
  - **Acceptance:** New tests prove observable rendering, persistence, and effect decisions, and the existing `crono.spec.ts` journey still passes. Seed legacy/dark storage once without an init script that silently reseeds on every reload. Wait for final storage writes before testing persistence. Avoid old contexts overwriting artificially seeded storage during lifecycle events; seed fresh contexts before app startup.
  - **Logging:** Test diagnostics on failure only; no runtime logging framework.
  - **Dependencies/source:** Tasks 1-12; supported-combination table and current unit/E2E artifacts.

- [x] Task 14: Validate theme, countdown, audio, and native device behavior.
  - **Files to verify:** `app.json`, dependency manifests, themed source, and tests; record outcomes in this plan's execution progress rather than a separate report artifact.
  - **Deliverable:** Refresh the command catalog after manifest changes and run lint, typecheck, all core/coordinator/theme tests, the relevant E2E suite, all-platform export, and Expo dependency/config diagnostics. Inspect new dark/light stopwatch/timer previews without committing generated output.
  - **Native checks:** On Android/iOS test cold launch with saved dark and light, switching while running, foreground/background return, status-bar/native-control contrast, and opposite OS appearance. Check Android gesture/three-button navigation contrast where available. Native config/module changes require a rebuilt app for reliable verification; use the project Expo/EAS workflow and keep generated native directories untouched.
  - **Audio/lifecycle checks:** Listen to the bundled sound on Android/iOS, repeat it across runs, verify mute/silent mode and external audio routing, and complete while on another tab. Check foreground/background/locked/relaunch behavior against the selected policy, including visible completion when sound is unavailable. Inspect native config for unwanted microphone/recording permissions. Browser playback tests do not establish audible phone delivery.
  - **Acceptance:** Automated checks pass and there are no feature-related runtime errors. Browser/export results are not recorded as native passes. If native hardware/build access is unavailable, retain those checks as explicitly unverified and require them before claiming native release validation; do not trigger a paid/signed cloud build or store submission as an implicit test step.
  - **Logging:** Review warnings/errors produced by actual failures; confirm there are no per-tick, per-render, or session-payload logs.
  - **Dependencies/source:** Tasks 3 and 7-13; `AGENTS.md`, SDK references, and command provenance below.

- [x] Task 15: Complete the documentation checkpoint and synchronize project context.
  - **Files:** `README.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `AGENTS.md`.
  - **Deliverable:** Use `$aif-docs` for the README's feature/usage notes. Explain `Mod întunecat`, the light default, saved preference, legacy fallback, manual override, timer duration/controls, simultaneous operation, `Sunet temporizator`, completion delivery scope, browser/silent-mode limitations, bundled sound origin, and native launch/build validation limits. Synchronize the theme/countdown contracts, provider/controller ownership, dependency list, and repository map through the appropriate context owner workflow, preserving existing Expo instructions and unrelated local edits.
  - **Acceptance:** Documentation matches implemented behavior, links resolve, the mandatory checkpoint is satisfied, and pre-existing storage/audit findings are still accurately marked as unresolved unless separately addressed.
  - **Logging:** No runtime changes; preserve the selected minimal logging policy in the documented workflow.
  - **Dependencies/source:** Tasks 1-14; user-confirmed docs preference and project context ownership.

## Verification Commands and Provenance

Command catalog captured with the installed `ai-factory commands --json` from repository root on 2026-11-05. It contains no ambiguities. Catalog entries are `declared` / `not_run`; those labels alone do not prove execution or authorize unrelated lifecycle/build actions.

- Catalog `revision_sha256`: `aa81c3b4487b5bc8d79a148835d761372d21c60654b700725265971df91c2cbd`.
- Source `package.json` SHA256: `3095167f0a9367f43290d31196f412735be8a5d83ef10d714749b6f2dbfce9d0`.
- Source `package-lock.json` SHA256: `9faa54bacbf3c0741e5d586438bd147df17dc598e460c03cf78bf64029609766`.
- All commands below use CWD `.` (repository root). The catalog and manifest hashes were refreshed after implementation dependency/test-script changes on 2026-11-05. Execution outcomes are recorded below; catalog labels alone remain declarations.

| Catalog command ID | Command | Implementation result |
|---|---|---|
| `package.json#/scripts/lint` | `npm run lint` | Pass |
| `package.json#/scripts/typecheck` | `npm run typecheck` | Pass |
| `package.json#/scripts/test` | `npm test` | Pass: 31/31 core/coordinator/contrast tests |
| `package.json#/scripts/test:e2e` | `npm run test:e2e` | Pass: 20/20 scenarios against exported web |
| `package.json#/scripts/export` | `npm run export` | Pass: Android, iOS, and web bundles/assets |

Additional implementation commands are sourced directly from `AGENTS.md` and SDK documentation: `npx expo install expo-system-ui`, `npx expo install expo-audio`, `npx expo install expo-asset`, `npx expo install --check`, and `npx expo-doctor`. No notification dependency is required by the confirmed delivery scope. Playwright currently requires installed Google Chrome and uses port 8091 with one worker. On this WSL host, Node/npm are supplied by Windows; the baseline checks ran through Windows `cmd.exe` in `D:\app_crono`.

## Risks and Existing Work to Preserve

- Current uncommitted work predates this plan: `.ai-factory/config.yaml`, `AGENTS.md`, the English README translation/setup links, and the new DESCRIPTION/ARCHITECTURE/base-rules files. It was carried onto this branch without a stash, commit, or source edit.
- The existing initial storage-read failure can allow later writes over unread history. The single-entry history size limit also remains. This feature adds compatible preferences/countdown state; it does not claim to fix either defect or replace the persistence architecture.
- Static light `StyleSheet` bindings, fixed SVG/icon colors, and reused `ink` backgrounds are the main integration risks; palette-only changes are insufficient.
- Appearance changes must not remount the stopwatch/navigation or recreate frame-driven style state. Native launch appearance before JavaScript hydration is a separate surface from the first interactive frame.
- Timer completion needs explicit handling of hydration, late callbacks, state-changing actions at the deadline, stale audio work, and browser autoplay failures. Short effects and a visual completion fallback must not become a route-owned interval or repeated sound on every render.
- Absolute timestamps prevent interval drift but follow the device wall clock; manual clock changes cannot be promised monotonic elapsed-time accuracy. Clamp backwards-clock remaining time and test the documented behavior.
- Background/locked alarms are excluded by the confirmed scope. Native audio configuration does not wake a suspended JavaScript countdown; overdue completion is reconciled silently on return/relaunch.
- Keep feature commits scoped. If overlapping untracked context or README edits cannot be isolated safely, resolve staging with the user in the commit workflow rather than silently including prior work.

## API and Design References

Checked against the installed Expo SDK 57 / React Native 0.86 baseline on 2026-11-05. Recheck the matching docs if dependencies change before implementation.

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo documentation index](https://docs.expo.dev/llms.txt)
- [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/)
- [Expo SDK 57 SystemUI](https://docs.expo.dev/versions/v57.0.0/sdk/system-ui/)
- [Expo SDK 57 StatusBar](https://docs.expo.dev/versions/v57.0.0/sdk/status-bar/)
- [Expo SDK 57 SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/)
- [Expo SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/)
- [Expo Router JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/)
- [Expo SDK 57 Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
- [Expo SDK 57 Notifications — delivery-scope decision reference](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [React Native 0.86 Appearance](https://reactnative.dev/docs/0.86/appearance)
- [MDN browser autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [W3C contrast minimum guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Playwright Clock](https://playwright.dev/docs/clock)

## Execution Progress

- 2026-11-05: User authorized implementation and confirmed foreground-only completion audio. This clarification resolves all earlier pending delivery references: no notification dependency, background playback disabled, overdue completion silent on return/relaunch.
- Existing staged documentation/context snapshot is preserved; implementation changes remain separate in the working tree.
- Audio integration evidence: SDK 57 web AudioPlayer calls the browser play promise without handling rejection (`node_modules/expo-audio/src/AudioPlayer.web.ts:123-129`). A focused `.web.ts` adapter observes that promise; SDK-compatible `expo-asset` resolves the bundled source. Native playback uses managed `expo-audio`.

- Tasks 11–12: Typecheck and live browser smoke pass. Foreground expiry appears inside the open settings dialog; theme changes and the saved sound switch work. Single native wake guard now covers either running clock.

- Task 13: 31/31 Node tests and 20/20 Playwright scenarios pass on the exported web build. Tests cover legacy/saved themes, contrast, six theme/width combinations, independent clocks, scheduled expiry inside sheets, audio adapter calls, mute, blocked playback, background return, and decoding the bundled WAV. Final route labels aligned with the plan (`Timer` tab, `Temporizator` heading).

- Task 14 automated/platform evidence: lint and typecheck pass; `npm test` passes 31/31; all-platform export includes the 45 KB WAV and succeeds for Android/iOS/web. `npx expo install --check`: up to date. `npx expo-doctor`: 21/21 pass. Native config introspection adds no microphone usage description, Android RECORD_AUDIO permission, background audio mode, or recording service. Both timer palettes visually inspected; warnings are failure-only.
- Browser infrastructure: development Metro responses were slow enough to time out reload-heavy tests. The suite runs against the current production web export served locally on the same port. Early harness failures were corrected by targeting the active dialog and advancing frozen animation time; interrupted test processes were allowed to finish before the final isolated run.
- Native Android/iOS device/build checks remain **UNVERIFIED**: no phone/emulator or rebuilt signed binary is available in this session. Audible sound, silent-mode/routing behavior, cold-start appearance/status/navigation bars, opposite OS mode, locked/background return and wake lock require device validation before native release. No cloud build, store submission, or native directory generation was performed.

- Final isolated Playwright run against the final exported source: **20/20 pass** (23.7 seconds), including the unchanged original stopwatch journey. Task 14 is complete with the explicit native-validation limitations above; this is not native release approval.

- Task 15: Documentation updated through `aif-docs` in the existing 119-line English README; factual DESCRIPTION/ARCHITECTURE/AGENTS maps synchronized under the implement workflow. No new docs hierarchy or unrelated files were introduced. Local links verified, no broken targets; known initial-read/entry-size/audit findings retained.
- Documentation review — Meaning preservation: PASS (existing Expo/workflow obligations retained; scope matches the user's foreground-only answer). Technical accuracy: PASS against code/config and actual check results. Readability/completeness: PASS for theme/timer usage, persistence, original audio origin, and native validation limits. Documentation: updated existing docs.
- No roadmap artifact exists. No Git commit or push was made; the pre-existing staged snapshot remains unchanged. Completed full plan retained for review.

- Live Expo preview restored at `http://localhost:8091`. Final Chrome smoke on the development server passes with zero page/console errors; saved dark settings, `Timer` tab and `Temporizator` heading are present. Light/dark timer and stopwatch plus dark settings screenshots were visually inspected. Generated previews/exports remain ignored.

- Final visual refinement: React Native Web 0.21 uses a separate `activeThumbColor` (verified against installed source and official Switch docs). Settings supplies it only on web so enabled thumbs use the shared palette as intended; native keeps its standard `thumbColor`. Typecheck/lint pass; relevant live theme/stopwatch scenarios rerun below.

- After the web thumb-color refinement: lint/typecheck and Android/iOS/web export pass again. All 12 relevant theme/stopwatch scenarios pass against the restored live Expo server, supplementing the full 20-scenario exported-build run. No feature runtime errors observed.
