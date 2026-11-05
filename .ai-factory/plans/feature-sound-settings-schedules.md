# Implementation Plan: Configurable Sounds and Action Schedules

Branch: `feature/sound-settings-schedules`
Base branch: `master`
Base commit: `a1e8445ce3738e1e95f95b0823f61c9b17b4c341`
Created: 2026-11-05
Mode: full
Status: planned; implementation not started

## Original Request

poti te rog sa mai adaugi efecete sonore, sa se poata schimba din setari si sa extinzi aceste efecte sonore, nu doar o secunda, plus as dori de mai adaugat inca un camp, langa timer, denumit planificare, acolo va functionalul care iti va permite sa creezi mai multe orare, de exemplu:
orarul 1) se seteaza o anumita perioada pentru a actiune, se seteaza alta perioada....

## Settings

- Testing: yes
- Logging: minimal; WARN/ERROR at recoverable persistence/audio boundaries, without routine render, input, tick, or success logging. Do not log schedule names, action text, or stored payloads. Each task below has an explicit logging instruction.
- Docs: yes; mandatory completion checkpoint through `$aif-docs`, with AI context changes routed through the relevant owner workflow.
- Communication/artifact language: English. Application copy: Romanian.
- User decisions: full plan; saved sequences of named actions and durations; automatic advancement; sound at every action end and the schedule end; multiple saved schedules with one active schedule; selectable sound and playback duration of 5, 15, or 30 seconds.
- Retained delivery policy: sound only while the application is open and active; silently reconcile elapsed time on return/relaunch. Retain native silent-mode/mixing behavior and playback-only configuration.
- Product defaults proposed by this plan: four bundled sounds, Classic selected initially, five-second playback initially, up to 20 saved schedules and 50 actions per schedule, schedule/action names limited to 80 trimmed characters. These bounds/defaults are implementation choices, not additional quoted user requirements.
- No roadmap or research artifact exists. This plan creates neither.

## Baseline and Ownership

This feature depends on the existing timer/theme implementation and the two completed timer fixes. Those changes are present in the working tree and have not been committed. The new branch was created from that working state; its HEAD equals the configured base commit. Preserve the existing staged snapshot, untracked source/tests/assets, and completed plan. Do not reset, stash, switch back to a clean base, or overwrite that work during implementation.

Relevant existing evidence:

- `.ai-factory/plans/feature-dark-mode-preference.md` — completed implementation and prior delivery/settings decisions. This request replaces its single short sound default, while retaining theme, independence, persistence, and foreground delivery requirements.
- `.ai-factory/patches/2026-11-05-00.37.md` — unchanged duration blur must preserve completion/audio; a new successful run must not inherit an old audio warning.
- `src/core/stopwatch.ts` — `AppData`, `Preferences`, `initialData`, and independent `restoreData` validation.
- `src/hooks/useStopwatch.ts` — the sole hydration/write owner, synchronous acceptance result, fresh snapshots, and ordered persistence.
- `src/hooks/timerCompletion.ts` / `useTimerCompletion.ts` — provider-owned deadline reconciliation, event deduplication, and cancellation guards.
- `src/hooks/useTimerSound.ts` / `.web.ts` — native playback mode, cleanup, and observed browser play promises.
- `src/app/_layout.tsx`, `src/components/SettingsSheet.tsx`, and `Sheet.tsx` — custom tabs, saved settings, modal feedback projection, and shared theme patterns.
- `assets/audio/timer-complete.wav` and `tests/e2e/timer.spec.ts` — a real existing bundled effect, decoding coverage, controlled deadlines, and the two timer regressions.

Keep planning changes confined to this artifact. App code and owner-controlled context documents change only during later implementation. Known storage-read failure, oversized legacy history, and dependency-audit findings remain separate follow-up work.

## Requirements Reconciliation

Authority: the current request and its explicit follow-up answers define this feature; the earlier user delivery/testing/logging preferences remain applicable. `AGENTS.md`, architecture, and base rules define repository constraints. The earlier one-short-sound default is explicitly superseded by the current request. No unresolved behavioral conflict remains.

Source anchors:

