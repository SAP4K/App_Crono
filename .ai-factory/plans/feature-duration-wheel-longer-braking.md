# Implementation Plan for Longer Duration Wheel Braking

Branch: `feature/duration-wheel-longer-braking`
Created: 2026-11-19
Mode: full
Status: Follow-up implemented and verified
Base: `46cb4fcd3c8b878772e6b3904da18722e72a1586`, the merge of [PR #31](https://github.com/SAP4K/App_Crono/pull/31) into `master`

## Original Request

imi place cum lcureaza, as dori ca inca mai lent sa scada viteaza, iata flowul:

1) fac rapid;
2) se porneste cu viteza mare;
3) viteza treptat scade;
4) cand ajunge aproape la cifra pana la care sa scrolat, viteza sa fie unde 5-3% din viteza intiala

## Follow-up Request — 2026-11-19

imi place cum arata, poti te rog sa faci acest efect mai lung in timp

## Settings

- Testing: yes
- Logging: minimal in production, with opt-in motion traces during verification
- Docs: yes, update the existing duration selector documentation

## Requirements Reconciliation

The Original Request defines the change to fast scrolling. PR #31 and the current picker establish the gesture handoff, the selected row, interruption behavior and action timing that this refinement must preserve. Use the absolute content velocity at launch as the reference speed, before the existing brief rise to the early peak. On Android use the observed release speed. On web use the app-controlled launch speed in CSS pixels per millisecond and measure carried speed when a compatible input burst retargets. The final approach starts at a positive, visible distance from the center, and the speed at that point is 3–5% of launch speed. Aim for 4% during design and end at zero on the centered row.

