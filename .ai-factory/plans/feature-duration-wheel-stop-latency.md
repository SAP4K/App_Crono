# Implementation Plan: Duration Wheel Stop-to-Action Latency

Branch: `feature/duration-wheel-stop-latency`
Created: 2026-11-19
Mode: full
Status: Implemented and verified on Android. Some samples exceed the 100 ms target. Physical iOS testing is still open.
Base: `origin/master` at `143b14ff983d2d2f0215c2b1d867460e0e7f9592`

## Original Request

bagul nu sa rezolvat, cand fac scrol la ora, minute, secunde, fie in timer sau planificator, cand se ajunge la cifra care sa fie setata, apare un lag timp de o secunda si dupa se activeaza butonul de setare al timpului

## Settings

- Testing: yes
- Logging: minimal (WARN/ERROR in the shipped app)
- Docs: yes

## Investigation Evidence

- The base contains the full-width picker and performance changes from PRs #27 and #28. The earlier settlement plan, `.ai-factory/plans/feature-responsive-wheel-settlement.md`, records browser results and a pending physical stop-to-action check.
- Both screens use `src/components/DurationWheel.tsx`. A verified manual end goes through `src/hooks/wheelSettlement.ts` and `src/hooks/useDurationWheel.ts` to `src/hooks/durationWheel.ts`. The controller publishes the final value before clearing busy in the same call. `src/components/DurationPicker.tsx` clears combined busy after the last moving column has settled. Timer Start/Restart and Planning Apply also check the latest values and movement in their handlers.
- The controller uses a 160 ms ordinary idle fallback and a 1,000 ms fallback for recognized momentum, renewed on movement. With an active native gesture, manual confirmation requires a verified release and a usable end timestamp at least as recent as the gesture's latest observed timestamp. The native touch-release callback and the scroll-end-drag callback provide different evidence.
- A planning-time virtual clock reproduced the full 1,000 ms wait with both a missing end and a delivered end rejected after touch release alone. With an accepted end, value and busy callbacks occurred at 0 ms on the same virtual clock. The existing missing-end regression in `tests/nativeWheelSettlement.test.ts` also passed. The phone's event sequence and actual latency still need measurement.
- In the installed React Native 0.86.3 Android source, `ReactScrollView.java` waits for repeated stable polls before emitting momentum end. Movement resets that counter. `ReactScrollViewHelper.kt` uses a 20 ms poll delay, and `ScrollEvent.kt` timestamps the events in native uptime milliseconds. Capture native event order and JavaScript receipt order in their respective clocks. On iOS, include a release with no deceleration because the native adapter can receive a drag end without a momentum end.

## Requirements Reconciliation

Authority: the user's report defines the symptom. The prior wheel plan, current callers and repository architecture define existing gestures, acceptance and lifecycle behavior to preserve.

| Requirement | Source | Verification |
|---|---|---|
| Prompt action after a genuinely stopped hour, minute or second wheel in both screens | Original Request, `DurationPicker.tsx` | Physical stop-to-accept timing for each of the six caller/column combinations and a working press with the displayed duration |
| Preserve the gentle glide, row centering and genuine motion gate | Prior settlement plan, `README.md` duration selector, `durationWheel.ts` | Slow release and ordinary flick before/after, long coasts, held drag, reversed direction, two moving columns |
| Publish the final value before unlocking the last column and accept it once | `wheelSettlement.ts`, `durationWheel.ts`, both callers | Deterministic replay plus first eligible press using the exact value, old and duplicate callbacks fenced |
| Preserve presets, explicit choices, interruption and validation | `DurationWheel.tsx`, `DurationWheel.web.tsx`, `wheelPresentation.ts`, Timer and Planning | Preset and takeover, accessibility/keyboard, endpoints, same-value result, zero rejected, close/background/disable |
| Apply updates the Planning draft, Save persists it and Cancel discards the pending edit | `ScheduleEditorSheet.tsx`, `tests/fixtures/app-v1-before-planning.json` | Planning editor flow and the existing literal legacy edit/backup/import/reload journey |

Meaning preservation: PASS. The plan covers the stop-to-action delay for all three columns in both screens and retains the established glide. The 100 ms acceptance target is an engineering target selected for this plan.

## Tasks

### Phase 1 — Identify and reproduce the delay

