# Implementation Plan: Inertial duration wheels

Branch: `feature/duration-wheel-inertia`
Created: 2026-11-09
Mode: full
Status: Complete; 6/6 source/automated tasks verified. Physical native acceptance remains deferred.
Base: fetched `origin/master` at `1fe8e5288da36643873782e5fdb6ab0d31c1ae44`.

## Original Request

Can you add inertia to the time selectors in the Timer and Planning screens

## Settings

- Testing: yes; retain the user's regression-test preference. Extend existing registered controller tests and real browser gestures. Distinguish native gesture acceptance from browser and compilation evidence.
- Logging: minimal; warnings/errors only at actual failure boundaries. Keep scrolling, offsets, velocity, rendering and saved user text out of product logs. Use bounded test diagnostics for reproduction.
- Docs: yes; retain the completion checkpoint through `$aif-docs`, scoped to the existing Timer and Planning wheel instructions in `README.md`.
- Planning mode: full, reusing the user's earlier detailed-plan choice. Execution is sequential; no `--parallel` implementation or automatic implementation.
- Behavior: a quick finger flick continues moving after release, slows naturally and settles on an exact centered value. A slow drag remains suitable for precise selection. Start and Apply wait for every moving column to settle.
- Platforms: Android and iOS first; preserve browser touch, trackpad, mouse-wheel, keyboard and neighboring-row selection. Use platform scrolling physics rather than layering a second animation over an existing native/browser coast.
- Preserve finite hours 00–23 and minutes/seconds 00–59, one-second precision, no wrapping/carry, zero-duration validation, disabled running/paused Timer wheels, Planning draft/Apply/Save boundaries, and the existing six languages/two themes.
- No dependency, saved setting, storage schema/key, native module or app configuration change is expected. Keep the current timing, one-minute alert and system-notification owners intact.
- Branch context: this base includes the one-minute alerts merged through PR #12. Whole-page Planning scrolling remains separately proposed in PR #13 on `feature/planning-screen-scroll`; preserve that branch and PR. This plan does not merge it or repeat its route-layout work.
- Device boundary: preserve the existing native-test deferral. This planning invocation authorizes no new APK build/install, device gestures or phone-setting changes. During implementation, record unavailable Android/iOS checks as pending; installing the previous scrolling APK did not establish inertia acceptance.
- Optional roadmap, research and top-level RULES artifacts are absent. Use `AGENTS.md`, `.ai-factory/rules/base.md`, DESCRIPTION and ARCHITECTURE; do not create replacement context artifacts.

## Existing Behavior and Implementation Direction

The shared `DurationPicker` already feeds the Timer and the Planning action-duration panel. `src/components/DurationWheel.tsx:24` uses a finite native `ScrollView` with row snapping, `decelerationRate="fast"`, and drag/momentum callbacks. `DurationWheel.web.tsx:18` observes browser wheel/pointer events and uses mandatory CSS snapping; it already delegates touch/trackpad momentum to the browser. Native inertia is therefore being improved, rather than assumed absent on every platform.

`src/hooks/durationWheel.ts:22` tracks dragging/moving state and schedules a 160 ms idle finish. Native momentum currently enters through the same `beginWheel` path as browser wheel input. A sufficiently long event gap can let that fallback align and commit before an explicitly recognized coast has ended. This is a source-supported risk to reproduce, not an established physical-device failure. Existing tests cover stale scheduled callbacks, but do not measure post-release travel or delayed terminal events interrupting a new drag.

Separate recognized momentum from ordinary wheel activity and release-without-momentum. Keep the controller injectable and free of React/native/storage imports. Bind the distinction through `useDurationWheel`; hold the existing per-column busy state across drag, coast and final snap. Prefer real terminal events for recognized coast, retaining bounded recovery when terminal events are absent. The ordinary 160 ms idle callback must not finish a recognized active coast. Recovery timers must be invalidated by continued scrolling, a new gesture, explicit choice, synchronization and disposal; do not merely extend one global timeout and call that inertia.

Use native `decelerationRate="normal"` as the initial mobile tuning, preserving row snapping and finite endpoints. Tune only if the controlled Android/iOS comparison demonstrates a problem. Programmatic synchronization, cancellation, explicit keyboard/accessibility choice and geometry alignment remain nonanimated. Native user-initiated physics remains platform-owned; do not introduce a JavaScript per-frame scroll loop or new reduced-motion animation.

