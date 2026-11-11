# Implementation Plan: Animated Timer Quick Durations

Branch: `feature/animated-timer-presets`
Created: 2026-11-10 (Europe/Bucharest)
Mode: full
Status: complete — all seven implementation tasks verified; physical native acceptance remains deferred.
Base: clean `master` at `120cb4113dc6020b2d6eec610d35ff6d8510c3d4` (merged PR #19). `git pull --ff-only origin master` reported already up to date.

## Original Request

poti te rog aici sa adaugi cand aleg 1,5,10, 25 de minute sa se setezee momentat valoarea, dar sa se schimbe aceste cadrane ore, minute, secunde de parca eu leas scrola manual.

## Settings

- Retain the user's detailed-planning, tests, mandatory documentation and warnings/errors-only logging preferences.
- Scope: Timer's existing **1 / 5 / 10 / 25 minute** buttons. Set the accepted duration immediately; move changed hour/minute/second columns smoothly to that selection. Unchanged columns remain still. Do not start the timer automatically.
- Scrolling after a preset is presentation only. Start and the next preset remain available during this animation; a genuine manual wheel interaction retains its existing busy/validation guards.
- Android/iOS first, with the existing web preview. Reuse the shared motion/activity policy and existing scroll adapters; no dependency, permission, native configuration, stored setting or schema change.
- Use a short, finite glide rather than simulating a physical user gesture. Prefer platform scrolling; exact duration/easing is an implementation detail, not a new setting. Add a shared token only if the selected driver needs one.
- No new Planning presets. The new preset animation must not run for hydration, ordinary controlled-value synchronization, manual wheel selection or Planning Apply/Cancel. Preserve existing wheel limits, inertia, screen scrolling, drafts and focus.
- Keep the separate sheet-backdrop review suggestion, unanswered heading/Close choice and existing physical-device deferrals outside this feature.
- This invocation creates the plan and feature branch only. Do not implement, commit, push, restart previews or install an APK.

## Requirements Reconciliation

Authority: the Original Request and screenshot define the desired behavior. Earlier explicit preferences govern planning/tests/docs/logging. `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` constrain mobile compatibility, shared-state ownership and transient motion. Current Timer and wheel code establishes the existing accepted-action and manual-gesture behavior. No roadmap or research artifact applies.

| ID | Rule and source | Acceptance evidence |
|---|---|---|
| R1 | The four existing presets set the full duration immediately: hours/seconds zero, minutes 1/5/10/25. Source: Original Request; `src/app/timer.tsx` preset handler and `changeDuration`. | Assert the accepted/persisted target and current accessibility values while at least one column is still moving. Each accepted changed preset has one effective configuration update. |
| R2 | Changed columns visibly pass through intermediate positions and stop centered on the exact target; unchanged columns do not replay. Source: request to look manually scrolled. | Sample real browser animation frames and scroll offsets from a nonzero hours/minutes/seconds selection; verify bounded direction, intermediate movement and final alignment. |
| R3 | Motion never changes the selected duration, starts a clock, creates a run ID, requests permission or emits per-row feedback. Source: existing architecture and immediate-selection requirement. | Intermediate scroll/momentum/end callbacks cause no domain update, audio or permission request. The original accepted button feedback remains once per press. |
| R4 | Start can use the selected preset before its visual movement ends; another preset immediately replaces it. Source: immediate selection, refined as presentation-only motion. | Start during movement uses the latest full duration/deadline; rapid 1 → 25 → 5 ends at five minutes, with no stale writes or busy lock. |
| R5 | A real touch/drag/wheel/key/accessibility action supersedes presentation. Existing manual busy behavior remains authoritative. Source: `durationWheel.ts`, both adapters and duration-inertia tests. | Interrupt with real input; obsolete visual/end callbacks cannot finish the new gesture. A prolonged held touch stays busy, and a later settled manual choice is the only new selection. |
| R6 | Reduce motion/inactivity settles to the accepted target, without replay on return. Disablement, route departure, changed geometry and unmount cancel obsolete presentation. Source: shared motion/activity policy and lifecycle rules. | Initial/live Reduce motion, background/return, route changes, row-height changes and Start/unmount converge safely; stale callbacks cannot scroll a replacement view. |
| R7 | Same-value presets and ordinary re-renders are no-ops for timing and static presentation. Source: current `changeDuration`, no-op wheel behavior and immutable-update rules. | No extra write/run change/audio cancellation from an already selected preset or delayed visual completion; theme/language/notice updates do not replay movement. |
| R8 | Planning/manual wheel behavior, bounded values, independent clocks, legacy records and localization remain compatible. Source: shared picker callers, pure cores, literal fixture and existing tests. | Existing wheel/Planning regressions plus a literal legacy hydration → preset → real backup/export/review/import → reload journey. |

### Supported combinations

| Accepted input / state | State and side effects | Verification scenario |
|---|---|---|
| Idle or completed Timer × each valid preset × normal/reduced motion | Accept the existing effective configure operation immediately; normal motion changes only visual offsets, reduced motion aligns directly. Completed/no-op audio behavior stays with the current timing owner. | All four values in both editing states/policies; include a zero draft recovering to a preset. |
| Running/paused Timer | Existing preset UI stays absent; presentation cannot change the running duration, run ID or deadline. | Start during preset movement, then pause/resume/reload and inspect the exact accepted duration and independent activity IDs. |
| Multi-column nonzero selection → preset; unchanged target column | All changed units move toward bounded targets without wrap/carry. A column already centered at its target stays still. | For example 01:08:37 → 00:25:00; also a long-distance 23:59:59 → 00:01:00 and already-zero columns. |
| Rapid presets, including repeated same target during motion | Latest accepted target wins. Repeated requests for the current visual target do not restart it unnecessarily; animation completion never persists data. | Record accepted duration updates and actual offsets during rapid/repeated presses and late terminal events. |
| Actual manual interaction versus presentation | Presets/Start remain blocked only by genuine manual busy state. New manual input owns subsequent selection and cancels the visual request first. | Real touch/pointer/wheel, keyboard and accessibility-controller checks; run both supported-scrollend and fallback paths. |
| Live reduced motion, background, blur, disablement, layout change or unmount | Cancel/settle presentation without a manual selection callback. No foreground/remount replay. Geometry changes use the current row height and bounds. | Inject interrupted/late callbacks; real browser policy/route/viewport changes, followed by a new usable interaction. |
| Hydration, language/theme changes and Planning panels without an explicit preset request | Preserve immediate synchronization, stable column keys, draft values, focus and offsets. Do not infer animation from every changed value prop. | Existing Planning coast/Cancel/Apply/50-step checks and six-language light/dark compact/enlarged samples. |

Representative existing artifact: use `tests/fixtures/app-v1-before-planning.json` unchanged. Preserve its history, lap/user text and false preferences through an accepted preset, navigation, actual backup download, reviewed additive import and reload. Assert only the existing Timer configure behavior changes timing; independent stopwatch/Planning state and real completion ownership remain intact.

Meaning preservation: PASS — all four requested durations, immediate selection and manual-looking column motion are retained. Start availability during visual motion and interruption rules make the existing action contract explicit. No new scheduling feature, saved animation preference or manual-inertia rewrite is introduced.

## Verified Code and API Context

- Manifest: Expo `~57.0.32`, React Native `0.86.3`, React Native Web `0.21.2`; npm/committed lockfile. Read matching docs again before implementing platform API changes.
- `timer.tsx` already applies each preset through `changeDuration(durationParts(minutes * 60000))`. The `selected` ref supplies the immediate Start value; valid effective changes use `timerControls.configure`. `wheelBusy`/`moving` currently represent genuine manual interaction, not presentation.
- `DurationPicker` renders stable per-unit keys and aggregates manual busy flags. `DurationWheelProps` currently has no programmatic-motion intent. Timer and the Planning duration subpanel share this component.
- `useDurationWheel` synchronizes changed value/rowHeight/disabled props in a layout effect. `createDurationWheel.synchronize` cancels gesture work and calls immediate alignment. Simply adding smooth scrolling after a value change would first jump to the destination, while treating programmatic scroll as a drag could commit intermediate values.
- Native alignment currently calls `ScrollView.scrollTo({ y, animated: false })`; native scroll/momentum callbacks already feed the manual controller. Web alignment assigns `scrollTop`; its existing two-frame overflow/transform workaround stops compositor-owned manual flings. Preserve that ownership and restore temporary DOM styles on every termination path.
- The injected manual controller ignores ordinary scroll/end events while idle. It has stale-generation, endpoint, geometry, simultaneous-column and prolonged-touch coverage. New presentation must not turn those events into a manual interaction or bypass its held-touch protection.
- `MotionProvider` supplies a shared live Reduce motion/activity policy. Do not add a second OS observer. Route focus may be passed to the preset presentation path without changing scene gates or suspending a portaled sheet.
- Public native scrolling supports `scrollTo({ y, animated })`. Browser smooth scrolling exists, but completion and cancellation must be capability-aware: a no-op need not emit `scrollend`, and implementation must not require a new promise-returning `scrollTo` API. Ignore obsolete terminal events and provide bounded presentation cleanup without an idle polling loop.

Official references checked: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview#scrollto), [browser scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo), and [scrollend semantics](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event). Installed SDK/browser types and capability checks govern the actual adapters.

## Commit Plan

Advisory checkpoints; do not automatically commit/push during implementation. Shared files may overlap, so the later commit workflow must inspect actual hunks before splitting.

- After tasks 1–3: `feat(ui): add cancellable programmatic wheel scrolling`
- After tasks 4–7: `feat(timer): animate quick duration selection`

## Tasks

### Phase 1: Transient presentation and platform adapters

- [x] Task 1: Define explicit preset-presentation intent and a small injected visual owner.
  - Files: `src/components/DurationWheel.types.ts`, `src/components/DurationPicker.tsx`, new `src/hooks/wheelPresentation.ts`, new `tests/wheelPresentation.test.ts`, `package.json`.
  - Add an optional transient request revision passed consistently to all three columns, plus presentation eligibility if needed for route focus. Ordinary callers omit it and keep immediate synchronization. Targets come from the accepted controlled value, not a second editable duration store.
  - The visual owner handles target/geometry, latest-generation cancellation, no-op targets, immediate reduced/inactive alignment, finite completion/failure fallback and disposal. Distinguish direct manual takeover (stop at the current displayed offset) from lifecycle settlement (align the accepted target). It has no persistence, selection, busy, audio or permission callback. Invalidate generations before stopping platform work; stopped/synchronous/late callbacks cannot own a replacement.
  - Register meaningful controller regressions in `npm test` immediately: rapid targets, unchanged target, disposal/reactivation, failures, policy/geometry changes and stale terminal/fallback callbacks. Keep the helper local and small; do not generalize the app's gesture system.
  - Logging: bounded WARN for unexpected driver failure only; no successful input/frame/value logs. Refresh command-source/catalog hashes after test registration.
  - Requirements: R2–R7. Dependencies: none.

- [x] Task 2: Integrate presentation into the existing hook and native wheel without changing manual ownership.
  - Files: `src/hooks/useDurationWheel.ts`, `src/components/DurationWheel.tsx`, `src/hooks/durationWheel.ts` only if a narrow synchronization contract is required; `tests/durationWheel.test.ts` and `tests/wheelPresentation.test.ts`.
  - Handle an explicit committed request before ordinary value synchronization can jump to its target. Cancel obsolete gesture work first, then glide from the currently displayed offset using the native scroll adapter. Default mount/prop/Planning alignment remains immediate.
  - Programmatic native scroll/momentum/end events must not create busy state, commit intermediate rows or finish a newer manual drag. Direct touch/wheel takeover stops visual movement at the displayed offset and hands that position to the existing gesture owner; key/accessibility choices continue to derive from the accepted controlled value. Cancel presentation before delegation. Terminal/fallback work may only finish presentation at the current target.
  - Read the existing motion policy; settle on reduced motion, inactivity, disablement, eligibility loss, geometry changes and teardown. No per-frame React/shared-state writes or recurring idle work. Do not assume native momentum events always identify programmatic completion.
  - Verify with injected driver/event races and installed native types. Keep platform gesture feel and physical accessibility acceptance explicitly pending.
  - Logging: existing operation errors plus task 1's bounded unexpected-driver WARN; normal input and cancellation remain quiet.
  - Requirements: R1–R8. Depends on task 1.

- [x] Task 3: Add cancellable web glide while preserving scroll-snap and compositor cancellation.
  - Files: `src/components/DurationWheel.web.tsx`, shared hook/visual owner only as needed; related controller regressions.
  - Animate the actual column offset without changing page scroll, synthesizing a gesture, or routing intermediate scroll events to selection. Reuse browser scrolling when suitable; any finite frame fallback writes DOM presentation only.
  - Coordinate with `alignment`/`releaseAlignment`: an old two-frame restore, smooth-scroll end or fling cannot overwrite a newer request or real user gesture. Preserve physical-touch ownership, snap geometry, focus, overflow and temporary transforms on completion, interruption, policy change and unmount. Do not rely on a `scrollTo` promise or one guaranteed `scrollend` event.
  - Support capability fallback and no-op alignment without leaving pending work. Verify current DOM/browser types and the existing manual cancellation regressions, including native scrollend detection disabled by the test fixture.
  - Logging: bounded failures only; no scroll/frame logging or new debug flag.
  - Requirements: R2–R8. Depends on tasks 1–2.

### Phase 2: Timer integration and acceptance

- [x] Task 4: Wire quick-duration buttons to immediate selection plus opt-in movement.
  - Files: `src/app/timer.tsx`, `src/components/DurationPicker.tsx`, optional `src/theme.ts` presentation token.
  - In each accepted existing preset handler, configure the full target through the current `changeDuration` path and publish a local visual request in the same interaction. Retain `selected.current` as Start's immediate source. Do not wait for animation, issue a configure per column/frame, or add animation to ordinary changes.
  - Presentation does not set `moving`/`wheelBusy` or disable Start/presets. Preserve the existing guards during actual manual motion. Start cancels/disposes the visual request when the picker hides; rapid choices use the latest target. Existing no-op configure behavior and feedback count remain unchanged.
  - Pass route eligibility to presentation without remounting columns, adding saved state or affecting a portaled confirmation. Change only columns whose displayed offset differs from their accepted target; same-value requests do not replay a settled view.
  - Logging: no new runtime logs, feedback sounds or per-row haptics.
  - Requirements: R1–R8. Depends on tasks 1–3.

- [x] Task 5: Add real preset-motion journeys and preserve shared-picker regressions.
  - Files: new `tests/e2e/timerPresetMotion.spec.ts`; focused additions to `tests/e2e/usability.spec.ts`, `durationInertia.spec.ts`, `durationPicker.spec.ts`, `backup.spec.ts` and controller tests only where coverage is missing.
  - Sample real intermediate offsets under normal motion while asserting the target duration/accessibility values are already accepted and Start is enabled. Cover all four presets, idle/completed states, zero recovery, three changed columns, long travel, unchanged columns and same-target no-ops. Assert final centering, no page movement and no extra storage writes.
  - Cover rapid/repeated choices, immediate Start during motion, manual touch/wheel/key takeover, held-touch action gating, old scroll/end/fallback events, live Reduce motion, background/return, route departure, unmount and changed row geometry. Preserve independent stopwatch/Planning IDs/deadlines and existing completion/Stop behavior.
  - Use real frames for movement tests; frozen-clock domain fixtures explicitly select Reduce motion. Include six-language/two-theme compact/enlarged samples and the literal legacy real-transfer journey described above. Retain existing Planning coast/Cancel/Apply/virtualized return behavior and current timeout/retry policy.
  - Logging: assertion diagnostics/page errors only; traces and screenshots stay ignored. Do not weaken original functional assertions to accommodate motion.
  - Requirements: R1–R8 and every material combination above. Depends on tasks 1–4.

### Phase 3: Documentation and final evidence

- [x] Task 6: Complete the documentation checkpoint through `$aif-docs`.
  - Files: `README.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `AGENTS.md` only for factual module/test-map changes; this plan's progress.
  - Document immediate preset acceptance with visual scrolling, latest-target interruption, immediate Start and Reduce motion. Preserve manual wheel/Planning behavior and the absence of a new setting/schema. Map the actual chosen helper/tests without unrelated restructuring.
  - Distinguish actual Node/browser/bundling results from pending native gesture/accessibility acceptance. Validate edited relative links. No new visible copy is expected; if necessary, localize it through all six typed catalogs.
  - Logging: none. Requirements: R1–R8. Depends on tasks 4–5.

- [x] Task 7: Run source-bound quality gates and record native deferrals.
  - Files: plan progress/evidence; only feature code/tests if real failures require correction.
  - Run registered Node tests, lint, typecheck, new browser scenarios and the affected Timer/Planning/inertia/transition/legacy-transfer checks, then all-platform export. Because both shared wheel adapters change, complete a full browser coverage pass after focused regressions. Use exact declared case/source accounting if a host interruption requires bounded runs; do not inflate budgets or retries.
  - Refresh the command catalog after any manifest change. Bind results to the actual source/test/config/asset inventory, including the real `eslint.config.cjs`; generate prose from that inventory. Rebuild any exported preview after app changes instead of testing an older cached export. Preserve the currently running previews.
  - Audit stale callbacks, duplicated busy/selection owners, geometry, focus, frame cleanup, no-op persistence and unchanged audio/notification owners. Keep physical Android/iOS scrolling smoothness, keyboard/Back, font scaling and TalkBack/VoiceOver deferred under the existing user decision; exports prove bundling only.
  - Logging: concise gate/failure evidence only. Do not commit/push or install a device build automatically.
  - Requirements: R1–R8. Depends on tasks 1–6.

## Planned Commands and Evidence Contract

Discovery: `ai-factory commands --json`, repository root. Catalog revision `9a8fff21549ca75958c6f8f88c0a97c1c9d3b98c7691de9effb75c6a4aa690eb`. `package.json` byte SHA256 `1fe681e35878f47d7d83159f0557f6d263a97d336a0cef3a16738986c76e4de6`; lock SHA256 `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh after adding the registered Node file. These commands are declared, not implementation evidence.

All command IDs below use CWD `.` and the established Windows Node 24+/npm toolchain from WSL.

| Command ID | Planned invocation | Evidence |
|---|---|---|
| `package.json#/scripts/test` | `npm test` | New injected visual-owner regressions plus existing timing/gesture/state tests. |
| `package.json#/scripts/lint` | `npm run lint` | Required lint. |
| `package.json#/scripts/typecheck` | `npm run typecheck` | Required native/web/ref/scroll API compatibility. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/timerPresetMotion.spec.ts tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/usability.spec.ts tests/e2e/timer.spec.ts` | Presets, true movement, immediate state, takeover and existing Timer behavior. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/editorScrolling.spec.ts tests/e2e/planningScroll.spec.ts tests/e2e/planning.spec.ts tests/e2e/backup.spec.ts tests/e2e/sheetTransitions.spec.ts` | Shared Planning/scroll/lifecycle and literal real-transfer compatibility. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e` | Full final browser coverage; preserve tracked settings/budgets and source accounting. |
| `package.json#/scripts/export` | `npm run export -- --output-dir .expo/animated-timer-presets-export` | Android/iOS/web bundle compatibility only. |

## Planning Evidence

- Prior full-plan/tests/docs/minimal-logging preferences are reused; no new product choice is required. This plan interprets the requested immediate setting as keeping Start available during presentation only, without weakening genuine manual-motion guards.
- Direct read-only exploration covered Timer handlers, the shared picker/native/web adapters, injected settling controller, motion policy and current preset/inertia/legacy tests. No application changes or package acquisition were performed.
- The Git baseline was clean and up to date before creating this branch; all 473 tracked files were byte-snapshotted outside the repository. Final checks confirm they remain byte-identical and only this plan is added. The exact Original Request, seven unchecked task IDs, per-task logging/dependencies, existing command targets/source hashes and whitespace were checked.
- Planning baseline `npm run lint` and `npm run typecheck` passed (exit 0). These validate the existing application, not the unimplemented feature. Node/browser/export checks are planned for implementation, not claimed as newly executed here.
- No roadmap/research artifact applies. Prior heading and backdrop-focus follow-ups stay separate. Physical native acceptance remains pending/deferred.

## Implementation Progress

- Task 1: eight new injected visual-owner tests are registered immediately; all 276 Node tests and typecheck pass. No timing/selection/busy callback exists in the visual owner. Command discovery was refreshed after registration.
- Task 2: shared committed-request bridge and native animated scroll compile; lint/typecheck and all 277 Node tests pass. Added a manual-controller regression for cancellation without an initial target jump. Native physical gesture/accessibility acceptance remains deferred.

- Task 3: lint/typecheck pass and all four existing Timer/Planning prolonged-touch browser cases pass, including scrollend-disabled fallback. The first attempt could not connect before port 8093 was ready; the unchanged rerun passed after HTTP readiness was confirmed.

- Task 4: Timer publishes a local revision after accepting each preset and passes route focus. Lint/typecheck and both existing quick-setup/zero-recovery browser journeys pass. Start still reads the synchronous selected ref; the new visual owner never reports manual busy.

- Task 5: all 64 focused browser cases pass (50 new preset journeys plus 14 existing inertia regressions), with 277 Node tests, lint and typecheck passing. The initial 47/50 run exposed background/blur compositor drift and a stale scrollend before the first wheel delta. Lifecycle alignment now uses the existing compositor-cancellation frame; manual takeover suppresses the cancelled nearest-snap end until real displacement or the existing idle fallback. The unchanged failing scenarios were rerun successfully before the combined pass. Frame sampling measures rendered row geometry, including the existing temporary cancellation transform. Physical native checks remain deferred.

- Task 6: `$aif-docs` updated existing README Timer usage and factual DESCRIPTION/ARCHITECTURE/AGENTS module/test maps. Meaning preservation: PASS against R1–R8 (immediate acceptance, visual-only Start availability and manual guards retained). All 45 relative file links across edited docs resolve; no new copy/catalog/schema/settings were added. Existing long README structure was retained within the requested feature scope. Native acceptance remains explicitly pending. Documentation outcome: updated existing docs.

- Task 7 underway: Android/iOS/web export succeeds (76 exported files). Final source/test/config/asset inventory binds 218 files, including the actual `eslint.config.cjs`, to SHA256 `a303ffae366a6399c82131ac5a8cff3f01dd42ab714c6fe43f14578487abfce8`. An isolated fresh static preview on port 8094 serves that export; existing 8091/8092 previews are preserved. Full browser execution uses the tracked device/viewport/45-second/one-worker/no-retry policy with only preview URL, output and JSON reporting overridden. Refreshed command catalog revision: `44d44eb1e3986c33ab53f5acb039baef63e7754b08b4c8a2416216fb9987b95a`; package SHA256 `ec9c8311b3621e8c92783d82753cf3b7380d97d4d3aa3c958435de8060316e23`; lock and ESLint config remain unchanged from planning.

- Task 7: PASS — 277 registered Node tests, final lint/typecheck and fresh Android/iOS/web exports. Full browser execution passed **455/455** cases in **18.8 minutes** (exit 0), with **0 skipped, 0 unexpected, 0 flaky and 0 retries**, using Windows Node **24.15.0** / npm **11.12.1**. All 455 declared identities match all 455 executed/passed identities across 22 test files, including every nested title/project; canonical sorted identity SHA256 `9e7cb41b1c3fcad5786a3dd322299aae1bd859246c58889d59b5c52b31642643`. The full pass includes all 50 new preset cases and all 405 existing cases.
- Final source binding: all **218** inventoried source/test/config/asset files and all **76** export files remained byte-identical throughout the final run. Source SHA256 `a303ffae366a6399c82131ac5a8cff3f01dd42ab714c6fe43f14578487abfce8` hashes each sorted relative path, NUL, exact bytes, NUL. Scope: tracked `src/`, `tests/`, `assets/`, `modules/`, `scripts/`, the three new source/test files, and actual root package/lock/app/EAS/TypeScript/ESLint/Playwright configuration. The two ignored static runner/server files were independently snapshotted and remained unchanged. Source inventory and export map: `.expo/preset-verified-inventory.json`; declared cases: `.expo/preset-full-catalog.json`; actual report: `.expo/.expo/preset-full.json`; exact accounting: `.expo/preset-final-accounting.json`. These local evidence files are ignored, not app deliverables.
- Commands executed from repository root with the refreshed catalog IDs above: `npm test`, `npm run lint`, `npm run typecheck`, `npm run export -- --output-dir .expo/animated-timer-presets-export`, and `npm run test:e2e -- --config .expo/preset-static.config.ts --output .expo/preset-full`. The static runner inherits the tracked browser/device/viewport/timeout/worker/retry settings; only the fresh preview URL, output and reporting differ. It serves the just-built export on 8094, not the preserved older preview on 8092.
- Audit: no selection, busy, persistence, feedback or permission callback exists in the visual owner. Generations are invalidated before stopping drivers, cleanup is finite, manual takeover differs from lifecycle settlement, and no successful input/frame logging is added. Timing/audio/notification/native configuration owners, catalogs, lockfile, schema and literal legacy fixture remain unchanged. No commits, pushes, PRs or device installs were performed. Documentation: updated existing docs. All edited documentation links resolve; Git/new-source whitespace checks pass.
- Native deferrals retained: physical Android/iOS scrolling feel, actual background/blur ordering, keyboard/Back, OS font scaling and TalkBack/VoiceOver. Browser touch emulation, enlarged web text and successful bundling do not establish these checks. Prior sheet-backdrop focus advice and unanswered title/Close placement remain outside this feature. No roadmap artifact or linked milestone applies.