- [x] **Task 1. Measure the failing native event sequence and capture a regression.**
  - Use a source-identified Android release build and record the affected phone's model, OS, build and motion setting. Compare the final centered stationary row by position, independently of selection color. Record release, last visible movement, native end dispatch and JS receipt, adapter decision and reason, controller phase and fallback, alignment command, accepted value, busy, rendered enabled state and actual press acceptance. Use a synchronized frame recording or common trace marker to relate the visual and event measurements. Profile JS/render work if the confirmed end already reaches the controller promptly.
  - Inspect `src/components/DurationWheel.tsx`, `src/hooks/wheelSettlement.ts`, `src/hooks/useDurationWheel.ts`, `src/hooks/durationWheel.ts` and the existing React Native ScrollView implementation. Check for continued native movement, a late or missing end, a rejected current-gesture release/end, or slower enabling after selection. Distinguish the manual recovery timer from the preset presentation timer.
  - Reproduce the observed failure before changing production code. Use `tests/nativeWheelSettlement.test.ts` and `tests/durationWheel.test.ts` for an adapter/controller event-order case, or a focused integration check if the trace identifies a rendering issue. Use the known 1,000 ms case as a comparison. If the baseline phone trace is unavailable, record that acceptance as pending and distinguish any proven source defect from the reported device symptom.
  - Logging: bounded diagnostic trace in ignored `.expo/` output with offsets and event IDs. Keep user records and shipped per-frame logs out of the trace. Depends on: none. Sources: reconciliation rows 1–3.

### Phase 2 — Correct the measured delay

- [x] **Task 2. Settle the shared wheel promptly from reliable evidence.**
  - Fix the smallest boundary justified by Task 1. Likely files are `src/components/DurationWheel.tsx`, `src/hooks/wheelSettlement.ts` and `src/hooks/useDurationWheel.ts` for rejected manual evidence, or `src/hooks/durationWheel.ts` if the phase transition is the cause. Investigate the affected caller or render path if acceptance is already prompt. Consider a platform-native completion signal only if the measured ScrollView path cannot establish a timely current-gesture stop.
  - A verified current stop publishes the final row once, before busy clears. Keep the bounded fallback for ambiguous or undelivered evidence. Preserve native deceleration and snapping, stale-event fences, preset ownership and aggregate busy. Zero velocity, an aligned offset or a short gap in JS scroll events alone is insufficient proof of a stop.
  - Assert the failing case now settles without waiting for recovery. Also check long coast, newer drag, duplicate terminal, cancellation, disabled state and a delayed update across overlapping columns.
  - Logging: retain WARN/ERROR handling and remove temporary event tracing from shipped code. Depends on: Task 1. Sources: reconciliation rows 1–4.

### Phase 3 — Verify the fix and document the evidence

- [x] **Task 3. Verify native timing and shared user flows.**
  - Compare matched Android release builds with five slow releases and five ordinary flicks per caller/column. Report stop-to-enabled median, p95, maximum and frame resolution. Target at most 100 ms from the final visibly stationary row to a usable button for each valid sample. Report release-to-stop separately so changing the glide cannot hide the lag. Confirm a press during genuine movement is rejected and the first eligible press uses the displayed value.
  - Cover iOS no-deceleration and momentum gestures on available hardware, and web wheel/trackpad/touch, reduced motion and keyboard paths through `tests/e2e/durationInertia.spec.ts`, `tests/e2e/durationPicker.spec.ts` and `tests/e2e/timerPresetMotion.spec.ts`. Also verify a held or reversed gesture, endpoints, two columns, preset and new-drag takeover, close/background/disable and same-value or zero result. Exercise Planning Apply/Cancel/Save and legacy data through the existing fixture-backed edit/backup/import/reload test. Record any untested platform separately.
  - Logging: summarize timings and failures in the plan, using synthetic test data. Depends on: Task 2. Sources: reconciliation rows 1–5.
- [x] **Task 4. Run the final checks and update the affected documentation.**
  - Complete the `$aif-docs` checkpoint for `.ai-factory/ARCHITECTURE.md` duration settlement. Update `README.md` only if user-visible guidance changes. Record baseline and candidate build identities, test results and any phone validation still pending in this plan.
  - Run lint, typecheck, the registered unit suite, a fresh export and focused browser checks. Keep diagnostic traces and binaries in ignored output.
  - Logging: summarize check results and real failures. Depends on: Tasks 2–3. Sources: reconciliation rows 1–5 and `AGENTS.md`.

## Verification Commands and Source Identity

Command discovery used `ai-factory commands --json` in repo root. Catalog revision SHA256 `5a3a8d34ba3dcd048884e3daf2b0542eb4912f485097b6ca1d43081e4ac9386c`. Source SHA256 values are `b9f612adb5db2acb1bc14a4e20f85349fcb171d2723ad23f70c02ccb2d332334` for `package.json` and `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66` for `package-lock.json`. Refresh the catalog if either changes.

| Command ID, CWD `.` | Windows PowerShell command |
|---|---|
| `package.json#/scripts/lint` | `npm.cmd run lint` |
| `package.json#/scripts/typecheck` | `npm.cmd run typecheck` |
| `package.json#/scripts/test` | `npm.cmd test` |
| `package.json#/scripts/export` | `npm.cmd run export -- --output-dir .expo/duration-wheel-stop-export` |
| `package.json#/scripts/test:e2e` | `npm.cmd run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts --workers=1` |