- **R1:** Original Request — additional selectable, longer sounds and a neighboring Planificare area containing multiple schedules/actions.
- **D1:** User answer — “Choose a sound and a duration of 5, 15, or 30 seconds in Settings (Recommended)”.
- **D2:** User answer — “Sequences of actions and durations (Recommended)”.
- **D3:** User answer — “Start the next action automatically (Recommended)”.
- **D4:** User answer — “At each action’s end and at the schedule’s end (Recommended)”. The final action ending and schedule ending are one audible event, rather than two overlapping copies.
- **D5:** User answer — “Save multiple schedules, run one at a time (Recommended)”.
- **P1:** Prior plan, Settings — tests + documentation + minimal logging; foreground-only sound and silent reconciliation on return.
- **A1:** `AGENTS.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/rules/base.md` — Expo Router, pure cores, shared updates, ordered storage, Romanian UI, mobile compatibility, required checks.
- **F1:** `.ai-factory/patches/2026-11-05-00.37.md` — focus/no-op behavior and run-specific error feedback.

Meaning preservation: PASS — explicit answers refine the ambiguous “orare” into duration sequences. Technical defaults and interruption rules are identified as plan decisions. The original Romanian request is preserved verbatim above.

| Case / source | Accepted input and stored state | Transition, side effects, and invariants | Verification |
|---|---|---|---|
| C1 — R1, D1 | Four sound IDs × durations `{5,15,30}`; independently saved preferences | Foreground automatic event uses the current selection, loops the pattern, and stops at its duration unless explicitly interrupted | Parameterize all 12 selections in `tests/alertPlayback.test.ts`; browser settings/reload and duration boundaries in `sounds.spec.ts` |
| C2 — D1, P1 | Automatic alerts enabled/disabled through the retained boolean | Muted automatic events still advance/complete and display feedback. Explicit preview can audition a sound while automatic alerts are disabled | Muted completion, manual preview, and no replay on re-enable |
| C3 — R1, F1 | Preview, selection/duration change, Stop, and Settings close | Cancel pending/playing preview on close; settings changes invalidate old playback; Stop silences audio without resetting timing state | Delayed preparation/play promises, rapid selection changes, closed Settings, and stop control inside a modal |
| C4 — D2–D4 | Valid one-action or multi-action run snapshot | Advance automatically against cumulative deadlines; one event per timely action boundary; final action emits one final event | One-action run, three-action run, exact boundary, duplicate callbacks, and final event count |
| C5 — D3, A1 | Running/paused state with exact integer remaining milliseconds | Pause/resume preserves fractions; reconcile overdue boundaries before an action; reset/replacement cancels only that run | Fractional pause/reload/resume and pause/reset at a deadline |
| C6 — P1 | Running snapshot crossing one/several deadlines during hidden/background/closed periods | Reconcile to the correct current action or completion in one accepted update; no overdue sound or replay; paused runs stay paused | Hydration, hidden-tab return, closed/reopened browser, and native locked return |
| C7 — R1, A1 | Valid names, unique IDs, 1–50 ordered actions, each `00:00:01`–`23:59:59`, up to 20 schedules | Validate before saving, keep unrelated records, preserve the original reference for no-op operations, and render limits clearly | CRUD, reorder/delete actions, invalid input/bounds, and partial corrupt-data restoration |
| C8 — D5 | One running or paused schedule plus other saved schedules | Protect its template from edit/delete; replacing its run requires confirmation. Cancel leaves the current run unchanged | Edit another schedule; cancel/confirm replacement; active-template protection |
| C9 — A1, P1 | Stopwatch, timer, and one schedule running concurrently | Separate state/run IDs, no schedule entries in stopwatch history, owner-scoped audio cancellation, and one shared wake guard | Combined run through navigation, theme changes, reload, and one-owner reset |
| C10 — D4, D5 | Preview and/or multiple live timing events competing for audio | One audible request at a time; live events replace preview; the latest live deadline wins; exact ties use the documented order below; each event still has visual feedback | Both callback orders for a tie, later event replacement, preview rejection during an alert, and no backlog replay |
| C11 — F1, P1 | Current playback failure, obsolete failure, subsequent success | Show failure only for the matching event; obsolete callbacks cannot stop/report against a newer request; preserve unrelated session-save toasts | Failure→success within 3.5 seconds, obsolete rejection/status callback, and session-save toast overlap |
| C12 — A1, F1 | Existing version-1 data and missing/invalid new fields | Restore new fields independently, preserving valid timer/stopwatch/history, false booleans, and saved theme | Literal pre-feature fixture plus real legacy WAV through hydration→settings→timer completion→reload |
| C13 — A1 | Light/dark, 320/430/1024px, long valid Romanian names | Four accessible tabs fit; editors scroll above the keyboard; notices and controls remain reachable inside sheets | Browser theme/viewport scenarios and physical-phone keyboard checks |

