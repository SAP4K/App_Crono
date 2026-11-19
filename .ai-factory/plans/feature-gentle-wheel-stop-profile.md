# Implementation Plan: Gradual Duration Wheel Deceleration

Branch: `feature/gentle-wheel-stop-profile`
Created: 2026-11-19
Mode: full
Status: Implemented and verified on Android and web. Physical iOS testing is pending.
Base: `origin/master` at `3781ea7c90e1d34ea02419c9e3f8445b11caf7dc`, including PR #29

## Original Request

poti te rog treptat sa scazi viteza, incetul cu incetul cand fac scrool la oral, minute, secunde...

## Settings

- Testing: yes
- Logging: minimal (WARN/ERROR in the shipped app)
- Docs: yes

## Investigation Evidence

- Timer and Planning both render the three columns through `src/components/DurationPicker.tsx`. Native `DurationWheel.tsx` uses a platform ScrollView with Android per-row snap offsets, iOS interval snapping, and current rates of `0.99575` on Android and `0.99915` on iOS.
- The installed React Native 0.86.3 Android implementation ties the rate to friction and uses it to predict the fling distance. `ReactScrollView.java` may adjust release velocity toward a snap row and constrain the `OverScroller` fling to that row. Android can shorten its deceleration curve at a bound. An abrupt last step could also come from the wheel's final alignment in `wheelSettlement.ts`. Distinguish these possibilities on device before choosing a change. On iOS, `RCTEnhancedScrollView.mm` retargets the destination and `UIScrollView` owns the glide. [React Native ScrollView](https://reactnative.dev/docs/0.86/scrollview#decelerationrate) · [Android 12 OverScroller source](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android-12.0.0_r1/core/java/android/widget/OverScroller.java)
- The web path already applies a cubic ease-out to eligible mouse and trackpad events in `src/hooks/wheelDeceleration.ts`. It has a deterministic six-row case at 607.5 ms and a frame-profile test in both callers. Touch panning and noncancelable input use the browser's scrolling and snapping.
- The merged Android build reached stop-to-enabled median/max of 98.9/120.3 ms in Timer and 114.9/121.0 ms in Planning on the Redmi Note 9 running Android 12. The 100 ms target was met in 16 of 32 samples. These are historical button-latency measurements. The new baseline needs frame-by-frame glide measurements. [Previous measurements](../patches/2026-11-19-01.35.md#verification)

## Requirements Reconciliation

Authority: The original request defines the desired slowing. The preceding wheel fix, current callers and existing tests define the selection, interruption and button behavior. Interpret the request as easing after release and keeping direct dragging responsive while the finger is down.

| Decision / supported combination | Source | Verification |
| --- | --- | --- |
| A manual glide slows progressively as it approaches the selected row, for hours, minutes and seconds in both Timer and Planning. The gesture stays inside the existing column bounds of hours 0–23 and minutes/seconds 0–59. | Original Request, `src/components/DurationPicker.tsx`, `src/core/durationPicker.ts` | Matched slow and fast gestures in both directions for each screen and column, with interior, near-end and endpoint cases. Compare speed and centering before and after. |
| A held drag follows input. Released motion keeps the pending value and gates the action while any wheel is moving. On verified stop, publish the exact centered row once before enabling the action. | `src/hooks/durationWheel.ts`, `src/hooks/wheelSettlement.ts`, `.ai-factory/patches/2026-11-19-01.35.md` | Attempt a real press during motion and again on the first eligible frame. Exercise overlapping wheels, the Android observer and its fallback, same-value outcomes, and zero-duration validation. Compare stop-to-enabled separately from the glide. |
| A reversal, new drag, explicit row choice, keyboard/accessibility adjustment or Timer preset takes over from the current interaction. Route exit, backgrounding and geometry changes cancel obsolete motion. Respect existing Reduce Motion behavior for preset and browser interpolation, and the platform policy for touch. | `src/components/DurationWheel.tsx`, `src/components/DurationWheel.web.tsx`, `src/hooks/useDurationWheel.ts`, `src/hooks/wheelPresentation.ts` | Existing unit and browser takeover tests and native smoke. Check that a late completion cannot overwrite a new selection. |
| Timer Start/Restart uses the final valid duration. Planning Apply updates the current draft, Save persists it and Cancel discards the pending change. | `src/app/timer.tsx`, `src/components/ScheduleEditorSheet.tsx`, `tests/fixtures/app-v1-before-planning.json` | First eligible press uses the displayed duration. Exercise the real legacy fixture through duration edit, save and reload, plus reviewed backup export/import. |

Meaning preservation: PASS. The plan covers progressive slowing for each requested column and carries forward the merged stop-to-action behavior.

## Tasks

### Phase 1 — Measure the present glide

- [x] Task 1: Capture and reproduce the visible slowing on the merged base.
  - Use the previous Android device when available and match the OS, build mode, display settings, starting row, swipe direction, travel and release speed across runs. Record representative slow releases and brisk flicks in both screens, with all three columns and both directions covered. Include a held drag, a one-row choice, an interior glide and a swipe at either bound. Profile iOS separately if a device is available.
  - Capture the rendered row position by frame from release through stop, the actual native terminal and the first enabled action frame. Correlate visible movement with snap target, native completion and any final alignment. Record rows traveled, the final alignment error, release-to-stop and stop-to-enabled, with sample counts and measurement resolution. Use one clock per interval or align the video and event clocks explicitly.
  - Files and evidence: `src/components/DurationWheel.tsx`, `src/hooks/wheelSettlement.ts`, `modules/crono-duration-wheel/`, `tests/e2e/durationInertia.spec.ts` and the prior patch. Logging: use local opt-in frame/event traces or video. Keep high-frequency output in ignored artifacts and leave shipped log levels at WARN/ERROR.

### Phase 2 — Tune the measured approach

- [x] Task 2: Adjust the glide where the baseline shows an abrupt approach (depends on 1).
  - Start with the shared native wheel and try the smallest platform-specific change supported by the trace. Compare short-drag precision, rows traveled on a brisk flick, early/middle/late speeds and the displacement on the last moving frame. Pick the adjustment from the measured profile. If the native snap target truncates the curve and configuration alone cannot fix the tail, prototype a single platform-native glide to the existing row target with a continuous release, a slowing tail and cancellation tied to the current gesture. Keep one writer for visual offsets throughout the coast. Use a supported cancellation and completion path.
  - Keep the confirmed-stop acceptance and the bounded recovery paths. The Android observer must still verify the current release, an actually finished motion and the committed offset. If a platform-native driver is required, give its terminal event equivalent proof. Keep busy while pixels are moving, publish the value before clearing busy and avoid a final visible corrective jump. Check for regressions where a slow tail produces several frames at the same rounded pixel.
  - Preserve the verified browser curve and browser touch behavior. Change the eligible web wheel path only if a matching trace exposes a gap. Keep explicit selection and preset acceptance independent of manual momentum.
  - Files: `src/components/DurationWheel.tsx` and its platform scroll adapter. Touch `src/hooks/wheelSettlement.ts` or native integration only if the measured cause or terminal contract requires it. Use `src/components/DurationWheel.web.tsx` and `src/hooks/wheelDeceleration.ts` for any confirmed web gap. Logging: reuse bounded WARN/ERROR for recovery and keep profiling opt-in.

### Phase 3 — Verify the result and document it

- [x] Task 3: Recheck the speed profile, final value and action timing (depends on 2).
  - Repeat the matched sample set on a clean release build. For coasts with enough movement, compare speed over early, middle and late windows. Require slowing toward the target, a softer final approach than the reproduced baseline, and no visible kick into the final row. Report short and endpoint gestures separately to account for rounding and coasts that start at a bound. Verify exact logical centering within physical pixel rounding, predictable near-row targeting and immediate response during contact.
  - Treat the established 100 ms physical stop-to-enabled interval as a target. Compare paired baseline and candidate distributions per screen (median, p95 and max) at the same measurement resolution and investigate delays above the baseline variability. Keep actions gated while any column moves, then verify a working first eligible press with the exact value. Repeat with reverse/new touch, two columns, cancellation or navigation, and with the native stop signal unavailable. Record physical iOS separately if available.
  - Run the focused controller/web suites and all commands below. Reuse the existing browser frame-capture helper for any missing column regression, starting six-row checks in the interior of each range. Keep the existing browser centering, timing, reduced-motion, reversal, preset and touch checks. Exercise the literal legacy fixture and Planning Apply/Save/Cancel. For changed native code, also assemble a clean Android release through the existing native build workflow.
  - Files: `tests/wheelDeceleration.test.ts`, `tests/nativeWheelSettlement.test.ts`, `tests/durationWheel.test.ts`, `tests/wheelPresentation.test.ts`, the three E2E specs below and `tests/fixtures/app-v1-before-planning.json`. Logging: retain failing trace and test attachments locally. Keep diagnostic prints out of release success paths.

- [x] Task 4: Record the verified behavior and remaining platform checks (depends on 3).
  - Update the duration-selector sections of `README.md` and `.ai-factory/ARCHITECTURE.md` to describe the release glide and how its completion enables the action. Add build identity, sample counts, comparative timing and evidence locations to this plan. Record the status of physical Android and iOS separately from browser and build checks. Logging: record verification outcomes in the plan, with runtime output at WARN/ERROR for actionable failures.

## Verification Commands and Source Identity

Commands discovered through `ai-factory commands --json` from the repo root. Catalog SHA256 `5a3a8d34ba3dcd048884e3daf2b0542eb4912f485097b6ca1d43081e4ac9386c`. Source SHA256 `b9f612adb5db2acb1bc14a4e20f85349fcb171d2723ad23f70c02ccb2d332334` for `package.json` and `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66` for `package-lock.json`. Refresh the catalog if either source changes.

| Command ID, CWD `.` | Windows PowerShell command |
| --- | --- |
| `package.json#/scripts/lint` | `npm.cmd run lint` |
| `package.json#/scripts/typecheck` | `npm.cmd run typecheck` |
| `package.json#/scripts/test` | `npm.cmd test` |
| `package.json#/scripts/test:e2e` | `npm.cmd run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts --workers=1` |
| `package.json#/scripts/export` | `npm.cmd run export -- --output-dir .expo/gentle-wheel-stop-export` |

## Planning Baseline

- Lint, typecheck and 58 focused unit tests passed on the merged base. The focused command was `node --test tests/wheelDeceleration.test.ts tests/nativeWheelSettlement.test.ts tests/durationWheel.test.ts tests/wheelPresentation.test.ts`.
- New physical glide measurements are pending for Task 1.

## Implementation Evidence

- Task 1. The connected Redmi Note 9 ran Android 12 and the isolated base APK matched SHA256 `6c03f7cb8a9d964be6267db28a92262f118eb2e738b44b3ef80c300be7f44ee2`. Captured alternating 150 px / 420 ms drags and 271 px / 95 ms flicks across the three columns in each screen. Video provided 17 measurable Timer glides and 15 Planning glides at 540 × 1170. The 60 Hz frames during motion showed several slow-release tails still traveling 9–12 recorded pixels per frame just before stopping. Brisk flicks near a bound sometimes moved 15–24 pixels per frame just before stopping. The existing diagnostic log shows a regular finished position and no follow-up visual jump in the journaled samples. The native release profile and the visual button interval are measured independently below.

- Task 2. The native trace captured a 357 px/s finger release with 150 px remaining to the snap row. React Native launched its fling at 1,467 px/s. The Android-only adjustment fits the existing fling to its selected row before the first visible movement. It keeps the same native scroller and terminal confirmation. Native testing exposed Android flywheel velocity carryover in the friction probes, so each probe and the active replacement now start from a finished scroller. The first working fit reduced the penultimate visible step to a median of 2 recorded pixels in both screens. The retained fit extrapolates 2% past the target and clips at the chosen row. A 5% trial produced a slower Timer button median, so the final comparison uses the 2% build.

### Android comparison

The Redmi Note 9 ran Android 12 with a 60 Hz display. Each screen began at 00:05:00 and received the same 150 px / 420 ms drags and 271 px / 95 ms flicks in both directions. Each recording captured 15 measurable glides out of 18 attempts. Endpoints and gestures with insufficient movement were excluded from timing. The late step is the penultimate visible displacement in 540 × 1170 recordings. Stop-to-enabled uses the last moving frame and first enabled frame from the same recording.

| Screen | Median late step, recorded px (base → final) | Stop-to-enabled median / p95 / max, ms (base → final) |
| --- | --- | --- |
| Timer | 10 → 2 | 82.4 / 117.5 / 117.5 → 100.7 / 157.0 / 157.0 |
| Planning | 11 → 2 | 105.0 / 134.8 / 134.8 → 114.0 / 134.0 / 134.0 |

In one representative slow Timer drag, the median frame displacement was 5, 2 and 1 recorded pixels across successive windows after the scripted release. Visible motion lasted about 430 ms after release, estimated from the input duration and the first busy frame. The 100 ms engineering target was met in 11 of 30 final samples. Timer median was 18.3 ms above the matched base and Planning median was 9.0 ms above it. The motion itself is longer and the final action remained usable at the verified centered value. On the retained build, both screens rejected an early press across two coasts. Timer started at 00:17:12 and Planning applied 00:17:12 to its draft. A runtime replay of the production settlement helpers returned null from the early confirmation and accepted the exact row once on the normal momentum end, before clearing busy. The forced-null device build assembled successfully. The physical comparison and action smoke used the retained release.

The retained trace-free APK was `glide-android-release.apk` (test package `ro.appcrono.wheelstoptest`, SHA256 `716b9e24c2d65d917dd4541bc329e84973ba966a433ac848f48aafd008f4344b`). Device installation matched that hash. The Hermes source map matched the Android wheel TypeScript and the staged Kotlin matched the repository. The existing arm64 Android release assembly completed successfully. Videos, profile JSON, build log and the action smoke output are in ignored `.expo/duration-wheel-stop/`.

### Automated verification

Lint, typecheck, 322 Node tests and the focused 58-case wheel run passed. All 134 Playwright cases across the three planned specs passed against the production web export with one worker, zero retries and zero skips. The frame-profile test now covers all six screen and unit combinations. The legacy fixture passed duration editing, persistence, backup export and reviewed import/reload. Android, iOS and web exports passed. Physical iOS verification remains pending.