| Supported behavior | Source | Verification evidence |
| --- | --- | --- |
| A fast gesture in either direction on hours, minutes or seconds launches promptly. The brief, continuous rise to the early peak leads into a longer braking period with a visible final approach. The same input selects the same legal row. | Original Request and [the prior implementation](feature-duration-wheel-interactions.md#implementation-evidence) | Compare matched quick Android flicks and real browser wheel input with PR #31. Measure launch, peak, the visible near-row checkpoint and exact final offset. Cover Timer and Planning and represent all three units and both directions. |
| The final approach has a measurable positive distance. Start calibration near one tenth of a row and fit the distance to the launch speed, physical resolution and duration budget. Use several rendered pixels where the gesture allows it. The wheel passes through 3–5% at that checkpoint, continues moving, then settles once. | Original Request and the [current Android curve](../../modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/DurationWheelRelease.kt) and [web curve](../../src/hooks/wheelDeceleration.ts) | Check the exact speed ratio in deterministic tests. Use timestamped offset windows spanning multiple frames to establish that the near-row motion is visible and longer than the baseline. |
| Slow manual adjustment, short travel, same-row release and clipped travel with insufficient distance use the established settle. Presets, explicit selection and Reduce Motion retain their behavior. The new profile applies to Android flicks and the app-owned browser mouse-wheel or trackpad path. iOS and browser touch use platform scrolling. | [Picker architecture](../ARCHITECTURE.md#display-and-device-behavior) and [prior platform coverage](feature-duration-wheel-interactions.md#implementation-evidence) | Compare slow and boundary inputs with the baseline. Exercise Reduce Motion, keyboard/row choices, preset takeover, platform touch and fallback builds. |
| Start, Restart and Apply wait for all manually moving columns to finish. They become available when the accepted duration is valid and centered. New input and Cancel can interrupt the glide. Timer presets remain immediately accepted. Planning changes the draft on Apply and persists it on Save. | [Current wheel interaction requirements](feature-duration-wheel-interactions.md#requirements-reconciliation) and [legacy backup fixture](../../tests/fixtures/app-v1-before-planning.json) | Tap each action during the final approach and immediately after the exact stop. Check direction reversal, overlapping columns, planning Cancel and focus, plus a literal legacy save/reload or backup round trip. |

Meaning preservation: PASS. The plan preserves the fast launch, gradual slowdown and 3–5% final-approach request. It locates that measurement before centering so the slow movement can be observed.

The follow-up extends the time spent visibly braking after the early speed peak. Use the verified version in the current working tree as the comparison. The proposed tuning target is about 20–25% more time from the early peak to the first centered frame for representative fast inputs. Approach the target at 3–5% of launch speed while several pixels remain, then settle exactly on the chosen row. Measure button availability separately from the visible movement.

| Follow-up behavior | Source | Verification evidence |
| --- | --- | --- |
| A representative fast Android flick or browser wheel input takes about 20–25% longer to brake after its early peak. The low-speed approach remains visible. | Follow-up Request and [verified timings](#implementation-evidence) | Compare identical input, geometry, launch speed and target. Sample rendered offsets through the early peak, the 3–5% checkpoint and the first centered frame. |
| Slow and short inputs, near-endpoint gestures, Reduce Motion, presets and new input use their established settlement or takeover paths. Fit the extension within the existing fast-motion limits when geometry and measured speed allow it. | [Current Android curve](../../modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/DurationWheelRelease.kt) and [web curve](../../src/hooks/wheelDeceleration.ts) | Test a quick flick and compatible burst, ordinary adjustments, clipped travel, both directions, late reversal, an explicit choice and Reduce Motion. Record how much the largest gestures can extend within the cap. |
| Timer and Planning unlock after the first verified centered frame with a valid duration. An interrupted or stalled glide uses its existing guarded completion path. | [Verified action behavior](#implementation-evidence) and [picker architecture](../ARCHITECTURE.md#display-and-device-behavior) | Record the stop-to-enabled delay independently of braking. Compare median, p95 and maximum, reject taps during the extended approach and confirm the first eligible tap uses the displayed value. |

Meaning preservation: PASS. The follow-up lengthens the effect the user approved. The 20–25% figure is an implementation target for representative gestures.

## Baseline Evidence

- The prior Android model uses the observed signed release speed, an early peak at 1.45 times that speed and one symmetric smooth deceleration. For a representative 1,467 physical-pixel flick at 2.85 px/ms with about 137 px row height, the model reaches 4% with only about 2 physical pixels remaining. The current web model reaches 4% with about 0.18 CSS pixels left on a six-row move with 44 px rows. These are calculations from the curves. Record matched rendered measurements during implementation. [Android curve](../../modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/DurationWheelRelease.kt) · [Web curve](../../src/hooks/wheelDeceleration.ts)
- PR #31 measured 15 gestures per screen at 540 × 1170. Stop-to-enabled median was 67.7 ms in Timer and 86.1 ms in Planning, with maxima of 131.5 and 122.0 ms respectively. The Android writer already finishes at the first verified target pixel. This is the reference for action responsiveness after the deliberate visible motion. [Device measurements](../patches/2026-11-19-12.20.md#verification)
- The archived recordings, native traces and isolated installed APK were matched by SHA-256. Native slow swipes had release speed around 0.357 px/ms and the matched fast flicks around 2.853 px/ms. Seven baseline browser checks passed against the archived web export. In the new deterministic browser assertion the old curve still moved at 18.76% of the launch speed at two CSS pixels remaining, in both directions. That assertion passed against the new curve.

### Follow-up baseline

- Use the completed implementation documented [below](#implementation-evidence). Preserve its recordings and exported bundle before changing the curve. The current baseline is uncommitted on this branch. Its source SHA-256 values are `e36f5d60eb680ce67f8caa26b14ebc09a78e979d7286a2610c26aedc574c8a92` for `wheelDeceleration.ts` and `869832eddbf653d0266ad2518cff71c92f6b6ff3959fda70b6cb0538435ee329` for `DurationWheelRelease.kt`. The isolated APK SHA-256 is `2994e3861debc84e9cb866cca80d07c5ec4218370d00652c8170eba5fcc95568`.
- Timer's seven matching Android samples had a median 826 ms from release to centering. The six browser cases took a median 191.2 ms to cover the last three CSS pixels. For the 1,451 physical-pixel Android sample, modeling an approach that starts about 27 physical pixels from the row at 4% yields approximately 22% more time from peak to the first target pixel. For a six-row, 44 CSS-pixel web sample, an approach starting about 3.6–3.8 CSS pixels away yields roughly 23–26% more time on the same model. These are starting points for calibration. Compare captured frames during implementation.

## Commit Plan

- **Commit 1** (after tasks 1-7): `fix(duration-wheel): extend the visible final braking`
  - Include the already verified work from Tasks 1–4 and the follow-up when the user requests the commit.

## Tasks

### Phase 1 — Measure the reference

- [x] Task 1 — Capture matched fast and slow input on the merged PR #31 build.
  - Use the existing Android gesture matrix and browser frame recorder to capture signed displacement, actual launch speed, early peak, speed as a fraction of launch near the last row, first confirmed target offset and button enablement. Use the same starting value, swipe or wheel delta, direction, geometry and screen when comparing builds. Distinguish the mathematical checkpoint from what survives rendering and recording.
  - Calibrate fast eligibility using measured speed in rows per second and remaining travel on Android. Use a large normalized wheel impulse or a comparable short same-direction burst on web. Include short/slow and near-boundary cases to set a meaningful fallback threshold. Confirm the untouched baseline reaches the low-speed band too late to make the approach visible on representative eligible gestures.
  - Files and evidence use [the browser recorder](../../tests/e2e/durationInertia.spec.ts) and [the PR #31 measurements](feature-duration-wheel-interactions.md#implementation-evidence). Logging uses the opt-in `CronoWheelRelease` debug tag and local browser samples. Record build, column, direction, release, target, checkpoint, terminal and input method in ignored verification artifacts.

### Phase 2 — Extend the visible braking

- [x] Task 2 — Tune the native Android fast-flick curve (depends on 1).
  - Preserve the measured launch, brief existing rise and snap target chosen by React Native before the first visible write. Evaluate joined smooth velocity segments from the early peak to 4% of launch and then to zero. Derive positive durations from the available distances and the average endpoint velocities so the area under the curve equals the target displacement. Reduce the checkpoint distance to fit the existing bounded envelope when feasible. Keep the proven settle for geometry or input that cannot render a useful approach.
  - Use the existing UI-thread writer and cancellation paths. Stop as soon as the actual target pixel is committed, even when the mathematical tail has subpixel travel left. Keep the regular terminal event, exact published row and guard against an old writer or recoverable interruption unlocking the current gesture.
  - Files `modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/DurationWheelRelease.kt`, `modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/CronoDurationWheelModule.kt` and `modules/crono-duration-wheel/android/src/test/java/ro/appcrono/durationwheel/DurationWheelReleaseTest.kt`. Verify signed launch, continuity at joins, monotone braking after the peak, a measurable 3–5% checkpoint, bounded travel, short/slow fallbacks and exact endpoints. Log release speed, checkpoint distance, target, completion or cancellation through the opt-in Android debug tag. Keep routine frames out of production logs.

- [x] Task 3 — Tune the browser fast-input curve (depends on 1).
  - Reuse the existing wheel driver for cancelable vertical input. Preserve visible position and compatible signed speed when retargeting. A reversal cancels the old target immediately and begins from the visible position. Repeated small deltas still accumulate. Preserve present timing for ordinary adjustment and verify how the largest fast impulses fit the longer approach. First try an adaptive distance with the current 900 ms normal cap. If large eligible fast moves need more time to produce a rendered approach, keep a bounded fast-only cap justified by measurements and ensure that the driver and controller watchdogs agree after missed frames. Preserve bounded fallback for a stalled frame or failed write.
  - End once the actual rendered offset reaches the accepted target within physical rounding tolerance, restore scroll snap once and release the action gate after publishing the value. Confirm the old driver cannot write or finish after a new gesture, preset, route change or geometry change.
  - Files `src/hooks/wheelDeceleration.ts`, `src/components/DurationWheel.web.tsx`, `tests/wheelDeceleration.test.ts` and `tests/e2e/durationInertia.spec.ts`. Cover the velocity profile in both directions, uneven frames, finite fallback, residual input, retargets and behavior at the endpoints. Use multi-frame slopes for browser verification because subpixel travel can render as repeated offsets. Logging uses the existing bounded web motion warnings and the opt-in test recorder.

### Phase 3 — Verify the integrated behavior

- [x] Task 4 — Verify both screens and update the duration selector documentation (depends on 2, 3).
  - Replay the baseline inputs on a signed Android release and the fresh web export. Confirm the early speed stays high, the visible braking lasts longer and the approach reaches the 3–5% range before the selected row is centered. Look for an extended wait after the first exact stop. Compare stop-to-enabled median, p95 and maximum against PR #31. Use 100 ms as the existing engineering target and investigate regressions with matched recordings. Check that the first eligible press uses the displayed duration.
  - Exercise late-tail takeover, cancel, overlap, preset, Reduce Motion, short/slow adjustment and near endpoints. Keep the Planning action gap and run the literal legacy backup path through Save and reload or real transfer. Record physical platform coverage separately from exports. Update the Timer and Planning duration selector documentation in `README.md` and the relevant implementation details in `.ai-factory/ARCHITECTURE.md`.
  - Tests use `tests/e2e/durationInertia.spec.ts`, `tests/e2e/durationPicker.spec.ts`, `tests/e2e/timerPresetMotion.spec.ts`, `tests/e2e/editorScrolling.spec.ts` and `tests/e2e/backup.spec.ts`. Log test inputs, observed stop/eligibility delays and any recovery failures in ignored artifacts. Keep routine production motion logging disabled.

### Phase 4 — Lengthen the verified effect

- [x] Task 5 — Extend visible Android braking for fast flicks (depends on 4).
  - Measure peak-to-centered time using the captured fast reference gestures. Keep the measured launch speed, the early peak and the existing snap target. Move a feasible amount of travel into the slow approach by reaching about 4% of launch speed farther from center. Start with an approach near 20% of the row for the representative sample, and solve the existing segment areas to preserve displacement. Fit within the existing 1,300 ms coast budget. Use the current curve where the geometry or motion envelope cannot fit a useful extension.
  - Add deterministic checks for representative fast flicks in both directions, continuous decreasing speed after the peak, exact centering, slow and clipped-input fallbacks, and the existing cap. Preserve the native terminal at the first committed target pixel. Files `modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/DurationWheelRelease.kt`, `modules/crono-duration-wheel/android/src/main/java/ro/appcrono/durationwheel/CronoDurationWheelModule.kt` if a trace needs the peak timestamp, and `modules/crono-duration-wheel/android/src/test/java/ro/appcrono/durationwheel/DurationWheelReleaseTest.kt`. Use the existing opt-in debug tag for peak time, checkpoint and termination. Keep routine frames out of production logs.

- [x] Task 6 — Fit the longer browser approach for fast wheel or trackpad input (depends on 4).
  - Adjust the fast profile's adaptive fit to pursue the visible duration target. A representative six-row fast request should be able to use the existing 1,250 ms fast-only cap when the 900 ms fit is too short. Keep the 900 ms cap for ordinary adjustment. Preserve compatible carried speed, immediate reversal, the same selected row and completion on the first rendered target. Keep the 940 ms stall deadline since the last successful frame ahead of the shared 1,000 ms idle watchdog.
  - Test 3–5% at the calibrated positive distance and retain the two-pixel check where the tuned curve meets it. Compare the rendered time in the last few pixels. Cover both directions, compatible bursts, reversal after the old stop time, endpoints, small deltas and a missing frame on a long request. Confirm a healthy glide can continue past 940 ms from launch. Files `src/hooks/wheelDeceleration.ts`, `src/components/DurationWheel.web.tsx` if required by the existing terminal contract, `tests/wheelDeceleration.test.ts` and `tests/e2e/durationInertia.spec.ts`. Use browser frame attachments and the existing bounded warnings.

- [x] Task 7 — Verify and document the longer visible phase (depends on 5, 6).
  - Replay matched Android release flicks and browser impulses with the existing recorder. Cover both screens, all three columns and both directions. Record the launch, peak, entry into the 3–5% band, visible centering and button enablement. Compare the visible duration with the previous verified working-tree build. Investigate any material increase in stop-to-enabled latency against the verified baseline and the existing 100 ms engineering target. Verify the first eligible press uses the displayed value. Exercise late Cancel, reversal, presets, overlapping motion and Reduce Motion.
  - Run the verification commands below. Keep the earlier artifacts and use a separate export and recording name for the extension. Exercise the real backup fixture and update the existing duration selector paragraphs in `README.md` and `.ai-factory/ARCHITECTURE.md`. Record APK identity and elapsed time measurements in ignored test artifacts with opt-in logging. Report iOS and browser-touch coverage separately from the Android and browser-wheel change.

## Verification Commands and Source Identity

The `ai-factory commands --json` catalog SHA-256 is `5a3a8d34ba3dcd048884e3daf2b0542eb4912f485097b6ca1d43081e4ac9386c`. The source SHA-256 values are `b9f612adb5db2acb1bc14a4e20f85349fcb171d2723ad23f70c02ccb2d332334` for `package.json` and `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66` for `package-lock.json`. Run the package commands from the repository root. Refresh the catalog if the manifests change.

| Command ID | Command |
| --- | --- |
| `package.json#/scripts/lint` | `npm.cmd run lint` |
| `package.json#/scripts/typecheck` | `npm.cmd run typecheck` |
| `package.json#/scripts/test` | `npm.cmd test` |
| `package.json#/scripts/test:e2e` | `npm.cmd run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/backup.spec.ts --workers=1` |
| `package.json#/scripts/export` | `npm.cmd run export -- --output-dir .expo/duration-wheel-longer-braking-extension-export` |

Run `:crono-duration-wheel:testReleaseUnitTest` and `:app:assembleRelease` from the existing staged Android project. Use an isolated release for device installation and record the APK SHA-256 alongside the measurements.

## Implementation Evidence

- The fast profiles preserve the launch velocity and integrate continuous velocity segments to the same target. Android fits a visible approach of up to 12% of a row within its existing 1,300 ms coast budget. The six-row browser case reaches the low-speed band two CSS pixels before the center. Larger impulses that cannot fit a two-pixel approach below 900 ms can use a fast-only 1,250 ms cap. The browser schedules stall recovery at 940 ms since its last successful frame, ahead of the shared idle watchdog. Both fast profiles accept the first rendered target and skip the remaining subpixel travel.
- Lint, typecheck, 325 Node tests, seven native unit tests, the Android release assembly and Android/iOS/web Expo exports passed. The 15 focused browser cases passed, including all six screen and column combinations. Across those six recaptured profiles, the median from entering three CSS pixels of the row to the first centered frame was 191.2 ms versus 55.5 ms on the baseline. The action was enabled in the first centered frame in all six new samples, at the precision of the browser recorder. The final source also passed the added retargeting regression for carrying compatible speed after passing the raw delta.
- The isolated Android release SHA-256 was `2994e3861debc84e9cb866cca80d07c5ec4218370d00652c8170eba5fcc95568`. It recorded seven fast profiles on each screen. All 14 ended at the exact chosen target. The 4% checkpoint was 16.48–16.52 physical pixels before center. The seven same-target Timer comparisons took a median 826 ms from release to centered instead of 609 ms before, with launch speeds near 2.853 px/ms. The two Planning comparisons that retained the exact target took 693.5 ms instead of 460.5 ms. Planning timing uses fewer same-target comparisons because recorded gestures sometimes selected a different target across replays. This sample is separate from stop-to-enabled timings.
- In the 540 × 1170 Android captures, 15 measurable gestures per screen gave stop-to-enabled median/p95/max of 67.3/132.4/132.4 ms in Timer and 98.6/119.0/119.0 ms in Planning. The Timer median was essentially unchanged. The Planning median rose 12.5 ms, less than one 60 Hz frame, and remained below the 100 ms target. The last rendered subpixel rounding interval is part of these visual estimates. On the device the during-approach taps left Timer idle and the Planning panel open. The first eligible taps started `02:14:02` and applied `02:13:03` to the draft respectively. The opt-in native trace placed both attempted early taps after the 4% checkpoint and before the exact terminal.
- The final web export passed all 156 browser tests across the five planned specs in one single-worker run. The run covered touch, motion interruption, keyboard, presets, layout with enlarged text and the legacy backup through actual Save, reload and file transfer. Android device checks used a Redmi Note 9 running Android 12. iOS coverage consists of the Expo export. The current behavior is documented in `README.md` and `.ai-factory/ARCHITECTURE.md`.

### Follow-up implementation evidence

- Verified the prior source hashes and preserved its APK, browser export and recordings. The added Android test failed on that curve with a visible braking ratio of 1.001, then passed on the extended curve in both directions. The browser reference likewise failed the new timing, speed and late-takeover checks. At 3.5 CSS pixels remaining, the original browser curve was still at about 12.25% of launch speed. The extended curve reaches the 3–5% band there and passes the retained two-pixel check.
- Android now fits the slow approach within 20% of a row and 500 ms. The browser fits its fast-only approach within 525 ms and permits use of the existing fast cap when the normal cap would shorten the effect. The representative Android and browser models both meet the 20–25% visible extension check. Eight Android unit tests, the Android release build, 326 Node tests, lint, typecheck and all-platform Expo exports passed. The six browser screen and column combinations also passed the new visible-approach assertion before the integrated run finished.
- The isolated Android APK SHA-256 was `c98569d82bb902ecdf139ff608c1ba1fc17f58da5843e44162a3293a52295dfe`. The phone recorded seven extended fast glides per screen, all ending at the exact target. The 4% checkpoint was 27.47–27.53 physical pixels from center. In two same-target Planning comparisons with about 1,450 physical pixels of travel, the time from peak to native target grew by 20.9% and 21.1%. In Timer, the one same-target comparison within 30 physical pixels of the prior travel was a shorter gesture and grew by 31.9%. The deterministic Timer-size trajectory supplied the representative timing comparison in both directions.
- At 540 × 1170, 15 measurable gestures per screen gave stop-to-enabled median/p95/max of 97.9/149.0/149.0 ms in Timer and 88.7/176.7/176.7 ms in Planning. The Timer median rose from 67.3 ms and the Planning median fell from 98.6 ms. Some samples exceeded the 100 ms engineering target. The captured metric starts at the last detected glyph movement in a half-resolution recording. Native completion still occurs at the first actual target pixel. In recorded press checks, taps roughly 0.8 seconds after release landed after the 4% checkpoint and before native completion. The updated build rejected both early taps. The first eligible taps started `02:16:03` in Timer and applied `02:16:02` to the Planning draft.
- In the six same-input browser comparisons, the median of the paired visible braking extensions was 25.9%. The median time in the last three CSS pixels rose from 194.5 to 260.6 ms, and all six buttons enabled in the same sampled frame as the centered stop. The final export passed 156 browser cases in one run, including the actual legacy backup tests, late takeover and the preset matrix. The README and architecture describe the updated curve. iOS coverage is limited to the export. Browser touch ran through the existing platform-scrolling tests.
