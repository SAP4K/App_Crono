# Implementation Plan: Responsive Duration-Wheel Settlement

Branch: `feature/responsive-wheel-settlement`
Created: 2026-11-13
Mode: full
Status: code, automated checks and documentation complete; Task 3 physical comparison pending readiness confirmation
Starting revision: `52b6bfac94dc1e745433c4b2f8ef8cd06294b294`

## Original Request

am observat ca cand fac scroll de pe telefon la aceasta compoennta atat din planificator cat si din timer, in momentul in care se opreste la o anumita cifra si se seteaza timpul, are un mic lag

## Settings

- Testing: yes; reproduce before fixing, deterministic event-order regressions, relevant browser flows and targeted physical-phone comparison.
- Logging: minimal; warnings/errors only in shipped code. Temporary diagnostics must be opt-in, bounded and removed or disabled after measurement; no per-scroll console logging or saved user payloads.
- Docs: yes; mandatory documentation checkpoint through `$aif-docs`.
- Reuse the user's established full-plan, tests, documentation and minimal-logging preferences.
- Scope: shorten unnecessary delay or remove a measured hitch between the shared selector's final stop and accepted duration/action readiness in Timer and Planning. Preserve the selected slow inertia, full-width Studio appearance, large digits and colons.
- Native Android is the primary investigation target, inferred from the recent Redmi APK installation; verify the runtime/build before attributing the report. Retain iOS and browser compatibility.
- No new dependency, physics engine, native module, setting or persisted field is planned. Native platform files and `node_modules` are read-only references.

## Branch and Delivery Context

The starting revision contains the full-width selector installed on the phone. At planning time, PR #27 (`feature/full-width-duration-picker` → `master`) remains open and `origin/master` is `59e75289a77bda62eda36ae37ffa2f6b4b0dcda2`. This follow-up branch starts from the current selector revision so it retains that prerequisite. Do not reset to the older picker, merge the open PR, rebase, commit, push or install an APK as part of planning. Recheck the prerequisite's merge state before a later PR; preserve the configured final base, `master`.

## Investigation Evidence

These findings establish possible delay paths, not a physical-device root cause:

- `src/hooks/durationWheel.ts:8–11,30–42,65–77`: ordinary release/unsupported-end settlement uses a renewed **160 ms** inactivity delay. Recognized momentum has a **1000 ms** missing-terminal inactivity watchdog, renewed by scroll updates. An accepted terminal event finishes synchronously without another debounce.
- `src/hooks/useDurationWheel.ts:54–71`: terminal handling checks preset takeover, active presentation and agreement within one logical pixel between the end offset and `driver.read()`. Takeover protection can persist until displacement exceeds half a row.
- `src/components/DurationWheel.tsx:11–22,37–47`: the native driver reads the last JS `onScroll` position, while the momentum-end callback carries its own offset. A newer end offset could consequently be rejected while the cached scroll position is older. Reproduce this event ordering before treating it as the phone's cause.
- Installed RN `0.86.3` Android `ReactScrollView.java:917–978` waits for three stable polling checks before emitting momentum-end; `ReactScrollViewHelper.kt:48` defines a 20 ms polling delay. Frame scheduling adds time, so this does not establish an exact 60 ms delay. Do not patch the dependency to bypass its safety policy.
- `durationWheel.ts:35–37` aligns, calls selection and then clears busy. `useDurationWheel.ts:40–43` synchronizes on the acknowledged controlled value. Measure whether redundant native alignment or a render produces a visible final hitch.
- `src/app/timer.tsx:41–47` accepts parts and synchronously configures the timer; `src/hooks/useStopwatch.ts:20–25,47–58` serializes the accepted full snapshot before returning. Planning's duration update is local (`ScheduleEditorSheet.tsx:83–95`). Store serialization may affect Timer, but is not established as the common cause in both callers.
- Existing native row rendering creates 24/60/60 entries. A selection changes their accepted-value styling. Rendering cost is a hypothesis to profile, not justification for replacing the picker or introducing virtualization preemptively.
- `tests/e2e/durationInertia.spec.ts` records rendered offsets, values and action readiness, but has no separate native stop-to-accept measurement. Its browser acceptance minimum of **600 ms** protects the intended **607.5 ms six-row glide**; it must not be removed to make settlement appear faster.