On web, use feature-detected element `scrollend` to finish browser-owned scrolling, with a debounced inactivity fallback for older engines and interactions that produce no offset change. Keep pointer release/cancel scoped to the wheel interaction so an unrelated pointer cannot end another column's coast. Preserve default touch/trackpad/wheel physics, CSS snap, containment, keyboard selection and focus. A new desktop mouse-drag gesture system is outside this request.

Keep any empirical inactivity/watchdog thresholds named and documented alongside the controller. Calibrate them against the baseline in Task 1, test their boundaries with an injected scheduler, and guarantee recovery from a missing terminal event. Native and browser terminal paths may need different recovery policy; they should not impose identical physical coast distances.

## Requirements Reconciliation

Authority: the Original Request defines the enhancement. `AGENTS.md`, base rules and architecture constrain compatibility and state ownership. Existing picker/caller code defines the bounds, editability and persistence contract. These sources agree; no storage, clock or audio redesign is required.

| ID | Decision and source | Verification obligation |
|---|---|---|
| R1 | Original Request; `DurationWheel.tsx:24–32`; `DurationWheel.web.tsx:18–55` | A controlled quick flick has perceptible movement after release, followed by exact centering; slow drag remains precise. Compare the native baseline and new tuning using the same gesture. Do not mistake nearest-row snap alone for inertia. |
| R2 | `durationWheel.ts:22–62`; `useDurationWheel.ts:10–32`; architecture — Display and Device Behavior | Explicit momentum cannot be truncated by the ordinary idle fallback. Terminal/recovery paths accept only the current interaction and clean up after cancellation, replacement and unmount. |
| R3 | `DurationPicker.tsx:14–31`; `timer.tsx:29–60` | Busy covers all columns. Each column publishes at most one effective settled value; intermediate pixel offsets do not configure the Timer. Different columns may settle independently under the existing update contract, while Start remains gated until all are idle. |
| R4 | `ScheduleEditorSheet.tsx:59–81`, duration panel; architecture — User Actions and Persistence | Apply rejects motion/zero, changes only the identified local action draft, and Save remains the persistence boundary. Cancel/Back/close discard pending selection and retain editor viewport/focus. |
| R5 | `core/durationPicker.ts`; `DurationWheel.tsx:16–25`; README — Language, Theme, Timer, and Sound | Preserve bounds, no carry/wrapping, disabled state, accessible adjustable/spinbutton controls, direct explicit selection and nonanimated synchronization. Avoid adding motion beyond platform user scrolling when reduced motion is preferred. |
| R6 | Base rules — State and Timing, Validation; literal legacy fixture and existing picker journey | No per-frame persistence, unrelated clock changes or duplicate sound/notifications. No-op settlement preserves completion and playback; legacy data survives real editing/reload. |

Supported combinations:

| Input/state | Validation, output and persistence | Side effects and evidence |
|---|---|---|
| Editable Timer; one interior column; slow drag versus quick flick | A slow drag selects the nearest settled row. A quick flick visibly continues after release, then selects one bounded centered row. Persist only an effective settled selection. | Record release and subsequent positions from the same real gesture. At normal motion settings, use at least one row of continued travel as the controlled flick target, not an exact OS-specific final index. Record the baseline honestly if it already coasts. |
| Timer; several moving columns; immediate Start/Restart attempt | Each column may settle once; Start/Restart stays disabled and its handler guard rejects attempts while any column is busy. After all settle, a fresh press uses the final combined duration. | Observe busy/accepted updates throughout post-release movement. Use a coordinate tap during motion rather than Playwright's enabled-state auto-waiting `click()`. |
| Timer idle/completed versus running/paused; zero versus valid selection | Existing editability remains. Zero stays a local invalid value; running/paused input cannot alter the clock. Same-value settlement preserves completed identity/audio. | Existing Timer/picker scenarios plus coast-specific no-op, endpoint and disabled-input checks. |
| Planning duration panel; flick then Apply, Cancel, Back or close | Apply waits for all columns and rejects zero. Accepted selection modifies only that action draft; Save persists it. Discarded motion cannot affect a later opening or another action. | Real flick/blocked Apply, Cancel during coast, reopen, Apply, reorder/Save and reload through the actual sheet. |
| Recognized coast interrupted by a new drag, reverse flick or explicit keyboard/accessibility choice | New input owns the interaction; stale timers/end events cannot commit old offsets or unlock a newer drag. Explicit choice remains immediate and bounded. | Deterministic controller traces plus actual gesture interruption. Treat unusual native event ordering as a hypothesis until observed or verified against the native implementation. |
| No movement, lost terminal event, background, disable, external value/geometry change or disposal | An idle control recovers; cancellation silently returns to the committed value. Old callbacks cannot revive motion or write state. | Injected scheduler tests, browser no-delta/fallback path and existing background/font-geometry regressions. Include release at a finite endpoint. |
| Native touch; browser touch/trackpad/wheel; compact themes/languages and reduced-motion preference | Physical behavior stays platform-owned; accepted values and row centering agree. Labels, focus and parent scrolling remain usable without a numeric keyboard. | Extend existing six-language/two-theme compact coverage and enlarged-text/reduced-motion controls. Native arbitration, TalkBack/VoiceOver and actual coast feel require native checks. |

