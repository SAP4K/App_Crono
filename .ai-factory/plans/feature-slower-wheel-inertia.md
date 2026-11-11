# Implementation Plan: Slower Duration-Wheel Inertia

Branch: `feature/slower-wheel-inertia`
Created: 2026-11-11 (Europe/Bucharest)
Mode: full
Status: completed — all four tasks implemented and verified; physical native acceptance remains deferred.
Base: `03267c634c3d76bbee8ebe90403ecd91ba40eae1` from `feature/progressive-wheel-deceleration`. Its [PR #22](https://github.com/SAP4K/App_Crono/pull/22) is open against `master`; `origin/master` is `ded865ed808ab2c16f46314ab6e3d062b295b815`. This branch deliberately retains the wheel implementation being refined. The configured integration base remains `master`; do not merge, rebase, publish or close either PR as part of planning. Resolve the dependent PR base explicitly during a later publication request if #22 is still open.

## Original Request

You can make the inertia slower

## Settings

- Testing: yes — retain the user's detailed-plan and regression-test preferences. Test measurable travel and selection behavior rather than merely asserting a larger constant.
- Logging: minimal — existing bounded WARN/ERROR for unexpected scheduling, writing and cancellation failures only. No new normal-input, velocity, per-frame or saved-data logs.
- Docs: yes — mandatory completion checkpoint through `$aif-docs`, updating the existing duration instructions and platform distinctions.
- Scope: the same shared hours/minutes/seconds wheels in Timer and the Planning action-duration panel. Interpret slower inertia as a gentler, longer deceleration after input; direct input must still respond promptly.
- Browser target: stretch the current owned glide by 1.5×, retaining its cubic ease-out curve and target-distance calculation. This tuning choice implements the request; the user did not specify a numeric multiplier.
- Native target: modestly reduce native deceleration through the existing public `ScrollView` prop. Keep native momentum and row snapping platform-owned. Native rates do not establish a fixed duration, an identical final row across platforms, or a lower initial fling speed.
- Keep immediate keyboard/row/accessibility choices, accepted 1/5/10/25-minute presets and their separate presentation lifecycle. Do not slow screen/sheet transitions or the running clocks.
- Keep finite ranges, zero validation, manual Start/Apply gates, and Planning's temporary selection → Apply → whole-schedule Save boundaries. No dependencies, settings, persistence/schema changes, native modules or new animation owners.
- Physical Android/iOS gesture, accessibility and background/lock acceptance remains deferred under the user's existing device-test decision. This plan does not authorize builds/installations or resume physical tests.
- This invocation creates its branch and plan only. Implementation, commit, push, PR and application-launch actions remain separate.

## Requirements Reconciliation

Authority: the Original Request refines the already implemented wheel feel. `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` retain ownership, mobile performance, persistence and validation requirements. The prior [progressive wheel plan](feature-progressive-wheel-deceleration.md) records historical tuning; its previous Android/iOS rates do not prohibit the new requested refinement. No roadmap or research artifact applies.

| ID | Decision and source | Verification |
|---|---|---|
| R1 | Slower, longer post-input movement with prompt takeover. Source: Original Request; `wheelDeceleration.ts` — `push`/`schedule`. | Deterministic fixed-time displacement is lower than the prior profile; the same accepted browser target arrives later and centers exactly. Actual Timer and Planning frames confirm sustained slowing. |
| R2 | Use one visual writer for owned browser events and the platform driver for native/touch input. Source: architecture — Display and Device Behavior; native/web adapters. | Native prop/type audit and bundle exports; existing browser touch/noncancelable-event checks. Physical native acceptance is explicitly pending. |
| R3 | Manual busy and accepted selection remain owned by `durationWheel`; preset presentation remains separate. Source: `durationWheel.ts`, `useDurationWheel.ts`, `wheelPresentation.ts`. | Start/Apply stay gated until genuine manual settlement, then become usable; presets still accept immediately and can replace manual movement. |
| R4 | Lifecycle, reduced-motion, takeover and failure cancellation continue fencing obsolete callbacks. Source: shared motion/controller contracts and the previous alignment fix. | Interrupt an observed unfinished glide; assert current selection, exact centering and usable controls after the obsolete deadline. Retain all six alignment-failure regressions. |
| R5 | Accepted duration edits preserve clocks, user text, saved preferences, legacy data and explicit Planning save semantics. Source: core/persistence rules and `tests/fixtures/app-v1-before-planning.json`. | Hydrate the literal fixture, edit through the real UI, reload and compare unrelated data. Retain the existing Timer and Planning compatibility journeys. |

### Supported combinations

| Input/state in Timer or Planning | Accepted result, persistence and side effects | Scenario |
|---|---|---|
| Eligible cancelable vertical mouse-wheel/trackpad input; normal motion | Same normalization, finite target and exact final row; slower visual travel. Only final accepted selection reaches the existing consumer; no frame writes to persistence. | Both real-frame profiles, both signs, fractional streams, reversal, supported delta units and endpoints. |
| Native Android/iOS slow drag or flick | Existing native driver/snap with gentler numeric deceleration; native gesture determines final row. No JS-driven fling or second offset writer. | Prop audit, lint/typecheck and native exports now; matched physical slow-drag/fling, endpoints and Start/Apply checks remain pending. |
| Browser direct touch, noncancelable/modifier wheel, or initially reduced motion | Retain platform/default handling and existing manual gates; no competing custom interpolation. Saved data contract is unchanged. | Existing touch-hold/cancel, unsupported-event, endpoint, keyboard and reduced-motion cases. |
| Unfinished glide followed by reverse input, preset, explicit choice or live Reduce motion | Existing owner takes over immediately from the correct current offset or accepted target. Obsolete frames/deadlines cannot move, select or unlock newer work. | Existing observed-movement takeover cases, immediate preset Start and stale-callback unit checks across the longer lifetime. |
| Unfinished glide followed by backgrounding, route/panel departure, changed geometry, disablement or disposal | Existing lifecycle cancellation settles/releases safely, with no replay or delayed accepted change. | Retain actual interruption and changed-geometry coverage; assert beyond the previous request deadline. |
| Literal version-1 save, either theme/language, overlapping column motion | Existing accepted values, preferences, text and independent clocks survive; busy remains the OR of manual columns. Only an effective accepted edit changes data. | Existing fixture/edit/reload and multi-column tests, plus the established language/palette picker cases. |

Meaning preservation: PASS — slower inertia is implemented as a longer, gentler slowdown, without inserting an input delay. The 1.5× browser multiplier and native numeric rates below are explicit engineering choices, not user-specified measurements. Native platform behavior is not presented as a fixed-target browser animation.

## Implementation Evidence and API Context

- `src/hooks/wheelDeceleration.ts:61` currently uses `min(480, 180 + rows * 24)` milliseconds with cubic ease-out. Proposed `min(720, 270 + rows * 36)` is exactly 1.5× for the same distance, reducing the curve's peak speed by one-third without changing its target. One-row travel changes 204 → 306 ms; six-row travel 324 → 486 ms; capped travel 480 → 720 ms.
- Keep the independent `duration + 40` deadline: the revised maximum is 760 ms. `src/hooks/durationWheel.ts` has a 1000 ms momentum-recovery interval; each animated web write already refreshes it. Do not lengthen the manual watchdog or touch holds to hide a fault.
- `src/components/DurationWheel.tsx:33` currently uses Android `0.99` and iOS `normal`. Plan the public-prop candidates Android `0.995` and iOS `0.999`, leaving snapping, touch/momentum events and accessibility wiring intact. A larger numeric rate retains momentum longer; it does not promise lower instantaneous speed or the browser's 1.5× duration.
- `src/components/DurationWheel.web.tsx:80–116` owns the eligible wheel-event bridge; browser touch/CSS snapping is separate. No adapter or hook rewrite is expected for the duration change.
- `tests/e2e/durationInertia.spec.ts:115` already profiles real Timer/Planning motion; later cases cover takeover, fault injection and the literal saved-data fixture. Existing 1100/1200 ms stale/failure observation windows exceed the new 760 ms visual deadline and should not be enlarged without evidence.
- Manifest: Expo `~57.0.32`, React Native `0.86.3`. Read matching [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt) and [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview#decelerationrate). The installed `processDecelerationRate.js` confirms normal iOS `0.998`; Android `ReactScrollView.java:308–312` maps numeric rate to friction. Recheck matching docs before implementation changes platform APIs.
- Preserve the completed earlier plans and the unapproved Task 8 improvement proposal. This request does not authorize applying that separate proposal or rewriting earlier test results.

## Tasks

### Phase 1: Slower motion

- [x] **Task 1: Retune the shared browser glide and its deterministic regression checks.**
  - Files: `src/hooks/wheelDeceleration.ts`, `tests/wheelDeceleration.test.ts`.
  - Change only the duration policy to `Math.min(720, 270 + rows * 36)`, where rows is the existing absolute target distance divided by current row height. Keep the current easing, delta normalization, raw accumulation, bounds, exact target, generation guards and independent deadline.
  - Add a behavioral regression before retuning: a six-row request is still moving at 324 ms, has lower displacement during the first 50 ms than the previous approximately 104 px profile (44 px rows), and finishes once at 486 ms on the same row. Cover both directions, short movement and the capped request; use elapsed time rather than a frame count as the clock.
  - Update the existing progressive sample timings to observe the new coast. For a capped request with missing frames, prove it remains pending at 759 ms, finishes exactly once at 760 ms, and rejects the late frame. Retain irregular frames, fractional streams, reversal, endpoints, cancellation, synchronous/failing scheduling and warning bounds.
  - Logging: retain bounded WARN/ERROR failure codes; add no normal-motion logs.
  - Depends on: none. Evidence: R1, R3, R4 and eligible-browser/interruption combinations.

- [x] **Task 2: Make native post-release slowing gentler through the existing platform prop.**
  - File: `src/components/DurationWheel.tsx`.
  - Set the existing native `decelerationRate` selection to Android `0.995` / iOS `0.999`; these are initial implementation candidates pending physical acceptance. Keep `snapToInterval`, finite bounds, content offsets, drag/momentum callbacks, accessibility actions and the separate preset `scrollTo` behavior.
  - Do not add a native RAF loop, scroll-velocity multiplier, dependency, settings control or a pure helper created solely to test these two literals. Audit the change against the installed RN API and run typecheck/native exports in Task 4.
  - Retain the native gesture acceptance checklist: slow precision, flick slowdown, endpoints, reverse takeover, multi-column Start/Apply gating, font scale and accessibility. Mark physical checks pending under the existing deferral; source review/export does not close them.
  - Logging: no new logs for a native prop change; preserve existing guarded failure handling.
  - Depends on: none; may proceed independently of Task 1. Evidence: R2 and native/touch combinations.

### Phase 2: Integration and documentation

- [x] **Task 3: Prove the slower profile through both real picker consumers.**
  - Files: `tests/e2e/durationInertia.spec.ts`; `tests/e2e/durationPicker.spec.ts` only if an assertion genuinely depends on the old duration. Reuse `tests/e2e/timerPresetMotion.spec.ts` and `tests/e2e/navigationTransitions.spec.ts` as regressions.
  - Strengthen the existing Timer/Planning real-wheel profiles so an equivalent multi-row gesture has a visibly longer moving span (target at least 300 ms with real-frame tolerance), still decreases in speed, and centers on the same bounded row. Pair browser evidence with Task 1's exact timing/displacement checks; do not infer the new duration from a relaxed timeout alone.
  - Observe that movement is unfinished before interrupting it. Retain immediate reversal, keyboard/row/preset takeover, actual reduced-motion/background/route events, geometry changes, delta modes, native-owned browser touch, multiple-column busy gating, zero validation and all six alignment-scheduling/cancellation failure cases. Keep Start/Apply blocked during genuine manual movement and available after settlement; preset acceptance must remain immediate.
  - Reuse `tests/fixtures/app-v1-before-planning.json` literally through hydration → actual Timer edit → reload; preserve unrelated clock/history/preferences. Retain Planning Cancel/Apply/Save behavior and the existing picker localization/theme coverage.
  - Keep event pacing and prolonged touch holds independent of animation tuning. Update only assertions tied to the former profile; avoid blanket sleep/timeout increases or production device-pixel-ratio compensation.
  - Logging: test diagnostics may include assertion-local offsets/timestamps; add no product frame logs or saved-data dumps.
  - Depends on: Task 1. Include Task 2 in the source-bound validation snapshot. Evidence: R1–R5 and all supported combinations relevant to browser execution.

- [x] **Task 4: Update existing instructions and validate the final combined change.**
  - Files: `README.md`; `.ai-factory/DESCRIPTION.md` / `.ai-factory/ARCHITECTURE.md` only for factual native-rate or behavior statements that become stale. Route documentation work through `$aif-docs`; update this plan's progress/evidence without replacing earlier source identities.
  - Explain slower mouse-wheel/trackpad slowing and gentler native coast, exact row selection, prompt takeover, unchanged preset behavior and platform-owned touch. Distinguish a bundle check from physical acceptance; retain historical verification as historical.
  - Run lint, typecheck, core tests and the four relevant browser files in one final run, then fresh Android/iOS/web exports. Capture the final source identity, command selection, pass/fail counts and any retries/skips. Scope results to the commands and platform actually run; do not require a full unrelated browser rerun after focused checks pass unless a failure or wider integration concern warrants it.
  - Retain warnings/errors-only product logging. No separate report file, workflow refactor or dependency upgrade.
  - Depends on: Tasks 1, 2, 3. Evidence: all requirements; documentation and validation rules.

## Verification Commands

Catalog discovery: `ai-factory commands --json`, project root (`cwd: .`). Catalog `revision_sha256`: `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`. Source `package.json` SHA256: `b69e16c481b7f82de9491307d476a747764d1915782d291216a6a9d50c23ef9a`; lockfile SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh discovery if either changes. Entries are `declared` / `not_run`, not proof of successful execution for this refinement.

| Command ID, cwd `.` | Planned invocation |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test` | `npm test` |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/navigationTransitions.spec.ts` |
| `package.json#/scripts/export` | `npm run export` |

Use Windows Node.js 24+ and Windows npm/Git for this checkout as in the preceding validated runs. `playwright.config.ts` is a local Chrome web preview with iPhone-sized emulation, not native device execution. If a fresh export runner is used, isolate its ignored output/configuration and record its identity rather than mixing the existing preview snapshots.

## Completion Criteria

- Both browser picker consumers show the longer, slower profile and exact final row without delayed input takeover or stale acceptance. Native rates are updated through the existing public prop with physical acceptance explicitly pending.
- Immediate presets, explicit choices, reduced-motion behavior, lifecycle cleanup and manual busy ownership remain intact. No saved-state or timing/audio changes.
- Focused regression checks, lint/typecheck and exports pass on the final source; documentation matches the actual platform behavior and validation scope.
- One cohesive eventual commit is sufficient: `feat(duration): slow wheel inertia`. No commit, push or PR is part of this planning invocation.

## Implementation and Verification Evidence

Completed on 2026-11-11 on this branch, based on `03267c6`. Runtime changes are limited to the existing browser duration expression and native deceleration prop. Preset presentation, manual selection/busy ownership, watchdogs, persistence, timing/audio, dependencies and configuration were retained.

| Check | Result |
|---|---|
| New controller regressions before timing change | 6 failed / 9 passed, exposing the earlier speed and finish/deadline behavior |
| Same controller file after retuning | 15/15 passed |
| Strengthened Timer/Planning profiles on previous exported bundle | Both failed the new 300 ms moving-span bound: 290.0 / 289.7 ms |
| Same profiles on new export | Both passed; pilot spans 431.0 / 430.0 ms |
| `npm test` | 292/292 passed; no failures, skips or cancellations |
| `npm run lint`; `npm run typecheck` | Both exit 0 |
| Four planned Playwright files, one final run | 143/143 distinct cases passed in 4.8 minutes; no skips, retries or flaky results |
| Final-run Timer/Planning measured moving spans | 428.7 / 429.1 ms, with decreasing speed, exact row centering and existing action gates |
| Fresh `npm run export` for Android/iOS/web | Exit 0; all three bundle outputs verified |
| Rebuilt-export browser confirmation | 3/3 repeated checks passed in 8.1 seconds: both wheel profiles and the literal legacy → preset → navigation → real reviewed backup transfer → reload journey |
| Documentation checkpoint via `$aif-docs` | Existing README, factual context and AGENTS documentation map updated; 56 local link targets valid; changed passages reviewed. Meaning preservation: N/A — no requirements rewritten |

The first browser filter invocation selected no tests because of command-line quoting; it was corrected before the recorded two-case before/after comparison. Metro reported an unreadable cache and successfully fell back to a full crawl during exports. The final rebuild assigned different module IDs and its web bundle was not byte-identical to the 143-case tested export. Source/test/config/asset inputs stayed unchanged; the rebuilt output received the separate three-case confirmation above. Do not report those repeated checks as three additional unique scenarios or claim a full-suite rerun.

Evidence remains in ignored `.expo/slower-wheel-*.log` files, the Playwright JSON/trace outputs and `.expo/slower-wheel-inventory.json`. The inventory lists exact paths and per-file hashes:

- Source/test/config/native/asset inputs: 220 files, SHA256 `029236ac6537be064adb7ecaf7d2521ba166567428667403a60901554b2a3ed7`.
- Browser-tested export: 76 files, SHA256 `2637a644eec5136f022b7ae9aeb96a715490fc6d4f3d0218af8b30d89b1bd288`.
- Final 143-case runner/server: SHA256 `0fdc2ff74ca47de19c3088f8750265e5ae832efa73123d68ccdcef2e4e54555c`.
- Fresh final export: 76 files, SHA256 `5ebdca088f9f590e106dfda63e9fe242b979f3105a26d734ac41310ca6af6603`; its separate confirmation runner is fingerprinted in the same inventory.
- Command catalog and package/lock source hashes match the Verification Commands section.

Hashes use sorted project-relative paths followed by NUL, raw file bytes and NUL. Configuration inputs actually present are `app.json`, `eas.json`, `eslint.config.cjs`, `package-lock.json`, `package.json`, `playwright.config.ts` and `tsconfig.json`; documentation/progress edits are outside that runtime inventory.

Physical Android/iOS feel, snapping, gesture/accessibility and the previously deferred background/lock acceptance remain pending. No signed APK, installation, commit, push, PR operation or merge was performed. The earlier completed plans and unapproved Task 8 improvement proposal were preserved.