## Product and Data Contracts

### Sound selection and playback

- Provide four original/offline choices: **Clasic** (existing `timer-complete.wav`), **Clopoțel**, **Digital**, and **Gong**. Bundle three new PCM WAV patterns with sensible levels, short fades, and loop-safe edges. Do not fetch external audio or add a media service.
- Settings exposes **Alerte sonore**, **Sunet**, **Durata sunetului** (`5 s`, `15 s`, `30 s`), and **Ascultă sunetul**. Retain the stored `timerSound` boolean for backward compatibility, using it for automatic timer/schedule alerts. Preview is an explicit audition and may work while automatic alerts are disabled.
- Loop the selected pattern for the chosen playback duration. Arm the duration limit after playback starts, rather than consuming the duration during loading. Keep loading/startup bounded (four-second timeout), cancelable, and separate from timing transitions.
- **Oprește sunetul** is reachable in the shell and any active sheet while playback/preparation is active. It cancels sound without dismissing completion or altering timers/schedules. Closing Settings cancels its preview only. Changing sound/duration or turning automatic alerts off cancels old pending/playing audio without replaying an old completion.
- A new live alert replaces an older audible alert; the duration is the maximum uninterrupted playback length. Never queue missed sounds. Live alerts outrank previews. Among live alerts, compare `dueAt`; exact ties rank `timer-complete` > `schedule-complete` > `schedule-step`. An attempted preview during a live alert leaves that alert playing and gives brief visible feedback.
- The last action has one `schedule-complete` event that also identifies the finished action. Do not emit both a step sound and a final sound for that boundary.

### Schedules and execution

- Add route `src/app/planning.tsx` titled **Planificare**, immediately after **Timer** and before **Istoric**. The tab sequence becomes Cronometru / Timer / Planificare / Istoric.
- Each saved schedule has an ID, trimmed name, and ordered actions `{ id, name, durationMs }`. The editor supports add, edit, remove, move up/down, total duration, validation, save, and cancel/discard. Use accessible movement controls without a drag dependency.
- Proposed constants: 20 saved schedules, 50 actions per schedule, 80 characters for each schedule/action name, nonempty trimmed names/IDs, unique schedule IDs and unique action IDs within each schedule. Reuse the timer parser and per-action duration limits. Bound counts/text independently; these limits do not solve the separately known oversized-history issue.
- `planning` stores `{ schedules, run }`; `run: null` means no selected run. A run snapshots its schedule ID/name/actions so its timing never depends on mutable editor fields. Its status is `running | paused | completed`, with a unique `runId`, zero-based `stepIndex`, `remainingMs`, and nullable `deadlineAt`. Completed runs retain the last index with zero remaining and null deadline.
- Start from action 1. Pause freezes exact remaining milliseconds; resume sets the current deadline from the remaining value. Reset confirms while running/paused, then clears the run while retaining the saved template. Restart creates a fresh run ID. Starting another schedule while one is running/paused confirms replacement and performs stop/start atomically.
- Protect the active/paused template from edit/delete; other templates remain editable. Deletion confirms. Deleting the template associated with a completed run clears that completed projection in the same update. No run history or recurring calendar scheduling is introduced.
- Advance using the previous action’s deadline plus the next action’s duration, not callback time. A delayed callback may cross several actions: derive the final state once and publish only the most recent boundary feedback/sound when eligible. Hydration and foreground reconciliation are always silent. Background elapsed time therefore counts without requiring background execution.
- Preserve one active schedule independently of the stopwatch and countdown. The wake condition is the OR of all three running states, using the existing single guard.

### Persistence and effects