Representative existing artifact: retain `tests/fixtures/app-v1-before-planning.json` unchanged and the real journey at `tests/e2e/durationPicker.spec.ts:182`. Exercise hydration → no-op movement without extra writes/audio → translated Planning action draft Cancel/Apply → unrelated Save → reload. Assert preserved timer identity, stopwatch/history, valid preferences and user names under the current version-1 restoration contract.

Meaning preservation: PASS — inertia adds continued, decelerating movement to the existing selectors and retains exact final selection. It does not change clock durations/ranges, make wheel positions persistent, or turn Planning Apply into Save.

## Versioned API Evidence

The selected base uses Expo `~57.0.32` and React Native `0.86.3`. The [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [Expo index](https://docs.expo.dev/llms.txt) were read in this session; recheck versions before implementation if the base changes.

The [React Native 0.86 ScrollView reference](https://reactnative.dev/docs/0.86/scrollview) documents native deceleration, row snapping and momentum begin/end events. `normal` deceleration is 0.998 on iOS / 0.985 on Android, versus `fast` at 0.99 / 0.9. `disableIntervalMomentum` defaults to false; the existing wheel does not enable it. Keep normal velocity-sensitive travel across multiple rows. The [0.86 AccessibilityInfo reference](https://reactnative.dev/docs/0.86/accessibilityinfo) is available if actual native preference handling becomes necessary; it does not justify adding a new settings feature.

The [element scrollend reference](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event) distinguishes completion of scrolling from release alone, includes scroll-snap completion, and notes that no event fires when the offset does not change. Feature detection and a no-movement/older-browser fallback are necessary.

## Command Evidence

CWD: `/mnt/d/app_crono` (`D:\App_Crono` for the established Windows Node/npm workflow). Use npm and Node.js 24+ with the committed lockfile. Read-only discovery: `ai-factory commands --json`.

- Catalog revision: `6d2f3329bd97b6f5bd2ec2724bdf69f997fe095720240f992be3bc25467c8aea`.
- Catalog snapshot outside Git: `/tmp/crono-duration-wheel-inertia-commands.json`; no unresolved ambiguities.
- `package.json` SHA256: `e7a23a389d13f305785ec80ad374d852b816b25c915c1054cb5872c869f681ec`.
- `package-lock.json` SHA256: `fd6a7c8e60b7af3cdddf2ee0b1c4c941c4fc194beb647e9b0aab2338a2a99557`.

| Command ID | CWD | Planned use |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint`; baseline passed during planning. |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck`; baseline passed during planning. |
| `package.json#/scripts/test` | `.` | `npm test`; both existing duration unit files are explicitly registered. Reuse them; register immediately if a new unit filename becomes necessary. |
| `package.json#/scripts/test:e2e` | `.` | First the new `tests/e2e/durationInertia.spec.ts`, then the affected existing suites listed in Task 6. The new spec is automatically discovered under `tests/e2e`. |
| `package.json#/scripts/export` | `.` | `npm run export` for Android/iOS/web compilation after implementation. |

Focused controller replay: Windows Node `node --test tests/durationWheel.test.ts tests/durationPicker.test.ts`, using the current package test registration as its source. Discovery declarations are not execution results. Only baseline lint/typecheck ran during planning; no feature tests, app build or phone operation ran. Refresh the catalog if command sources change. Verify Playwright server ownership; retain its timeouts and retry policy. Use the previously inspected isolated fresh-server approach if the Windows runner/path issue recurs.

## Commit Plan

- **Commit 1** (after tasks 1–4): `feat(duration-picker): add momentum-aware wheel scrolling` — regression-first controller/gesture coverage, shared lifecycle, native tuning and browser completion signals.
- **Commit 2** (after tasks 5–6): `test(duration-picker): cover inertial selection and compatibility` — expanded integration coverage and scoped README instructions.

These are proposed checkpoints for later authorized commits. This planning request does not commit, push, open a PR or merge branches.

## Tasks

### Phase 1: Define and reproduce the motion contract

- [x] Task 1: Capture the inertia baseline and add meaningful regression checks.
  Files: `tests/durationWheel.test.ts`, new `tests/e2e/durationInertia.spec.ts`; reuse `tests/e2e/helpers.ts` and existing picker utilities where possible.
  Deliverable: record slow-drag versus quick-flick behavior from an interior value, post-release positions and final centering. Extend the injected scheduler to advance real delays rather than treating every pending callback as immediately due. Cover recognized momentum surviving the ordinary 160 ms fallback, no early selection/busy release, final acceptance and interruption. Add real Chromium touch-flick checks for Timer and Planning, with gesture pacing that yields velocity and frame sampling after release. Test the visible/accepted behavior, not just a deceleration prop or manually dispatched scroll event.
  Verification: execute the smallest meaningful failing controller/gesture check before editing production code, and rerun that exact check after the fix. Browser touch may already coast: preserve passing baseline evidence and target interruption/gating gaps rather than fabricating a failure. Native fast/slow comparison is a separately identified acceptance procedure, pending under the device deferral. Do not infer native physics from CDP.
  Logging: bounded test diagnostics only; no product logs or committed recordings. Sources: R1–R3, R5–R6; editable single/multi-column combinations. Dependencies: none.

### Phase 2: Retain momentum until the actual terminal state

- [x] Task 2: Make the shared wheel lifecycle distinguish active momentum from idle fallback.
  Files: `src/hooks/durationWheel.ts`, `src/hooks/useDurationWheel.ts`, `tests/durationWheel.test.ts`.
  Deliverable: introduce explicit drag/coast/idle semantics and an adapter entry for recognized momentum, separate from ordinary browser wheel activity. Keep busy continuous through the current interaction, snap to one bounded row at the end, publish only an effective final value, and preserve the stable committed-prop bridge. Implement bounded missing-event recovery with documented named thresholds calibrated in Task 1. Protect scheduled and terminal paths against a new gesture, direct choice, backgrounding, disable/value/geometry synchronization and disposal. A delayed old end must not finish a newer active drag; validate any event-order assumption rather than treating a synthetic trace as a proven native defect.
  Verification: the exact Task 1 controller regression passes; existing endpoint, no-op, cancellation and geometry tests remain meaningful. Add missing-end/no-delta recovery and stale terminal/callback scenarios, ensuring no permanently busy control. Continue using injected scheduling and receiver-safe browser timer wrappers.
  Logging: no ordinary lifecycle/offset logging; retain warnings/errors only for actual existing failure boundaries. Sources: R2–R3, R5–R6 and interruption/cancellation combinations. Depends on 1.

- [x] Task 3: Enable a longer native glide with the existing finite ScrollView.
  Files: `src/components/DurationWheel.tsx`; `src/hooks/useDurationWheel.ts` only for the required adapter bridge.
  Deliverable: use `decelerationRate="normal"` for the initial inertia tuning; retain row snapping, velocity-sensitive multi-row travel, no bounce/wrapping and current gesture containment. Wire native momentum begin/end to the new lifecycle; release without momentum still settles. Preserve immediate nonanimated synchronization, explicit choices, accessible bounds/actions, disabled wheels and scaled row geometry. Keep frame-by-frame scrolling in the native view and avoid per-frame React/shared-state writes. A new touch should interrupt current inertia without accepting an obsolete row.
  Verification: native adapter event traces satisfy the controller contract and native bundles compile. The controlled native comparison must eventually show post-release travel and final centering in both Timer and Planning, including endpoint and interruption checks. Record physical Android/iOS feel, nested gesture arbitration and accessibility as pending when unavailable; static props, browser checks and exports do not prove them.
  Logging: no gesture/frame or user-duration logging; bounded diagnostics stay in tests. Sources: R1–R5; native touch, slow/fast and interrupted gesture combinations. Depends on 2.

- [x] Task 4: Preserve browser-owned inertia through scroll completion and fallback recovery.
  Files: `src/components/DurationWheel.web.tsx`, `tests/e2e/durationInertia.spec.ts`; controller/bridge only if the demonstrated browser path requires it.
  Deliverable: add a feature-detected `scrollend` path without suppressing normal browser touch/trackpad/wheel scrolling. Use the current offset at a valid terminal event and retain a bounded fallback for missing events, no offset change and older browsers. Scope pointer terminal listeners to the active interaction, retain containment/CSS snap/focus and let new input or explicit keyboard/row choice invalidate obsolete settlement. Keep programmatic alignment immediate and avoid adding synthetic momentum on top of browser movement. Clean up every added listener/timer on replacement/unmount.
  Verification: real fast touch release continues before final acceptance in both consumers, Start/Apply remain gated throughout, and fallback/no-movement/disabled/bounds checks recover. Test interruption, reverse direction, release outside, pointer cancellation and direct keyboard/row choice without accidental activation. Keep native/browser physics assertions separate and keep reduced-motion controls usable without added animated alignment.
  Logging: existing warnings/errors only; no event-stream logging. Sources: R1–R6; browser input, no-delta, fallback and interruption combinations. Depends on 2.

### Phase 3: Verify consumer contracts and document the gesture

- [x] Task 5: Cover Timer/Planning integration, compatibility and accessible layouts.
  Files: `tests/e2e/durationInertia.spec.ts`, existing `tests/e2e/durationPicker.spec.ts` only for useful added assertions; preserve the literal legacy fixture.
  Deliverable: check overlapping column coasts, coordinate attempts to Start/Apply during movement, exact final combined duration, running/paused immutability, zero/endpoints, same-value completion/audio and cancellation during a pending Planning selection. Verify Apply remains local, Save targets the correct action ID, discard/reopen and list/focus return work, and unrelated clocks/notifications/audio remain unchanged. Retain the six-language/two-theme compact matrix plus representative larger/font-scaled/reduced-motion cases; verify no parent-page movement while operating a wheel. Run the real literal-fixture hydration/edit/reload path described above, including absence of no-op writes.
  Verification: meaningful browser checks pass without weakening assertions, inflating timeouts or adding retries. Controller tests cover delayed/stale callbacks; actual gesture checks establish post-release movement. Keep native swipe/momentum, native text scaling, TalkBack and VoiceOver explicitly pending until native QA is resumed. Automated completion of this task does not claim those device checks passed.
  Logging: bounded test diagnostics and existing runtime warnings/errors only; preserve saved user text. Sources: all R1–R6 and supported combinations. Depends on 3, 4.

- [x] Task 6: Update wheel instructions and complete the authorized automated checks.
  Files: `README.md` — Timer instructions and Planning Example; implementation/test files only if a demonstrated validation failure needs correction.
  Deliverable: use `$aif-docs` for a concise explanation that a quick flick coasts, slower movement helps precision, and Start/Apply wait for settling. Preserve ranges, keyboard/accessibility options, Apply/Save and Cancel instructions; keep implementation detail out of product copy. No new report/documentation hierarchy or unrelated context rewrite is required.
  Verification: run `npm run lint`, `npm run typecheck`, `npm test`, then `npm run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timer.spec.ts tests/e2e/planning.spec.ts tests/e2e/planningButtons.spec.ts tests/e2e/crono.spec.ts`. Run `npm run export` for Android/iOS/web and check changed README links/commands. Record actual results and pending native evidence in this plan; repeat only checks justified by later changes/failures. Refresh command evidence if sources changed. Source and automated checks can be complete with explicitly pending native acceptance; claim native inertia quality only after the physical comparison passes.
  Logging: concise validation outcomes; no new routine product logs. Sources: Original Request, all reconciled requirements and retained testing/docs preferences. Depends on 5.

## Completion Criteria

The shared selectors support a natural continued glide after a quick release, followed by exact finite-row selection. The current interaction remains busy until its true completion/recovery; interrupted motion cannot publish obsolete values. Timer/Planning validation and persistence boundaries remain intact. Regression-first controller checks, real browser gestures, affected journeys, lint/typecheck, registered tests and cross-platform exports pass. README instructions reflect the new gesture. Physical native feel and accessibility remain a separately stated acceptance limitation until observed on Android/iOS.

Planning evidence: source/API review and two read-only parallel investigations completed; the investigations began on `cadaa830a8a981b7293f5e757122fc7515fdb53d`. The selected master's wheel/controller/caller code retains the inspected behavior. Baseline lint/typecheck passed after creating this branch. No feature implementation, new regression execution, APK build/install, commit, push or device operation was performed by this planning invocation.

Implementation evidence:
- Task 1: Node baseline: 11 passed, 1 failed. The new interruption regression accepted obsolete value 10 during a newer drag (expected no selection). Chromium baseline: both Timer/Planning quick-flick checks failed the one-row post-release travel target (25 px versus 44 px); diagnostics retained outside tracked source. Browser gesture velocity and lifecycle effects require separate investigation; this does not establish a native-device failure. Native comparison remains pending.
- Task 2: All 17 picker/controller checks pass, including the unchanged failing interruption regression. Explicit momentum survives 160 ms gaps; a 1000 ms inactivity watchdog renews with each scroll and recovers missing/no-offset end events. Direct selection, synchronization and disposal invalidate stale callbacks/end events. Typecheck passed. No per-frame state/persistence/logging added.
- Task 3: Native adapter now uses normal deceleration, explicit momentum begin, final drag offset and touch interruption. All 18 picker/controller checks (including the native event trace) pass; lint and Android/iOS/web exports passed. Physical swipe distance/feel, nested arbitration, native text scaling, TalkBack and VoiceOver remain pending.
- Task 4: Four focused browser scenarios pass: Timer/Planning slow-versus-fast real touch flicks (at least one row after release, final centering, busy until completion), unrelated pointer isolation, and unsupported-scrollend/endpoint recovery. Calibration on an isolated browser scroll view showed the short synthetic stroke was insufficient; the controlled test now uses a 240 px / three-move flick without a final hold. Browser inertia was already present; no synthetic physics added. Nineteen other picker cases passed; two fixed-delay transient-state assertions need event-aware updates in Task 5. The final native drag offset also has a reproduced-and-fixed ordering regression; all 19 controller/picker checks now pass.
- Task 5: All ten new browser interaction cases pass, plus the corrected existing touch/cancel case. Other existing picker journeys, literal legacy fixture, fifty-action editing, concurrent audio/notices and the six-language/two-theme matrix passed in the preceding integration run. Transient gating is observed during actual motion instead of assuming a minimum delay after completion. Parent containment now compares every ancestor's actual scroll offset. The final gesture uses 360 px / three moves, captures release inside the browser touch-end event, and retains the one-row travel assertion; slow and fast gestures use the same stroke. All 20 controller/picker checks pass. A reproduced browser compositor cancellation defect is fixed with bounded nonanimated cancellation, including fresh-input/unmount cleanup; no frame loop drives inertia or persistence. Native acceptance remains pending.
- Task 6: Final lint/typecheck passed; `npm test` passed all **203 Node tests**. All **71 selected browser scenarios passed in one complete run (14.0 minutes)**, including all ten new inertia cases and the existing picker, stopwatch, Timer, Planning and feedback suites. Retries/timeouts remain unchanged. Fresh Android/iOS/web exports passed. Representative Romanian light Timer and Russian dark/enlarged-text panel screenshots were inspected. README instructions and its AGENTS documentation-map entry were updated; meaning preservation, scoped accuracy/readability and all 18 internal links passed review.
- Execution identity: command catalog revision and package/lock hashes above were rechecked unchanged. The npm Playwright wrapper encountered the known Windows mixed-case module-path issue before collecting tests; the clean 71-case run used the same installed Playwright CLI through Windows Node with consistent lowercase paths. A temporary config reused the owned development server on port 8094, retaining the committed browser/device setup, one worker, 45-second test limits and zero retries. No dependency/configuration change or native build/install was required.
- Still pending: controlled physical Android/iOS slow-drag versus flick comparison, native snapping/endpoints and interruption, nested gesture containment, native font scaling and TalkBack/VoiceOver. Browser gestures, screenshots, Node checks and exports do not establish these device results. No commit, push, PR, merge, APK installation or device operation was performed by this implementation invocation.