API references checked during planning: installed Expo `~57.0.32` / RN `0.86.3`, [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [RN 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview#onmomentumscrollend), and [RN 0.86 performance guidance](https://reactnative.dev/docs/0.86/performance#running-in-development-mode-devtrue). Release-mode physical measurements are required to distinguish actual interaction cost from development overhead. Recheck matching documentation before changing native API usage.

## Requirements Reconciliation

Authority: the Original Request adds responsiveness at final settlement; it does not request another inertia retune. `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` retain ownership, persistence, accessibility and validation requirements. Completed full-width and gentler-inertia plans document retained behavior. Top-level optional rules, roadmap, research and skill-context files are absent; no research requirements are imported.

| Supported combination | Accepted input, output and side effects | Verification |
|---|---|---|
| Timer idle/completed; native slow drag or flick, either direction | Finite hours 0–23 / minutes and seconds 0–59. Accept the actual final row once; configure only an effective valid duration through existing controls. No write while moving or for a same-value finish. | Native event trace; deterministic terminal tests; real Timer Start uses the accepted duration. |
| Planning step duration; same native gestures | Update temporary numeric parts only; Apply updates the draft, Cancel discards temporary changes, whole-schedule Save persists. | Trace plus Cancel/Apply/Save journey; no writes before Save. |
| Terminal offset differs from cached scroll offset; delayed/missing/duplicated terminal | Accept a valid current manual terminal exactly once using its final position. Reject obsolete/preset/cancelled-generation events. Only genuinely missing terminal delivery uses bounded recovery. | Failing-first event-order regression at the hook/adapter boundary, including a stale cached position. |
| Finger still down, continuing snap/momentum, or several moving columns | Selection stays unaccepted during genuine movement; combined busy is the OR of moving columns. Start/Apply remain guarded until every column finishes. | Held input, long coast with gaps, duplicate touch/drag releases and overlapping-column tests. |
| Explicit row/accessibility/keyboard choice; Timer quick preset; small manual preset takeover | Explicit choices remain immediate; presets accept immediately and animate visually; cancelled presentation cannot settle a newer manual gesture. | Existing presentation tests plus a sub-half-row takeover and queued old-end regression. |
| New drag, disablement, backgrounding, route/panel departure, resize/font-scale change or disposal | Cancel obsolete work, realign appropriately and release busy without replay or accepting an old value. Keep stable wheel hosts/focus. | Generation/lifecycle tests and focused UI interruptions. |
| Browser wheel/trackpad or platform touch; Reduce motion | Retain browser curve, native/platform touch, reduced-motion policy, unsupported-scrollend fallback and exact row centering. | Existing progressive-motion tests plus separate final-stop-to-readiness observations. |
| Existing saved records, either theme and six languages | Preserve user names, history, other clocks and preferences; no schema change or per-frame writes. Retain full-width geometry and labels. | Existing literal legacy fixture → actual edit/backup/import/reload journey and picker layout cases. |

Meaning preservation: PASS — the plan addresses the reported final-selection hitch in both callers while retaining the previously requested slow glide. Candidate causes remain qualified. The latency target below is an engineering target, not a number supplied by the user.

## Acceptance and Measurement Contract

Measure three separate intervals: finger release → final visibly centered stationary row, final stationary row → accepted value/action readiness, and delivered valid terminal → selection/busy callbacks → rendered commit. The first interval is the desired inertia and must not be shortened to improve the second. A last JS scroll callback or two identical cached reads alone do not prove that native movement ended.

- A valid current terminal must publish the final accepted value and release that column's busy state in the same controller turn; it must not wait for 160/1000 ms recovery. Keep accepted refs current before enabling dependent actions.
- An already aligned wheel should not visibly jump or receive redundant corrective scrolling solely because its own accepted value is echoed back through props. Preserve necessary alignment for external values, geometry changes and explicit cancellation.
- Proposed physical engineering target: **at most 100 ms from the final visibly centered stop to the accepted duration and usable Start/Apply**, under ordinary load in a release-mode build. Compare the same gestures/build mode before and after; report median/maximum and frame/recording resolution rather than presenting timer precision as visual precision. Do not force acceptance at 100 ms while the wheel is still moving.
- Obtain at least five comparable slow releases and five ordinary flicks per caller, distributed across directions; spot-check hours, minutes, seconds, no-op/endpoints, two moving columns and a tiny preset takeover. Use an unsaved Planning draft and preserve real user records. Only compare large saved histories if Timer measurements indicate additional serialization cost.
- Browser frame sampling is a shared-behavior regression, not native latency evidence. Bind physical results to phone model, OS, APK/source identity and normal/reduced-motion policy. If the phone is unavailable, keep physical latency acceptance explicitly pending; do not claim the reported phone lag is fixed from an export or browser pass.

## Tasks

### Phase 1: Reproduce and distinguish the delay

- [x] **Task 1: Reproduce the stop-to-accept gap and add a failing event-order regression.**
  - Files: `tests/durationWheel.test.ts`, `tests/wheelPresentation.test.ts`; a focused `tests/nativeWheelSettlement.test.ts` only if a native-only event-policy seam is needed. Inspect `src/components/DurationWheel.tsx`, `src/hooks/useDurationWheel.ts`, `durationWheel.ts` and both consumers; keep temporary capture output ignored under `.expo/`.
  - Record a bounded timeline for gesture start/release, scroll position, native momentum begin/end, end acceptance/rejection reason, fallback execution, selection, busy(false) and rendered readiness. Include unit and local operation identity without names, saved payloads or continuous console output. Measure both callers in release mode when available and document the actual symptom: delayed styling/action readiness, final snap/jump, dropped rendering frames, or a combination.
  - Replay the relevant ordering deterministically. Specifically exercise a manual momentum-end with a final offset newer than the cached JS scroll position, and a preset interruption moving less than half a row. Assert valid terminal acceptance without advancing a fallback clock; separately assert stale programmatic events cannot unlock a newer drag. Establish failure on unchanged code before the corresponding fix.
  - Existing pure controller tests bypass `useDurationWheel`; do not mistake those tests alone for coverage of its rejecting guard. If extracting a small injected event-policy helper is necessary, keep it in `src/hooks/`, native-free and limited to this boundary; register any new test file immediately in `package.json`.
  - Acceptance: a deterministic red case identifies an app-owned problem or a physical trace identifies a measured alternative. If only framework stop-to-end latency remains, retain that finding and use it to scope the correction; do not fabricate an app race or globally lower timeouts.
  - Logging: diagnostic-only bounded capture; shipped behavior stays warnings/errors-only. Depends on: none. Sources: Investigation Evidence; reconciliation rows 1–5.

### Phase 2: Correct the measured settlement path

- [x] **Task 2: Make native final acceptance prompt and remove proven redundant work.**
  - Files: `src/components/DurationWheel.tsx`, `src/hooks/useDurationWheel.ts`, `src/hooks/durationWheel.ts` as justified by Task 1; optional small hook-local native event-policy helper. `DurationWheel.types.ts`, `DurationPicker.tsx` and caller callbacks may change only for a demonstrated integration/rendering need.
  - Repair the reproduced rejection at the native boundary: a current user-owned terminal offset must not be rejected solely because the last delivered `onScroll` ref is older. Keep native manual terminal handling distinguishable from preset/programmatic completion and preserve generation, current-drag, disabled, disposed and active-presentation checks. Do not unconditionally trust every end event or remove the browser/preset stale-event guards.
  - Preserve explicit-choice and preset takeover semantics, including small movements; old queued presentation ends must neither accept old values nor clear the new gesture's busy state. Supply final native position consistently before finishing when current ownership is verified. Keep one manual selection/busy owner and one visual presentation owner.
  - If Task 1 instead/additionally proves a post-release fallback or duplicate-alignment hitch, correct only that path. Do not lower the global 1000 ms momentum watchdog or replace native momentum with a short JS idle guess; continuing slow glides/gaps remain valid. Any ordinary-release timing change needs its own failing regression and native evidence, while keeping browser fallback behavior intact.
  - Avoid a second corrective scroll for an already centered acknowledged value, while retaining meaningful cancellation and external-value/font-geometry alignment. If profiles show row/editor rendering dominates, make only the measured local optimization (for example stable callbacks/memoized unaffected content). Recheck fresh callback refs, selected styling, live theme/language/font scale and focus; do not add broad memoization without evidence.
  - Keep Android/iOS deceleration **0.99575 / 0.99915**, browser interpolation **337.5–900 ms**, preset timing, finite bounds and timer/planning state semantics unchanged. Do not move persistence to scroll handlers, defer accepted data behind animation completion, or introduce a second editable state store. Central storage redesign is not a substitute for repairing shared settlement.
  - Acceptance: Task 1's regression passes; final row is accepted once, readiness has no added recovery delay, no final visual correction is visible, and stale events retain their protections. Logging: preserve existing bounded warnings/errors; no normal scroll/render logs. Depends on: Task 1. Sources: all reconciliation rows and acceptance contract.

### Phase 3: Verify both callers and native responsiveness

- [ ] **Task 3: Cover terminal ordering, final readiness and the real phone comparison.**
  - Files: `tests/durationWheel.test.ts`, `tests/wheelPresentation.test.ts`, any helper-specific registered test from Task 1, `tests/e2e/durationInertia.spec.ts`, `tests/e2e/durationPicker.spec.ts`, `tests/e2e/timerPresetMotion.spec.ts`.
  - Retain/assert one acceptance and one busy interval for slow release, momentum-end without matching final `onScroll`, duplicate/missing end, same-value/endpoint finish, old callbacks, no-offset touch, touch-end before drag-end, long coasting gaps, multi-column input and interrupted presentation. Test hook/adapter event policy where the defect lives, not just an alternate test-only controller.
  - Extend the existing browser recorder with a separate **final centered stop → accepted value/action ready** observation for both consumers. Observe a stable final target and actual rendered readiness; preserve the existing >=600 ms total six-row acceptance and >=460 ms progressing-span protections. Do not loosen these checks, inject a fake terminal to make real-gesture tests pass, or count the intentional glide as lag.
  - Retain immediate preset Start/new-preset eligibility, held-touch/coasting action rejection, exact centering, unchanged outer scrolling, lifecycle cancellation, full-width geometry, keyboard/accessibility choices and Planning Cancel/Apply/Save. Keep the registered literal `tests/fixtures/app-v1-before-planning.json` → actual preset/edit → reviewed backup/import → reload flow; retain unrelated clocks, history and preferences.
  - Repeat Task 1's physical cases on the corrected release build and compare the measured intervals against the engineering target. Check an immediate post-readiness Start/Apply uses the exact centered duration; no duplicate Timer configuration and no Planning storage writes before Save. Check native adjustable actions and Reduce motion when available.
  - Acceptance: targeted automated cases pass, and physical evidence either meets the target or clearly records the remaining measured limitation. Unavailable physical checks remain pending; no browser-emulated iPhone claim counts as native validation. Logging: assertion-local timings/offsets only; no user payload dumps. Depends on: Task 2. Sources: all reconciliation rows and acceptance contract.

### Phase 4: Documentation and final checks

- [x] **Task 4: Document the actual correction and run scoped checks.**
  - Files: `README.md` through `$aif-docs`; this plan's task/evidence sections. Do not rewrite historical completed plans or claim prior inertia/full-width results apply to changed sources.
  - Describe final settlement/responsiveness without promising zero platform latency or changed glide speed. Record tested source/build identity, actual red/green results, commands, case accounting and any pending native check in this plan. Remove temporary instrumentation from normal runtime paths.
  - Run `npm run lint`, `npm run typecheck`, `npm test`, and the three existing picker/preset/inertia browser files. Run fresh Android/iOS/web `npm run export -- --output-dir <ignored-isolated-output>` after native adapter changes. Add editor-scroll/navigation suites only if those boundaries actually change or a failure justifies them.
  - Preserve the user's existing preview on port 8091; use an isolated export and a separate available test-server port. An APK install/device action belongs to a separately authorized run; planning does not trigger it. Physical unavailability does not prevent scoped automated work, but the phone-lag acceptance remains unverified until measured.
  - Acceptance: required checks pass for the final inputs, docs match the implemented correction and native limitations remain explicit. Logging: existing WARN/ERROR policy, no new telemetry. Depends on: Task 3. Sources: `AGENTS.md`, base rules, artifact/acceptance requirements above.

## Verification Commands and Source Identity

Command discovery used installed `ai-factory commands --json`, CWD `.`. Catalog `revision_sha256`: `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`. The catalog describes declarations, not proof of execution. Source `package.json` SHA256: `b69e16c481b7f82de9491307d476a747764d1915782d291216a6a9d50c23ef9a`; `package-lock.json`: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh the catalog/hash after either changes, including registering a test.

| Command ID, CWD `.` | Implementation verification command |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test` | `npm test` (Windows Node 24 LTS or later in this workspace) |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts --workers=1` against a fresh isolated export/runner |
| `package.json#/scripts/export` | `npm run export -- --output-dir <ignored-isolated-output>` |

Use the Windows npm/Git executables through `cmd.exe` in this WSL checkout; Windows Git reports the authoritative worktree state without false CRLF differences. Keep package manager, lockfile, generated native output and existing servers intact.

## Planning Baseline

- No application, test or documentation implementation was changed during planning. At planning completion all four tasks were unchecked; use one scoped conventional commit after completion.
- The installed full-width APK and preceding browser/export passes identify the reported baseline, not proof of this fix. No new physical gesture measurement has been executed during planning.
- Planning-time baseline `npm run lint` and `npm run typecheck` both passed (exit 0). Logs: `.expo/wheel-settlement-plan-lint.log`, `.expo/wheel-settlement-plan-types.log`. These checks validate the unchanged starting application; they are not evidence that the pending fix is implemented.

## Implementation Evidence

- Task 1: extracted the existing hook terminal predicate unchanged into `wheelSettlement.ts`, wired the hook to that predicate and registered the new boundary tests immediately. On the original predicate, 2/3 cases fail: a confirmed native terminal with a one-pixel-newer offset remains unaccepted, and a sub-half-row takeover remains busy. The unverified/browser guard positive controls pass. `.expo/settlement-red.log` binds this failing-first run. The deterministic trace identifies delayed acceptance/readiness, not a measured physical frame hitch. No physics or timeout changed.
- USB currently sees the Redmi Note 9; no updated APK has been installed or physical gesture timing collected in this implementation run. The production APK alone cannot observe the JS terminal rejection reason. Physical comparison remains a distinct pending acceptance item.

- Task 2: native manual terminals now require a released gesture and ordered finite native timestamps before bypassing the hook cache/takeover gate. Cancelled, held, stale, duplicate and unavailable-timestamp paths remain guarded. Native observed offsets suppress redundant acknowledged-value scroll commands without suppressing pre-layout retries, effective external alignment or explicit cancellation. The focused 34-case controller/presentation/boundary run passed; `.expo/settlement-task2-node.log`. Coefficients, browser physics, recovery timeouts, persistence and callers are unchanged. No physical rendering bottleneck was established, so no speculative row/store optimization was added.

- Task 3 automated verification in progress: `npm test` passed 303/303; lint passed after moving native controller construction into the layout-effect lifecycle required by React Compiler, and final typecheck passed. The first lint attempt rejected render-time ref capture; no rule was disabled. The fresh final export passed for Android/iOS/web. A source-bound 130-case browser selection is running on isolated port 8115. The phone is connected but sleeping/locked; an asynchronous readiness question is pending, and no wake/unlock/install or gesture mutation has been performed.

### Final Automated Verification, 2026-11-13

- Task 3 automated portion: **130/130 browser cases passed** in one 308.2-second run, with no skipped, flaky, retried or failed cases: 33 inertia, 33 picker and 64 preset cases. This includes real gestures, hold/coast gating, multi-column cancellation, full-width/language/theme layouts, Planning Cancel/Apply/Save, and the literal legacy → real reviewed backup/import → reload journey. New browser stop-to-readiness observations were **69.2 ms Timer / 69.8 ms Planning**, measured at the existing 0.5 px centered-position tolerance. Total six-row acceptance remained **617.4 / 616.7 ms**, retaining the >=600 ms glide protection. These browser figures do not measure native latency.
- Final registered Node suite: **303/303 passed**, zero skips/failures. Final lint and typecheck passed; no lint suppression or new dependency was added. Fresh final Android/iOS/web export passed. Logs: `.expo/settlement-final-node.log`, `.expo/settlement-lint.log`, `.expo/settlement-final-types.log`, `.expo/settlement-final-export.log`, `.expo/settlement-browser.log`.
- Task 4: `$aif-docs` updated README's native final-position behavior and retained physical-latency limits. AGENTS and architecture maps include the new hook/test seam; all local link targets in the three edited documents resolve. Meaning preservation: PASS — inertia, Start/Apply gates, uncertainty and physical limitations are retained. Technical/readability review: PASS for the scoped additions; existing long README structure remains outside this correction's scope.
- Source-bound evidence is `.expo/settlement-inventory.json`. Application/test/config/asset inputs: **223 files**, SHA256 `08b0eeaeb770337b707c29f04cb756cd319682c56fa02dae6149faaa1eea6512`; final all-platform export: **76 files**, `7921fa1eb82cc77db70b756a11e7c0bfb0126d5270d4445a0b4f17d5e2d0d5b6`; isolated server/runner: **2 files**, `a0e88a27118d202af938ffad6adc9e96385d2ca902c822f2548b0c6323b865bf`; executed browser JSON: `1bbfcdaf0b3740ecbd1c574591e5898b218699d4799dd135b0ff5f2c82b14978`. Inputs remained unchanged across the run. Tests used Windows Node 24.15.0 / local Chrome 157.0.8103.51, one worker and isolated port 8115; the user's port 8091 was preserved.
- The newly registered test refreshed command-catalog revision to `5612b25e27ba1ee9e308d74755dc4585b042b0694e913585f2394d1aa8414b6c` and `package.json` SHA256 to `5ac559d2d79cb68e74ee8e81d5b553091293fe845d2dc177847c7ab59994c97b`. The earlier command/source identity above is the planning baseline, not the current command revision. Lockfile is unchanged.

### Remaining Physical Acceptance

Task 3 stays unchecked because its physical comparison is unfinished. The Redmi is USB-authorized but was sleeping/locked when inspected. A readiness question is pending; no answer is inferred from elapsed time or the preselected option. No APK was installed, phone unlocked, user timer started or schedule saved in this run. The existing user deferrals for broader native acceptance remain intact.

After readiness is confirmed, resume Task 3: use a source-bound updated release build through the previously authorized local build workflow, compare five slow releases and five flicks per caller plus the specified spot checks, and record native stop-to-accept timing and current-duration Start/Apply correctness. The <=100 ms engineering target, physical gesture smoothness and native accessibility checks remain unverified. Android framework terminal polling is retained, so the automated correction does not claim to remove every possible platform-originated delay. Task 4's independent documentation/automated checks are complete; no commit, push or PR was created during implementation.