- Retain `version: 1` and `@crono/app-v1`. Add optional-to-restore `preferences.alertSoundId`, `preferences.alertDurationSeconds`, and `planning`. Default independently to Classic, 5 seconds, an empty schedule collection, and no run. Preserve false `timerSound`, haptics, and keepAwake values and all valid existing data.
- Validate unknown input, status coherence, finite/safe integer timestamps, snapshot bounds, IDs, index, remaining duration, and deadline nullability. Keep valid overdue running snapshots for the global runner to reconcile. Invalid new fields cannot reset other clocks or history; filter bad templates independently and reject an incoherent run snapshot independently.
- Keep pure types/validation/transitions in `src/core/`; no asset requires, React, Expo, timers, or storage imports there. Pass `now` and generated IDs into operations. `reconcileSchedule` returns pure next state and boundary metadata; side effects occur only after an accepted `update` result.
- Use existing `useStopwatch().update/getSnapshot` and serialized writes. Persist actual CRUD/control/accepted-boundary changes, not display ticks. Keep display timestamps local.
- Create a provider-owned shared playback controller with injectable transport/clock/scheduling. Requests carry `owner`, `eventId`, `dueAt`, kind, sound ID/duration, and a fresh-state validity guard. Cancel by owner or globally; old duration timers, preparation promises, and error callbacks cannot affect a newer generation.
- Replace the timer-only adapters with `useAlertSound.ts` and `.web.ts`, plus `useAlertPlayback.ts`. Use a source-bound player per accepted request, disposing the previous one before creating the next. This isolates old-source status callbacks during rapid sound changes. On native, use documented SDK 57 `createAudioPlayer`, observe its status, set looping, and explicitly unsubscribe/pause/remove on every stop, error, timeout, and unmount. On web, use `Audio`, static asset URIs, `loop`, an observed `play()` promise, source-bound error listeners, and complete resource cleanup. Keep callback identity/generation guards after every await.
- The shared controller owns the playback duration and interruption policy. Timer and planning coordinators own timing/event identity; their reset/pause actions cancel only their own alert. A settings preview never creates a timing event.
- Store transient audio failures by owner/event ID, separately from generic `notice` text. Match feedback to the visible run/boundary; clear that event’s old warning before a successful new event. Retain the unchanged-duration blur guard. Generic session-save notices must survive timing events.
- Compose `TimerCompletionNotice`, a new `PlanningNotice`, and playback stop/status feedback through `TimingNotices` in the shell and `Sheet`. Completion stays visible until reset/new run; an intermediate transition can use a brief live notice while the current action remains visible on Planificare. Never close an editor or confirmation to show feedback.

## Verification Commands and References

Command discovery: installed `ai-factory commands --json`, run from repository root on 2026-11-05.

- Catalog `revision_sha256`: `aa81c3b4487b5bc8d79a148835d761372d21c60654b700725265971df91c2cbd`.
- Source `package.json` SHA256: `3095167f0a9367f43290d31196f412735be8a5d83ef10d714749b6f2dbfce9d0`.
- Lockfile `package-lock.json` SHA256: `9faa54bacbf3c0741e5d586438bd147df17dc598e460c03cf78bf64029609766`.
- Catalog entries are declared/not_run; that metadata alone does not establish execution success. Refresh discovery and these hashes after manifest/lock changes, particularly immediate registration of new test files.

| Command ID | CWD | Planned command |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` |
| `package.json#/scripts/test` | `.` | `npm run test` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e` (focus on the affected spec while iterating) |
| `package.json#/scripts/export` | `.` | `npm run export` |

Use Node.js 24+ for direct TypeScript tests. On this WSL host, existing checks use Windows Node/npm from `D:\App_Crono`; keep Chrome and the web server on the same host. Do not start competing Playwright runners. A prior full run had one 45-second scenario timeout that passed alone; investigate and report timeouts without weakening assertions or silently changing global limits.