## Planning Baseline

- Lint, typecheck and all 58 focused wheel/controller/picker tests passed on the merged base. The virtual-clock probe ran without modifying tracked code.
- The physical comparison and implementation evidence are recorded below.

## Implementation Evidence

- Task 1. The installed Redmi Note 9 Android 12 APK (SHA256 3f98697982b88186a7ca97b3f0fb2a9ab1d04f6c70d210362380ad8358eb8272) showed a visible stop-to-enabled gap of 285–547 ms in ten minutes gestures and 322–406 ms in six hours/seconds gestures in the unsaved Planning duration panel. Frame sampling excluded changes in selection tint. Raw evidence is in the ignored .expo/duration-wheel-stop directory.
- An isolated release of the merged source with bounded tracing (SHA256 cdc56a6ae51b026bdd74cb8bcbd7d07c632944ab894a91ed314d64ea564a3262) showed an unchanged native offset for 181–199 ms before Android emitted momentum end on four Timer samples. The adapter verified that end. Its delay preceded selection and busy callbacks, and it did not use the one-second watchdog. The finished Android snap y was also short of the correct layout row, accumulating about 0.18 dp per row on the phone's 2.75 density. During the seconds flick the last native offset was 1195.64 dp for row 24 and the JS controller and controlled-prop echo both attempted to align to 1200 dp. The registered alignment regression failed on the original code with both commands recorded.
- Task 2. Android per-row snap offsets remove the accumulated pixel rounding error. The optional local Expo module observes the current release and its native fling on the UI thread. It delivers a verified stationary position to the existing controller. Gesture ownership, timestamp and layout retry tests cover the async path and duplicate commands. Regular native momentum end and the bounded recovery are available for unsupported or ambiguous input. The shipped source uses the existing framework log policy and has no diagnostic trace.
- Task 3. On the same Android 12 Redmi Note 9, the available release builds ran the same scripted slow releases and flicks across all six caller/column pairs. Video sampling varied over time and used digit movement and button fill. Native event traces show about 50 ms from the last native scroll to early selection in the two initial candidate trials, approximately 149 ms before the ordinary momentum end was received. Physical action checks on the clean build rejected presses during a coast. Timer started with the selected 03:17:20 and Planning placed 02:01:14 in its draft. The test Timer was reset afterward.

| Caller | Column | Baseline n | Baseline median / p95 / max (ms) | Clean n | Clean median / p95 / max (ms) |
|---|---|---:|---:|---:|---:|
| Timer | Hours | 10 | 350.8 / 381.6 / 381.6 | 5 | 116.5 / 130.6 / 130.6 |
| Timer | Minutes | 10 | 387.6 / 404.4 / 404.4 | 6 | 119.0 / 134.7 / 134.7 |
| Timer | Seconds | 10 | 399.3 / 411.9 / 411.9 | 6 | 127.2 / 140.0 / 140.0 |
| Planning | Hours | 9 | 336.0 / 352.6 / 352.6 | 5 | 117.2 / 136.0 / 136.0 |
| Planning | Minutes | 9 | 371.3 / 386.6 / 386.6 | 5 | 152.0 / 166.2 / 166.2 |
| Planning | Seconds | 9 | 369.1 / 382.2 / 382.2 | 5 | 137.4 / 169.9 / 169.9 |

The instrumented candidate had 56 measurable gestures and the clean candidate had 32. The clean visible ranges were 49.7–140.0 ms for Timer and 66.2–169.9 ms for Planning. A few attempts at endpoints lacked detectable travel and were excluded. These are frame-based timing estimates. The 100 ms engineering target was only partially met. Physical iOS testing remains pending.

- Task 4. The architecture, project structure and entry points describe the Android observer. Lint, typecheck, 322 Node tests and the fresh Android/iOS/web export passed. The clean device APK is an arm64-v8a development-signed release for the separate Android package `ro.appcrono.wheelstoptest`. Its SHA256 is `3a4d27b48cdb374e8c7001d28e2224beb91dbb07e77fd9e40ed9aee040bd8ed8`. The installed hash matched and the build source map matched the relevant production files without the diagnostic module. Ignored artifacts are under `.expo/duration-wheel-stop/`.
- Browser coverage. The broad run passed 129 of 130 cases. Its legacy fixture has no Planning object, so the persistence poll now tolerates that initial state while still requiring the exact saved duration. The fresh focused run passed 23 of 24 cases, including the fixture, Apply/Cancel, exact-duration persistence and backup/import/reload. The Timer fast-flick travel assertion was intermittent on this run and passed twice in three isolated repetitions. Five isolated repetitions on the pre-change export passed.
