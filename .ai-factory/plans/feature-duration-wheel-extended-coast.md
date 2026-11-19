# Implementation Plan for a Longer Duration Wheel Coast

Branch: `feature/duration-wheel-extended-coast`
Created: 2026-11-19
Mode: full
Status: Implemented and verified
Base: `4ae6fd006be9eeefa9177623de30003ed4f31943`, the merge of [PR #32](https://github.com/SAP4K/App_Crono/pull/32) into `master`

## Original Request

fa te rog inca mai lung in timp, cand fac scrol sa se opreasca inca in mai mult timp

## Settings

- Testing: yes
- Logging: minimal production logging with opt-in traces during verification
- Docs: yes, update the existing duration selector documentation

## Requirements Reconciliation

The Original Request extends the time until the wheel actually stops. Use PR #32 as the reference for the fast launch, the gradual brake, the 3–5% near-row speed and the action gate. The proposed target is about 20–25% more time from release or the last wheel event to the first centered frame on representative fast gestures. Measure the low-speed approach and button readiness separately. The scope covers the Android and browser mouse-wheel or trackpad paths for hours, minutes and seconds in Timer and Planning.

| Supported combination | Source | Verification evidence |
| --- | --- | --- |
| Representative fast Android flicks and browser impulses or compatible bursts take longer to reach the same centered row. Use the observed launch speed and a brief initial ramp. Pass through 3–5% of launch speed while still approaching the row. | Original Request and [PR #32 requirements](feature-duration-wheel-longer-braking.md#requirements-reconciliation) | Compare matched input, geometry, direction, target and launch across builds. Measure last input to first centered frame and the positive distance where speed reaches the band. |
| Large or clipped fast inputs use a bounded fit. Ordinary adjustment, short travel, explicit choices, Reduce Motion, iOS and browser touch use their established paths. | [Picker architecture](../ARCHITECTURE.md#display-and-device-behavior) | Test both directions, smaller and larger deltas, endpoints, one-row moves, keyboard, presets and platform touch. Record the gain separately for cap-limited cases. |
| Start, Restart and Apply accept the valid centered value after all manually moving columns settle. A new gesture or another explicit action can take over during the added interval. | [Verified action behavior](feature-duration-wheel-longer-braking.md#follow-up-implementation-evidence) | Tap with motion still pending after the old stop time. Check first eligible presses, overlap, Planning Cancel, late reversal, preset takeover and stalled-frame recovery. Planning still saves the draft through its explicit Save action. |

Meaning preservation: PASS. The new target lengthens the elapsed time to the actual stop while preserving the reference speed profile and action behavior. The percentage is a proposed tuning target for representative inputs.

## Baseline Evidence

- PR #32 recorded seven eligible fast Android flicks per screen. Median release-to-target time was 1,011 ms in Timer and 993 ms in Planning. Its isolated APK SHA-256 was `c98569d82bb902ecdf139ff608c1ba1fc17f58da5843e44162a3293a52295dfe`. Six rendered browser cases reached the centered row at a median of 902.8 ms after input. The buttons became available in the same sampled browser frame. Preserve these artifacts before retuning. [PR #32 recordings and verification](feature-duration-wheel-longer-braking.md#follow-up-implementation-evidence)
- The native curve limits the 4% approach to 20% of a row, 500 ms and a total 1,300 ms envelope. The browser fast curve fits within 1,250 ms and its approach within 525 ms. The native and web writers already finish at the first committed target pixel. The browser recovery deadline is 940 ms since the last successful frame, before the controller's 1,000 ms idle watchdog. [Android curve](../../modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/DurationWheelRelease.kt) · [Web curve and recovery](../../src/hooks/wheelDeceleration.ts) · [Shared controller](../../src/hooks/durationWheel.ts)
- Modeling a 1,467 physical-pixel Android flick at about 2.85 px/ms suggests moving the 4% checkpoint from 27.5 to roughly 42–44 physical pixels. The predicted first centered pixel goes from about 0.98 s to 1.20–1.23 s. Modeling the six-row browser case at 44 CSS-pixel rows suggests roughly 5.5–5.8 CSS pixels at the checkpoint. The predicted first centered pixel goes from about 0.88 s to 1.07–1.11 s. These figures guide calibration. Rendered captures establish the actual change.

## Tasks

### Phase 1 — Measure and fit the longer curve

- [x] Task 1 — Establish the PR #32 comparison and timing regressions.
  - Use the existing native trace and browser frame recorder to confirm matching launch, direction, target and geometry. Measure release or last wheel event to the first centered frame. Record the 3–5% checkpoint, last detected glyph movement and action enablement separately. Record the test that shows the PR #32 curve settles before the new representative timing range. Use the literal saved schedule or backup fixture for the persistence path.
  - Files `tests/wheelDeceleration.test.ts`, `tests/e2e/durationInertia.spec.ts` and `modules/crono-duration-wheel/android/src/test/java/ro/appcrono/durationwheel/DurationWheelReleaseTest.kt`. Log input, baseline identity, rendered offsets and completion in opt-in traces and ignored test artifacts. Prefer full-resolution sampling for the last Android pixels when the device can capture it.

- [x] Task 2 — Fit the longer Android fast coast (depends on 1).
  - Keep the current ordinary eligibility and 1,300 ms base limit. For a release that already has a usable fast approach, shift a proportional amount of its travel into the low-speed phase. Use the existing integrated velocity segments and the same launch, peak and snap target. A starting fit adds 23% of the prior nominal duration divided by the extra time per pixel moved from braking into the approach. Tune by rendered duration. Start calibration near 32% of a row and a 780 ms approach bound. A separate fast-only envelope around 1,450 ms is enough in the representative model. Clamp the extension to available geometry and time.
  - Use the existing native frame owner and completion on the first actual target pixel. Confirm bounded recovery, direction, monotonically decreasing speed after the peak, the 3–5% checkpoint and a clean cancellation when new input takes over after the old stop time. Files `DurationWheelRelease.kt`, `CronoDurationWheelModule.kt` if needed for the trace and `DurationWheelReleaseTest.kt` under the Android wheel module. Reuse the opt-in native release tag for peak, checkpoint, target and completion.

- [x] Task 3 — Fit the longer browser fast coast (depends on 1).
  - Reuse the cancelable wheel driver. Adapt the fast approach to the elapsed-time target while preserving compatible carried speed and the selected row. For the representative profile, start around 15% of the row as a geometry limit, about 790–835 ms for the approach and around 1,400–1,450 ms for the fast total limit. Keep ordinary adjustment within 900 ms. Allow the largest impulses a smaller extension when they reach the fast cap.
  - Finish on the first rendered target and restore snap once. Preserve the 940 ms stall deadline from the last successful frame and the nominal-duration recovery margin. Verify healthy frames after the old stop time, a freeze after one second, reversal in the extra interval, small deltas, compatible bursts, keyboard choices and reduced motion. Test the 3–5% ratio at the calibrated checkpoint. Files `src/hooks/wheelDeceleration.ts`, `src/components/DurationWheel.web.tsx` if needed for terminal integration, `tests/wheelDeceleration.test.ts` and `tests/e2e/durationInertia.spec.ts`. Reuse browser frame attachments and bounded motion warnings.

### Phase 2 — Verify the actual stop and update documentation

- [x] Task 4 — Verify on both screens and document the result (depends on 2, 3).
  - Rebuild an isolated Android release and export the web bundle. Replay the same inputs on both screens, with all three columns and both directions represented. Compare release-to-first-center time with PR #32. Confirm the 3–5% approach, exact centering, correct action on the first eligible press, and normal response to late Cancel or a preset. Report median, p95 and maximum for center-to-ready separately. Investigate delays against the existing 100 ms engineering target and record optical measurement limits.
  - Run the planned checks, including the actual legacy backup fixture and overlapping motion, small/end-range adjustments and preset tests. Keep the previous build and recordings intact. Update the duration selector in `README.md` and the curve and recovery description in `.ai-factory/ARCHITECTURE.md`. Use ignored, opt-in test artifacts for timing, APK identity and recovery diagnostics. Report physical iOS availability separately.

## Verification Commands and Source Identity

The `ai-factory commands --json` revision SHA-256 is `5a3a8d34ba3dcd048884e3daf2b0542eb4912f485097b6ca1d43081e4ac9386c`. The source SHA-256 is `b9f612adb5db2acb1bc14a4e20f85349fcb171d2723ad23f70c02ccb2d332334` for `package.json` and `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66` for `package-lock.json`. Run the package commands from the repository root.

| Command ID | Command |
| --- | --- |
| `package.json#/scripts/lint` | `npm.cmd run lint` |
| `package.json#/scripts/typecheck` | `npm.cmd run typecheck` |
| `package.json#/scripts/test` | `npm.cmd test` |
| `package.json#/scripts/test:e2e` | `npm.cmd run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/backup.spec.ts --workers=1` |
| `package.json#/scripts/export` | `npm.cmd run export -- --output-dir .expo/duration-wheel-extended-coast-export` |

Run `:crono-duration-wheel:testReleaseUnitTest` and `:app:assembleRelease` using the existing staged Android project. Verify the isolated APK identity before measuring on the device.

## Implementation Evidence

- The unchanged PR #32 curve failed the new release-to-center regression on Android (982 ms versus the required 20–25% gain) and four browser unit checks for the checkpoint, timing and late reversal. Six rendered browser cases also failed the new 1,050 ms minimum, reaching center in 902.5–903.1 ms. The baseline APK on the phone matched its archived SHA-256.
- The extended coast keeps the previous eligibility and uses a 23% nominal time extension where the geometry and time budgets permit. The Android release and eight native unit tests passed. The 20 browser driver tests and six focused rendered profiles passed on the fresh export. The driver regressions cover the longer approach in both directions, exact pixel completion, takeover and planned-deadline recovery after a late frame stall.
- The isolated Redmi Note 9 release on Android 12 matched APK SHA-256 `1e1455151c70e49e03746064345510654b260620798ba0b094f4758ab4e07b35`. All 14 eligible fast flicks reached the exact native target. Median release-to-target time went from 1,011 to 1,193 ms in Timer and from 993 to 1,240 ms in Planning across seven fast samples per screen and build. Four same-target comparisons with launch speeds within 1% and displacements within 30 physical pixels gained 21.4–24.9%. The 4% checkpoint moved from about 27.5 to 38.0–42.8 physical pixels before the target in the updated capture.
- At 540 × 1170, last detected glyph movement to action readiness across 15 samples per screen measured median/p95/max of 66.7/181.1/181.1 ms in Timer and 132.4/182.7/182.7 ms in Planning. The Planning median exceeded the 100 ms engineering target on this optical metric. At full 1080 × 2340, the minute glyph visibly moved one more physical pixel after the offset that looked stationary in the half-resolution comparison. The single full-resolution centered-to-ready sample per screen measured 68.5 ms in Timer and 83.0 ms in Planning, with timing limited by recording cadence. Traces show the native writer published completion on the first committed target pixel.
- On Android, the approximately one-second-after-release taps fell inside the slow approach and left Timer idle and the Planning panel open. The first eligible taps started `00:17:00` and applied `03:16:02` to the draft respectively. A ten-minute preset took over during the added interval and left Start available. Planning Cancel during that interval dismissed the panel and preserved the `00:05:00` draft. Native traces confirmed both takeovers cancelled the coast before center.
- The six rendered browser profiles reached the same centered row at a median of 1,097.3 ms versus 902.8 ms on PR #32, about 21.6% longer. Across hours, minutes and seconds on both screens, the first centered frame also showed the updated value and available action. Recorded stop-to-ready median/p95/max were 0/0/0 ms at frame sampling precision.
- Lint, typecheck, all 327 Node tests, all eight native unit tests, the isolated Android release assembly and all 156 planned Chromium cases passed. The browser run had no retries or skips and exercised the literal legacy backup through duration editing, save, reload and actual backup transfer. Android, iOS and web exports succeeded. iOS coverage consists of the export. The README and architecture documentation describe the updated behavior.