Primary references inspected for this plan:

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and [Expo Audio SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/audio/): player creation, lifecycle, looping, playback mode, and cleanup. Installed `node_modules/expo-audio/build/AudioModule.types.d.ts` confirms the relevant signatures; reread version-matching docs before implementation.
- [Expo docs index](https://docs.expo.dev/llms.txt) and [Expo Router introduction](https://docs.expo.dev/router/introduction/): route placement and platform workflow.
- [HTML media loop](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/loop) and [HTML media play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play): browser looping and rejection handling.

## Tasks

### Phase 1: Contracts, Assets, and Restoration

- [ ] **Task 1 — Define selectable sounds and bundle the additional effects.** Create `src/core/sounds.ts` for sound IDs, durations, defaults, and pure preference validation; create `src/audio/sources.ts` with static requires. Retain `assets/audio/timer-complete.wav`; add original `bell.wav`, `digital.wav`, and `gong.wav`. Create `tests/sounds.test.ts`, immediately register it in `package.json`, and verify valid/invalid preferences, unique catalog entries, real asset headers/durations, and all 12 supported sound/duration selections. Refresh command provenance after the manifest edit. Sources: R1/D1/P1, C1/C12. Logging: no logs for pure catalog/validation or normal asset use; reserve a concise WARN for runtime asset failures at the adapter boundary. Dependencies: none.

- [ ] **Task 2 — Model and validate saved action schedules.** Create `src/core/planning.ts` with schedule/action/planning types, bounds, immutable save/delete operations, independent restoration, unique-ID validation, and no-op handling. Generate IDs outside the core. Add `tests/planning.test.ts` and register it immediately; cover whitespace/empty names, units/ranges, count/name limits, ordered steps, duplicate IDs, and corrupt records without discarding valid peers. Sources: R1/D2/D5/A1, C7/C8/C12. Logging: none in pure transformations; return validation outcomes for Romanian UI feedback. Dependencies: none.

- [ ] **Task 3 — Implement deterministic schedule execution.** Extend `src/core/planning.ts` and `tests/planning.test.ts` with start/pause/resume/reset/restart/replacement and `reconcileSchedule` returning next state plus boundary metadata. Snapshot the template, anchor subsequent deadlines cumulatively, handle one-action completion once, reconcile multiple elapsed actions in bounded work, and preserve exact remaining milliseconds. Test boundary timestamps, duplicate/no-op calls, pause at expiry, long suspension, invalid snapshots, and independence from template edits. Sources: D2–D5/A1, C4–C6/C8/C9. Logging: none in core calculations. Dependencies: 2.

- [ ] **Task 4 — Add backward-compatible shared persistence.** Extend `Preferences`, `AppData`, `initialData`, and `restoreData` in `src/core/stopwatch.ts`; retain `src/hooks/useStopwatch.ts` as the sole storage owner. Add a literal `tests/fixtures/app-v1-before-planning.json` derived from the existing pre-feature restoration cases, with valid stopwatch/lap/history/timer values and false preferences; do not generate it through the new `initialData`. Extend `tests/stopwatch.test.ts` for independent defaults/corruption, overdue run preservation, serialized round trips, and older data. Update existing explicit AppData expectations. Sources: A1/P1/F1, C1/C6/C7/C12. Logging: preserve the existing recoverable storage notice; no payload logging, per-tick writes, or new storage framework. Dependencies: 1–3.

### Phase 2: Shared Audio and Global Execution

- [ ] **Task 5 — Implement cancelable, duration-limited shared playback.** Create `src/hooks/alertPlayback.ts` with injectable transport, clock, scheduler, current-state guard, event identity, owner/global cancellation, bounded duration after playback starts, and the specified preview/live/tie arbitration. Expose pending/playing state and event-scoped failure feedback through callbacks. Create/register `tests/alertPlayback.test.ts` immediately. Test all 12 selections at just-before/exact stop boundaries; delayed startup, stale completion/error/stop timers, owner isolation, replacement in both tie orders, preview suppression, failed-then-successful requests, and cleanup/reactivation. Sources: D1/D4/P1/F1, C1–C3/C9–C11. Logging: one concise WARN per current recoverable audio failure; no routine request/start/stop logs or private labels. Dependencies: 1.

- [ ] **Task 6 — Implement native/web transports with isolated resources.** Create `src/hooks/useAlertSound.ts` and `.web.ts`; add `useAlertPlayback.ts` as the provider lifecycle wrapper. Retain the existing timer-only adapters until their caller migrates in task 7, keeping imports/builds valid. Use source-bound request resources, explicit SDK 57 cleanup, bounded readiness/startup, guarded seeks, loop playback, and observed web promises/error events. Keep native recording/background flags disabled, silent-mode respect, and mixing. Never let disposal or an old-source error touch the new request. Extend `tests/e2e/helpers.ts` with source/loop/play/pause observations while preserving existing helpers; exercise the connected transports through tasks 7/9. Sources: R1/D1/P1/A1, C1–C3/C10/C11. Logging: bounded WARN on current setup/load/play failure; obsolete callbacks are silent. Dependencies: 1/5.

- [ ] **Task 7 — Connect the timer to shared alerts and scoped feedback.** Update `timerCompletion.ts`, `useTimerCompletion.ts`, `CronoContext.tsx`, and `TimerCompletionNotice.tsx` to use current saved sound/duration, timer event IDs, and owner-scoped cancellation. Remove the old `useTimerSound.ts`/`.web.ts` only after migrating their imports. Keep one audio owner in the provider, no replay on mute re-enable/hydration, and no warning leakage between runs or into unrelated generic toasts. Preserve the blur guard in `src/app/timer.tsx`. Extend `tests/timerCompletion.test.ts` and existing browser timer regressions; explicitly test generic session-save notice overlap. Adapt the existing asset-decoding scenario to start a short timer before awaiting its actual audio request, retaining its decoding assertions. Sources: P1/F1/A1, C1–C3/C9–C12. Logging: preserve current recoverable timer WARN behavior through the shared boundary, without double-logging the same failure. Dependencies: 4–6.

- [ ] **Task 8 — Add the global planning runner.** Create `src/hooks/planningRunner.ts` and `usePlanningRunner.ts`, using accepted updates/fresh snapshots and cancelable deadline generations. Integrate into `CronoContext.tsx` with controls, boundary deduplication, silent hydration/foreground catch-up, scoped sound requests, and a single OR-based wake guard for all three activities. Create/register `tests/planningRunner.test.ts`; cover route-independent progression, one/final/missed boundaries, stale callbacks, replacement, reset/pause cancellation, mute, and coexistence with a running timer. Sources: D3–D5/P1/A1, C4–C6/C8–C11. Logging: WARN only at current recoverable external failures; no transition/tick logs or action names. Dependencies: 3–7.

### Phase 3: Settings and Planning Interfaces

- [ ] **Task 9 — Expose saved sound settings and preview controls.** Update `src/components/SettingsSheet.tsx` with Romanian sound choices, 5/15/30-second controls, preview/stop state, accessible selected labels, and the shared automatic-alert switch labeled `Alerte sonore`. Persist changes through `update`. Close only the preview when Settings closes; handle live-alert priority and failure feedback inside the sheet. Create `tests/e2e/sounds.spec.ts` for defaults, every selection, reload, rapid changes, muted preview/automatic events, stop, and stale failures. Update old sound-switch locators while preserving their assertions. Sources: R1/D1/F1/A1, C1–C3/C11/C12. Logging: UI validation is visible feedback, without routine console logs; surface adapter WARN/failure state. Dependencies: 6/7.

- [ ] **Task 10 — Build the schedule/action editor.** Create `src/components/ScheduleEditorSheet.tsx` and `ScheduleStepRow.tsx`, using `parseDuration`, shared theme, controlled drafts, explicit Save, reorder controls, validation/count feedback, and unsaved-discard confirmation. Initially compose the saved-template list and CRUD entry points in `src/app/planning.tsx` so the editor is reachable directly at `/planning` before tab integration. Add a backward-compatible non-scrolling content option to `Sheet.tsx` so the editor can own one keyboard-aware `FlatList` without nesting a virtualized list in its ScrollView. Keep only one confirmation/editor modal active at a time and preserve the draft on canceled discard. Create `tests/e2e/planning.spec.ts` for create/edit/add/reorder/remove/cancel/bounds flows. Sources: R1/D2/D5/A1, C7/C8/C13. Logging: no input/draft/success logs; use inline Romanian validation. Dependencies: 2/4.

- [ ] **Task 11 — Build the Planificare execution controls.** Extend `src/app/planning.tsx` and create `src/components/PlanningRunCard.tsx` for active/current/next action, remaining time/total progress, start/pause/resume/reset/restart, protected active templates, deletion, and confirmed atomic replacement. Use the global controls and local display refresh only; retain all templates after run reset. Extend planning browser scenarios for multiple saved schedules, one active run, independent clocks/history, canceled/confirmed replacement, and persisted pause/resume. Sources: D2–D5/A1, C4–C9. Logging: no rendering/timing logs; recoverable action rejection gets brief visible feedback. Dependencies: 8/10.

- [ ] **Task 12 — Project schedule/audio feedback across routes and sheets.** Add `src/components/PlanningNotice.tsx` and `TimingNotices.tsx`; compose existing timer completion, current schedule transition/final completion, and `Oprește sunetul` through `_layout.tsx` and `Sheet.tsx`. Match error state by owner/event, retain other toasts, and keep open editors/details/confirmations usable. Extend browser scenarios for expiry and Stop inside Settings, schedule editor, details, and confirmations; include coinciding timer/schedule notices and a successful next event after failure. Sources: D4/P1/F1/A1, C3/C4/C9–C11/C13. Logging: no notice/render logs; display the already-reported current failure once. Dependencies: 7–11.

### Phase 4: Navigation, Regression Gates, and Documentation

- [ ] **Task 13 — Integrate the fourth tab and mobile appearance.** Update `_layout.tsx` tab map/order, `src/components/Icon.tsx`, running indicators, and any necessary semantic styles for Planificare. Preserve route/provider identity during theme changes; fit four tab labels, notices, and editor controls at 320/430/1024px. Extend `tests/e2e/theme.spec.ts` and planning/sound specs for both palettes, long names, focus, scrolling, safe areas, and readable selected/disabled states. Sources: R1/A1/P1, C9/C13. Logging: no navigation/theme/render logs. Dependencies: 9–12.

- [ ] **Task 14 — Complete the cross-feature regression paths.** Extend `tests/e2e/helpers.ts`, `timer.spec.ts`, `planning.spec.ts`, and `sounds.spec.ts` to cover C1–C13 end to end. Include the literal legacy-v1 fixture and the actual existing Classic WAV through hydration, selection, timer completion, preserved history/preferences, and reload; fetch/decode all four shipped assets. Use `page.clock.install`/`pauseAt`/`runFor` for deadlines, advancing modal fades before selecting elements. Distinguish play/pause invocation assertions from audible-device evidence. Preserve both timer fixes and all prior stopwatch/theme/timer scenarios. Sources: R1/D1–D5/P1/F1/A1, C1–C13. Logging: fail on page errors/unhandled rejections; expected recovery WARNs remain observable without recording private data. Dependencies: 9–13.

- [ ] **Task 15 — Run automated checks and evaluate device behavior.** Refresh the command catalog/hashes, run lint, typecheck, all registered Node tests, the full browser suite, and all-platform export. Inspect any failure before continuing; do not run overlapping Playwright processes. Verify the playback-only app configuration remains intact. On available iOS/Android devices, check all sound choices/durations, Stop, silent mode, routing, keyboard/editor behavior, wake OR logic, and locked/background return. Record actual pass/fail/pending in plan progress; unavailable devices remain explicitly pending, and browser/export success cannot mark them passed. Sources: A1/P1, C1–C13. Files: verification commands above, `app.json` read-only unless a demonstrated defect requires correction, plan progress. Logging: retain minimal runtime logging; investigate current WARN/ERROR without adding routine traces. Dependencies: 14.

- [ ] **Task 16 — Complete the mandatory documentation checkpoint.** Route documentation through `$aif-docs`: update `README.md` with Romanian control names, sound durations/interruptions, a schedule example, limits, saved-data compatibility, foreground-only delivery, and actual validation status. Synchronize the repository map and project context in `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, and `.ai-factory/ARCHITECTURE.md` through their owner workflow. Describe pending native checks honestly; preserve known unrelated findings. Do not create a separate summary/report document. Sources: R1/D1–D5/P1/A1, C1–C13. Logging: documentation-only work adds no runtime logs. Dependencies: 15.

## Commit Plan

These are implementation checkpoints, not authorization to commit the existing mixed working tree. Keep each proposed diff concrete and preserve the original staged snapshot; use `$aif-commit` when a commit is requested.

- After tasks 1–4: `feat: define selectable sounds and persisted action schedules`
- After tasks 5–8: `feat: coordinate bounded alerts and schedule execution`
- After tasks 9–12: `feat: add sound settings and schedule management`
- After tasks 13–16: `feat: integrate planning navigation and regression coverage`

## Completion Criteria

- Users can select/preview a saved sound and 5/15/30-second playback in Settings, with a reachable early-stop control and recoverable failure feedback.
- Users can create multiple named schedules, edit ordered action durations, and execute one sequence automatically with a sound at every timely boundary and one final sound.
- Running/paused state, templates, and new preferences survive reload/relaunch while existing clocks/history/theme remain intact. Background catch-up is silent and deadline-based.
- All supported combinations have the listed regression evidence; required automated checks pass; physical-device results are reported separately. Documentation reflects the implementation and remaining limits.
- No application implementation begins as part of this planning invocation. Next workflow: `$aif-implement`.
