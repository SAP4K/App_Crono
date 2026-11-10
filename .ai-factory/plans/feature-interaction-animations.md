# Implementation Plan: Consistent Interaction Animations

Branch: `feature/interaction-animations`
Created: 2026-11-10
Mode: full
Status: completed — 9/9 implementation tasks verified; physical native acceptance remains deferred.

## Original Request

poti te rog sa adaugi ceva animatii la apasarea de butoanelor.... la interactiunea cu userul

## Settings

- Testing: yes — meaningful lifecycle/controller tests and real browser interactions.
- Logging: minimal — warnings/errors at unexpected platform boundaries only; no routine press, render, animation-frame, or saved-data logs.
- Docs: yes — mandatory completion checkpoint through `$aif-docs`.
- Preferences: reuse the user's previously selected full planning, tests, documentation, and warnings/errors-only logging.
- Platforms: Android and iOS first; retain the existing web preview and accessible keyboard interaction.
- Dependencies: use the installed React Native `Animated` and `AccessibilityInfo` APIs; no new package, native module, permission, or persisted preference is planned.
- Default language: Romanian; retain all six catalogs and user-entered text.
- Git base: local `master` at `139cebbb65a28c0153f76b754b8c5ca5d68001d0`. The previous branch, `feature/unified-window-scrolling`, had the same HEAD. The new branch was created directly from that HEAD without changing the existing dirty working tree. Remote freshness was not checked.

### Existing work and scope boundary

Preserve the current uncommitted scrolling changes in `ScheduleEditorSheet.tsx`, `Sheet.tsx`, their browser tests, README, DESCRIPTION, ARCHITECTURE, learning patch, and `.ai-factory/plans/feature-unified-window-scrolling.md`. They are the starting application state, not animation implementation. Do not reset, stash, commit, reattribute, or mark their pending tasks complete as part of this plan.

The earlier scrolling plan still has an unanswered shared title/Close placement decision. This feature does not decide it: animate the controls wherever they currently live, retain the single body scroll owner, and preserve covered-editor layout/focus/offset behavior. The local preview on port 8091 can remain running.

## Requirements Reconciliation

Authority: the current user request defines the feature; explicit earlier user preferences define planning/testing/docs/logging. `AGENTS.md`, `.ai-factory/rules/base.md`, and `.ai-factory/ARCHITECTURE.md` constrain implementation. Existing source and tests establish compatibility requirements, not additional permission to change behavior. The old scrolling plan remains authoritative only for its own unfinished scope. No selected research or roadmap artifact applies.

| ID | Decision and evidence | Acceptance evidence |
|---|---|---|
| R1 | Add short, consistent visual feedback to visible button interactions across screens, settings, sheets, disclosures, and selectors. Source: Original Request; current static feedback in `src/theme.ts`, routes, and component press styles. | Real held/released presses show finite feedback across the surface inventory below. |
| R2 | Proposed visual defaults: scale 1 → 0.98 and enabled opacity feedback equivalent to the current shared 0.72, approximately 90 ms down / 140 ms back, no overshoot or looping. Centralize these adjustable values. These values are implementation choices, not numbers requested by the user. | Endpoint and neutral-state assertions use tolerances/eventual convergence, with compact-screen visual checks. |
| R3 | Respect the live OS/browser reduced-motion setting. Suppress scale and timed interpolation under reduced motion; retain immediate pressed feedback. Default conservatively while the asynchronous setting is unknown/unavailable. Source: `AGENTS.md` mobile/accessibility requirements; versioned AccessibilityInfo docs and installed web adapter. | Initial-query/event races, live changes, foreground refresh and real browser reduced-motion emulation. |
| R4 | Preserve stock Pressable activation, cancellation, roles, focus, disabled rules, Link integration, and immediate handlers. Source: existing controls, `tests/e2e/planningButtons.spec.ts`, editor focus tests, and `src/app/history.tsx` Link asChild. | Touch cancellation, mouse release outside, Enter/Space once, ref restoration and Link navigation. |
| R5 | Keep presentation transient. No persistence schema, timing identities, deadlines, audio ownership, haptic ownership, permission policy, or backups change. Source: architecture, base rules, CronoContext and existing timing/transfer guards. | Domain assertions during interactions and the literal legacy fixture journey; no writes from motion completion. |
| R6 | Preserve wheel inertia, busy guards, scrolling, virtualization, safe areas, and editor drafts. Source: AGENTS, `useDurationWheel.ts`, current dirty scrolling implementation and its plan. | Existing real wheel/scroll/focus regressions; no animation wrapper around duration-wheel rows or scroll containers. |
| R7 | Preserve native Switch behavior; give the existing web switch a short thumb/track transition with reduced-motion support. Retain immediate checked state, 44-point-or-greater target and accessible switch semantics. Source: `SettingsSwitch.tsx` and `.web.tsx`. | Actual click/keyboard preference changes, checked state, reduced-motion and layout checks. |
| R8 | Reuse installed APIs without idle animation loops, per-frame React state, extra sounds/haptics, or delayed gesture-bound actions. Source: mobile performance rules and current sharing/audio/permission/file-picker adapters. | Controller cleanup tests, static-screen animation settling, real browser preview/download/chooser checks. |
| R9 | Provide tests and documentation, minimal logging, factual cross-platform evidence. Source: prior explicit user answers and project validation rules. | Tasks 1–2 register tests immediately; tasks 7–9 record source-bound checks and deferred native acceptance separately. |

### Supported combinations

Motion state is transient and never persisted. Existing domain writes below occur only through their existing accepted handlers.

| Combination / accepted input | Persisted state | Output / transition and invariants | Verification |
|---|---|---|---|
| Enabled ordinary button + normal motion + touch/mouse press and release inside | Existing domain action only after accepted activation | Animate toward pressed and back; action executes once at the stock event time, never after awaiting animation. | Held press does not act; release acts once; return reaches neutral. |
| Enabled button + release outside, scroll takeover, or touch cancellation | None from cancelled gesture | Return to neutral; no action/haptic/domain mutation introduced by visual callbacks. | Existing mouse cancellation and real CDP touchCancel plus editor-scroll gesture. |
| Keyboard-focused button/disclosure/tab + Enter or Space as supported by its existing role | Existing accepted action only | Preserve visible focus and platform keyboard semantics; feedback does not double-trigger or override tabPress prevention. | Keyboard Start, disclosure and tab navigation; cancellable tab behavior audit. |
| Disabled at rest or becomes disabled during a held press | Existing parent/domain state only | Stop animation; preserve the exact disabled opacity/role and stock activation guards. | Boundary controls, zero/busy duration guards and disabling during a hold. |
| Rapid re-press, blur/background, covered/closed sheet, or unmount during transition | No motion write | Stop/supersede stale animation; stale callbacks cannot reset a newer press or call a handler. | Injected stale-callback tests and real repeated open/close/press actions. |
| Reduced motion already on, becomes on/off during a press, or startup query resolves after a newer event | None | Current setting wins; reduced mode uses immediate opacity without scale/interpolation. Disabled/inactive controls remain neutral. | Injected query/event ordering; browser live media changes during hold. |
| Foreground return after a missed setting change; API unavailable/query fails | None | Re-read through one shared observer; conservative fallback, cleanup and no unresolved promise updates after disposal. | Injected activity refresh, absent optional web subscription and rejection tests. |
| Selected radio/checkbox/tab/theme/language item + accepted press | Existing chosen preference/selection | Checked/selected state commits immediately; press feedback layers onto existing selected colors without overwriting base transforms. | Theme/language/duration choices, selected tab and repeat/calendar selections. |
| Ref-bearing control or Link asChild inside a sheet/list | Existing action only | Preserve actual focus host, injected navigation props and layout footprint; no new focusable wrapper. | Real History link, Settings return focus, editor source focus and virtualized scrolling. |
| Timer/Planning control while a duration wheel is moving or value is zero | None from rejected action | Existing synchronous motion and finite-bound guards reject Start/Apply; wheel physics remain independent. | Existing durationInertia/durationPicker cases plus rapid button input. |
| Web switch versus native Switch, normal versus reduced motion | Existing boolean preference only | Web animates thumb/track briefly while aria-checked changes immediately; reduced web is instant; native retains OS movement. | Web pointer/keyboard/reduced-motion cases; native check recorded separately. |
| Light/dark + six supported languages + compact viewport / enlarged text | Existing saved choices only | Preserve readable labels, hit targets, focus rings, selected contrast and unshifted list/scroll geometry at rest and while pressed. | Table-driven browser layout samples; native text/accessibility acceptance remains pending when unavailable. |
| Gesture-bound audio preview, Share, permission request, file upload/download | Existing accepted operation only | Invoke from the original user event; no timer, await, animation callback or new feedback sound in front of it. | Existing sound/backup/sharing tests with real browser download/file chooser/clipboard events. |

Representative real artifact: use `tests/fixtures/app-v1-before-planning.json` through the existing app storage/hydration helpers, then open/cancel/confirm real preferences, export through the browser and reload/import through the existing reviewed flow. Preserve fixture history, false preferences and saved text; preserve active run snapshots/IDs/deadlines except explicitly invoked domain actions. Do not replace this path with a mock-only motion test or rewrite the fixture to fit the implementation.

Meaning preservation: PASS — the requested interaction feedback is planned; proposed styling values are identified as choices, existing behavior remains a compatibility constraint, and unfinished scrolling decisions/native acceptance remain open.

## Verified implementation context (planning baseline)

- Installed versions: Expo `~57.0.32`, React Native `0.86.3`, React Native Web `0.21.2`, React `19.2.3`. Reanimated `4.5.1` is installed but unused in app source; a new animation library is unnecessary for finite press opacity/scale.
- The source inventory contains 73 Pressable instances across 19 files; mapped options produce additional runtime buttons. Most use instantaneous opacity/scale and several settings choices have no visual pressed style. Native/web duration wheels and the invisible sheet backdrop are deliberate exceptions.
- `src/theme.ts` exposes `buttonPressedStyle` with opacity 0.72 / scale 0.98. Migrated controls must not stack that instantaneous feedback with a second animated owner. Preserve disabled opacity and any unrelated base transform.
- Important web pitfall: installed RNW Animated wraps/flattens `style` before Pressable resolves function styles. A mechanical `Animated.createAnimatedComponent(Pressable)` replacement can drop existing style callbacks. Task 2 must prove a style/ref-safe adapter before any bulk migration.
- Keep stock Pressable as the only interaction/focus host. A compatible design carries the caller's style function under a separate adapter prop, resolves it using stock Pressable's state, and composes the plain animated style there. Forward the actual View ref and every remaining prop, including Router-injected web click/link props. Do not add a layout wrapper merely to bypass this contract.
- `AccessibilityInfo` supports native and installed web reduceMotionChanged/query behavior. Its optional web subscription can be absent and must be cleaned up safely. Installed Reanimated `useReducedMotion` describes a startup-only value and is insufficient by itself for live policy.
- `src/hooks/appActivity.ts` already supplies foreground observation. A single shared motion provider can observe activity/reduced motion; per-control animation values should not add separate AppState/media-query listeners.
- `tests/e2e/planningButtons.spec.ts` checks held 0.72/0.98 feedback, release, disabled opacity, clock independence, confirmation and real touchCancel. Update instantaneous endpoint expectations to bounded convergence without weakening behavioral checks. A released identity matrix and CSS `none` can represent the same neutral transform.
- The existing Modal uses fade and tab screens use no screen transition. Gate the existing modal fade off for reduced motion; do not introduce a new sheet animation lifecycle, screen transitions, list entry/layout animations or a title placement change.

Official API references checked for this plan: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [React Native 0.86 Animated](https://reactnative.dev/docs/0.86/animated), [AccessibilityInfo](https://reactnative.dev/docs/0.86/accessibilityinfo), and [Pressable](https://reactnative.dev/docs/0.86/pressable). Recheck matching docs before API implementation if package versions change.

### Surface inventory and exceptions

| Group | Existing files / interactions to preserve |
|---|---|
| Shell and shared actions | `src/app/_layout.tsx` tabs/settings/storage-warning dismiss; `src/components/Sheet.tsx` Back/Close/confirmation; `ActiveActivities.tsx`; `TimingNotices.tsx` Stop; `SystemNotificationNotice.tsx` retry/setup. |
| Stopwatch, Timer, History | `src/app/index.tsx`, `timer.tsx`, `history.tsx`; existing timing/reset/save, presets/extension, history details/delete/share and Link asChild. |
| Planning list and execution | `src/app/planning.tsx`, `src/components/ScheduleCard.tsx`, `PlanningRunCard.tsx`; templates/date filters, Start/options/edit/duplicate/delete and run controls. |
| Planning editor | `ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx`, `ScheduleCalendarPanel.tsx`, `ScheduleRepeatPanel.tsx`; name/duration launchers, reorder/delete, Apply/Cancel/Save, weekdays/modes/repetition. |
| Settings and transfers | `SettingsSheet.tsx`, `BackupSettings.tsx`, `BackgroundNotificationHelp.tsx`; group disclosure, language/theme/sound/duration/preview, import/export/review and system shortcuts. `SettingsSwitch.web.tsx` has a separate transition task. |
| Deliberate exceptions | DurationWheel native/web gesture-owned rows; invisible backdrop; TextInputs; native Switch; passive clocks/lap rows/notices. Keep their present semantics and rendering owners. |

## Commit Plan

Advisory checkpoints only; do not auto-commit, push or open a PR during implementation without a separate user request. Preserve unrelated dirty work when preparing eventual commits.

- Commit 1, after tasks 1–3: `feat: add accessible shared interaction motion`
- Commit 2, after tasks 4–6: `feat: animate controls across timing planning and settings`
- Commit 3, after tasks 7–9: `test: verify and document interaction animations`

## Tasks

### Phase 1: Shared policy and proven foundation

- [x] Task 1: Add centralized motion tokens and one live reduced-motion/activity owner.
  - Files: modify `src/theme.ts`, `src/app/_layout.tsx`, `package.json`; create `src/hooks/motionPreference.ts`, `src/context/MotionContext.tsx`, `tests/motionPreference.test.ts`.
  - Deliverable: central short press/release timings, scale/opacity constants and a shared context/hook exposing resolved policy and activity. Keep policy and injected query/subscription lifecycle logic testable without importing React/native APIs into the pure core.
  - Subscribe before reading the initial async setting; guard late reads against newer events, overlapping foreground refreshes and disposal. Start reduced, use live reduceMotionChanged, refresh through existing appActivity, and remove optional subscriptions on cleanup. Do not key/remount providers/routes/drafts or block app hydration on motion readiness.
  - One observer owns native/browser subscriptions. Do not persist OS motion state, add an app preference, poll, or change global appearance/timing owners.
  - Verification: deterministic query/event ordering, unavailable/rejected query, live updates, missed-event foreground refresh and cleanup tests. Register the new test in npm test in this same task; refresh command-catalog metadata after package.json changes.
  - Logging: at most bounded WARN on unexpected platform-query failure, if useful; no routine state/event logs or user payloads. Missing optional support uses the conservative fallback without repeated warnings.
  - Requirements: R2, R3, R5, R8, R9; supported reduced-motion/activity combinations above.
  - Dependencies: none; preserve the existing working tree baseline.

- [x] Task 2: Build and prove a ref-safe animated Pressable adapter before migrating controls.
  - Files: create `src/components/MotionPressable.tsx`, `src/hooks/pressMotion.ts`, `src/hooks/usePressMotion.ts`, `tests/pressMotion.test.ts`; modify `package.json`; pilot one existing common control in `src/components/Sheet.tsx` and add its focused browser coverage in `tests/e2e/interactions.spec.ts`.
  - Deliverable: same stock Pressable interaction/focus host and caller API, with a stable per-control Animated.Value and finite scale/opacity transitions. Preserve style functions, render-prop children, forwarded View refs, hitSlop, pressRetentionOffset, accessibility/test props, web focus styling and Router-injected props.
  - Resolve caller style callbacks inside the Pressable adapter rather than allowing RNW Animated's flattening to consume them. Compose animated visual values with base styles without losing disabled opacity or base transforms. Prove the adapter with the pilot and typecheck before broad replacement; do not add an unverified outer layout/focus wrapper.
  - Compose caller press-in/out callbacks, keep onPress immediate and stock-owned, and never invoke a domain action from animation completion. Use native-driver-supported opacity/transform on native, the web driver on web, and non-interaction animations so virtualized lists are not held busy.
  - Supersede stale transitions on rapid presses; stop/reset on cancellation, disabled/inactive/covered state and unmount. On reduced-motion changes stop interpolation and use immediate appropriate feedback. A stale completion cannot neutralize a newer press. A blurred control must not retain a stuck pressed appearance.
  - Verification: injected animation-driver tests for cancel/repress/disabled/background/dispose and stale callbacks, registered immediately in npm test; real pilot held/released/cancelled/keyboard actions, style-function selected/disabled states, focus and geometry. Avoid mock-only tests that merely restate animation constants.
  - Logging: no per-press/frame logs; animation cancellation is expected, not an error. Any unexpected boundary failure must retain usable immediate feedback without calling the action twice.
  - Requirements: R1–R6, R8, R9; accepted/cancelled/disabled/rapid/keyboard/ref combinations.
  - Dependencies: task 1.

- [x] Task 3: Apply the proven primitive to shell and shared controls.
  - Files: `src/app/_layout.tsx`, `src/components/Sheet.tsx`, `ActiveActivities.tsx`, `TimingNotices.tsx`, `SystemNotificationNotice.tsx`; focused `tests/e2e/interactions.spec.ts` coverage.
  - Deliverable: consistent press feedback for tabs, settings opener, storage dismiss, activity controls, Back/Close/confirm/cancel, sound Stop and notification retry/setup.
  - Preserve tabPress emission/preventDefault, accepted-change haptics, accessibility selection, exact activity-run owners, notice lifetime, Sheet closeButtonRef, return focus, backdrop behavior and isolation. Do not add a second responder or animate passive notices/clock containers.
  - Use no modal fade when reduced motion is enabled, retaining the existing fade otherwise. Do not change scroll owners or resolve the old title/Close placement decision. Keep transient feedback responsive inside covered/subpanel/confirmation states.
  - Verification: shell navigation/focus, immediate Stop/confirm behavior and reduced-motion sheet open/close; run relevant existing focus/scroll cases as a migration gate.
  - Logging: retain existing warnings/errors; no navigation/press/animation logs.
  - Requirements: R1–R6, R8; shell, ref, cancellation and reduced-motion combinations.
  - Dependencies: tasks 1–2.

### Phase 2: Screen and settings integration

- [x] Task 4: Animate Stopwatch, Timer and History controls without changing their actions.
  - Files: `src/app/index.tsx`, `src/app/timer.tsx`, `src/app/history.tsx`; relevant existing `tests/e2e/crono.spec.ts`, `durationPicker.spec.ts`, `durationInertia.spec.ts`, `tests/e2e/interactions.spec.ts`.
  - Deliverable: migrate Start/Pause/Resume/Reset/Lap/Save, timer presets/extension/reset, history cards/delete/share and the empty-history Link asChild to the shared primitive. Remove each migrated instantaneous pressed transform/opacity, preserving selected/base/disabled styling.
  - Retain zero/max validation, synchronous moving.current and wheel-busy checks, run snapshots/deadlines, reset/delete confirmation and gesture-bound clipboard/share/permission calls. Do not animate duration rows or introduce delays before handlers.
  - Verification: hold/cancel versus accepted action, disabled zero/moving inputs, Link navigation/ref and exact-once keyboard activation, timer extension at boundaries and independent running clocks. Preserve existing real gesture and sharing assertions.
  - Logging: no new routine logs; preserve original recoverable-operation warnings/errors.
  - Requirements: R1, R2, R4–R6, R8; timing, Link and gesture-bound combinations.
  - Dependencies: tasks 2–3.

- [x] Task 5: Animate Planning controls while retaining virtualized editor behavior.
  - Files: `src/app/planning.tsx`, `src/components/ScheduleCard.tsx`, `PlanningRunCard.tsx`, `ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx`, `ScheduleCalendarPanel.tsx`, `ScheduleRepeatPanel.tsx`; `tests/e2e/planningButtons.spec.ts`, `tests/e2e/interactions.spec.ts`.
  - Deliverable: consistent press feedback across list/template/date actions, disclosures and run controls; editor reorder/delete/duration/Add/Save; calendar modes/weekdays and repeat/apply/cancel actions.
  - Preserve protected running/paused sources, bounded schedule/step limits, explicit preview/Apply/Save and replacement/delete/discard confirmation. Selection state changes immediately; draft text, stable IDs and captured source refs survive animation and subpanel return.
  - Keep one virtualized editor body scroll owner, mounted EditorBody isolation, list header/footer geometry and saved opening offset/focus. No per-row idle animation, list layout transition, wrapper-driven height change or wheel gesture replacement.
  - Verification: real hold/cancel/touchCancel, moving/zero duration rejection, boundary reorder disabled opacity, repeat/calendar save/cancel, active source protection and focus/scroll return with many steps. Update old static style assertions to eventual endpoint/neutral identity semantics without weakening no-action checks.
  - Logging: no button/frame logs or draft payloads; retain existing warning/error behavior.
  - Requirements: R1–R6, R8; Planning selected/disabled/virtualized/scroll combinations.
  - Dependencies: tasks 2–4.

- [x] Task 6: Animate Settings and transfer buttons; smooth the existing web switch.
  - Files: `src/components/SettingsSheet.tsx`, `BackupSettings.tsx`, `BackgroundNotificationHelp.tsx`, `SettingsSwitch.web.tsx`; inspect/preserve `SettingsSwitch.tsx`; relevant `tests/e2e/interactions.spec.ts` and existing backup/sound/settings flows.
  - Deliverable: migrate grouped disclosure, language/theme/sound/duration selections, preview/Stop, system shortcuts and backup export/import/review controls. Keep selected/checked state and all original handlers immediate.
  - Web switch: animate only thumb transform and track color for roughly the shared release duration; do not use transition: all. Disable timed movement under reduced motion/disabled state, preserving the existing single button, switch role, aria-checked, focus indication and touch target. Native Switch retains OS behavior.
  - Preserve Settings opener refs and return focus, hydration/transfer busy gates, optional native-module handling, file chooser/download user activation, reviewed preference application, and accepted-update/haptic ownership. No new sounds or haptics from motion.
  - Verification: actual pointer/keyboard toggles, selected theme/language/duration choices, immediate audio preview and Stop, real file picker/download events, cancelled review and preserved false preferences. Validate reduced-motion changes during an active press/transition.
  - Logging: retain existing operation failures; no preference payload, click or transition logs.
  - Requirements: R1–R5, R7–R9; switch, selected preference and gesture-bound combinations.
  - Dependencies: tasks 1–3 and the proven migrations in tasks 4–5.

### Phase 3: Regression evidence and documentation

- [x] Task 7: Complete interaction, accessibility and layout regression coverage.
  - Files: `tests/e2e/interactions.spec.ts`, `tests/e2e/planningButtons.spec.ts`; extend relevant existing `editorScrolling.spec.ts`, `sheetScrolling.spec.ts`, `usabilityLayout.spec.ts`, `backup.spec.ts` only where a real coverage gap remains; reuse `tests/fixtures/app-v1-before-planning.json` unchanged. Extend the two controller test files for any uncovered races.
  - Deliverable: tests cover every material combination in the reconciliation table using real touch/mouse/keyboard and OS-motion emulation, not a test-only public animation API. Keep tests focused on accepted/cancelled actions, refs, disabled state, lifecycle and user-visible feedback.
  - Include quick release/repress, live reduce-motion during hold, disabled-during-hold, close/unmount/background during transition, keyboard once, selected styles and the RNW function-style/ref/Link pilot. Verify motion settles on a static idle screen without recurring scheduled animation work; do not mistake active clock refresh for animation work.
  - Preserve existing duration inertia, editor single-scroll/virtualization/isolation, source focus and offset assertions. Run actual browser gesture-bound operations; use the literal legacy fixture through review/export/import/reload and assert unchanged unrelated clocks, history, text and saved values.
  - Check all six catalogs in light/dark at compact widths (320 and 390 px), with selected/disabled/pressed sample controls, plus enlarged text on representative dense settings/editor screens. Record screenshots as ignored test artifacts only. Retain focus rings/hit targets and confirm press transforms do not move layout or add horizontal overflow.
  - Update endpoint assertions with bounded eventual convergence and neutral-transform equivalence; retain existing suite budgets, no arbitrary sleeps, timeout increases or broad assertion removal. Use existing test helpers when available.
  - Logging: test diagnostics on failure only; no app debug logging or stored-data dumps.
  - Requirements: R1–R9 and every supported-combination verification row.
  - Dependencies: tasks 1–6.

- [x] Task 8: Complete the mandatory documentation checkpoint through `$aif-docs`.
  - Files: `README.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `AGENTS.md`; this plan's progress/evidence section.
  - Deliverable: document actual short interaction feedback and OS reduced-motion behavior; map the new provider/adapter/tests and single transient presentation owner. State that activation, persistence, wheel gestures, native Switch and haptic/audio ownership retain their existing contracts.
  - Merge documentation additions with the already dirty scrolling descriptions. Preserve the explicit unfinished title/Close decision and distinguish browser/build evidence from pending physical native checks. Do not claim new screens, persisted settings or verified device smoothness.
  - No new visible copy is expected; if needed during implementation, route it through all six typed catalogs rather than hard-coding strings. Keep generated documentation English and preserve the raw Original Request here.
  - Logging: none for documentation; report missing evidence as pending rather than inventing outcomes.
  - Requirements: R5, R6, R9 and preserved existing-work boundary.
  - Dependencies: tasks 1–7.

- [x] Task 9: Run the final quality gates and record remaining native acceptance honestly.
  - Files: this plan's progress/evidence section; implementation files/tests only if a failure requires a fix. Use the existing `package.json`, `package-lock.json` and `playwright.config.ts`; do not change configuration just to bypass a failure.
  - Deliverable: run npm test, lint, typecheck, the relevant browser selections below and the declared all-platform export. Bind results to the actual source/build revision and command-catalog hashes after all code/package changes; distinguish results from the unchanged planning baseline.
  - Browser gates include shared controls/settings/backup/sharing and Planning interactions plus real duration/scroll regressions. Use a full browser suite once if the final shared-primitive migration affects all surfaces; do not repeat already-passed checks without new changes or an unresolved failure.
  - Android/iOS exports establish bundling only. Physical touch smoothness, scroll cancellation, live OS reduced motion, native-driver behavior, screen-reader focus and native Switch need device acceptance; the user previously deferred device testing. Do not install to a phone or mark those checks verified without an available device and renewed task scope. Record them as deferred, and do not describe the entire feature as physically verified.
  - Inspect the scoped diff for missed visible Pressables, accidental remaining duplicate feedback, leaked subscriptions/animation loops, changed wheel physics, domain mutations or unrelated local edits. Confirm each exception in the inventory is deliberate.
  - Preserve the running localhost preview; any separate bundle output stays ignored/outside tracked source. Do not commit/push automatically. Mark task evidence complete only for checks actually run and identify deferred native acceptance explicitly.
  - Logging: capture concise check/failure summaries, no sensitive environment/storage dumps or routine runtime logs.
  - Requirements: R1–R9; all acceptance paths and project mandatory validation.
  - Dependencies: tasks 1–8.

## Planned commands and evidence contract

Read-only discovery used `ai-factory commands --json` from repository root. Catalog revision: `52324bc8a91c2e8775d91c90b203373ad59663b1b090a37fd304440c24ad958e`.

- Source `package.json` SHA256: `3b1b385ddd341785da0d090e3ca64f970cf2112236e9b33002a01e3de1378155`.
- Source `package-lock.json` SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`.
- Command CWD: `.` for every entry below. No unresolved command ambiguity was found. These are declared commands, not implementation test results.
- Refresh the catalog and hashes immediately after registering new tests in package.json and again if either source changes before final verification.

| Command ID | Invocation | Purpose |
|---|---|---|
| `package.json#/scripts/test` | `npm test` | Existing deterministic regressions plus the two immediately registered motion tests; Node.js 24+ is required. |
| `package.json#/scripts/lint` | `npm run lint` | Required project lint. |
| `package.json#/scripts/typecheck` | `npm run typecheck` | Required strict typecheck, including host ref/style compatibility. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/interactions.spec.ts tests/e2e/planningButtons.spec.ts` | New interaction contract and retained existing Planning cancellation/disabled behavior. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/durationPicker.spec.ts tests/e2e/durationInertia.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/sheetScrolling.spec.ts` | Wheel inertia and current editor/sheet geometry/focus regression gates. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/crono.spec.ts tests/e2e/backup.spec.ts tests/e2e/usability.spec.ts tests/e2e/usabilityLayout.spec.ts` | Actual persistence/sharing/transfer/settings/layout interactions; include other affected existing sound/theme/language scenarios based on the final diff. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e` | One final full-suite run when justified by the completed cross-app shared-control migration. |
| `package.json#/scripts/export` | `npm run export -- --output-dir .expo/interaction-animations-export` | Existing all-platform Android/iOS/web export into ignored output; no native installation or EAS build implied. |

Use the established Windows Node/npm toolchain from WSL (for example, `cmd.exe /d /c "npm run typecheck"`) when the Linux runtime does not match. Playwright already targets localhost:8091 and reuses an existing server. Do not raise timeouts or stop the preview just to run planning checks.

## Progress and verification record

- Planning reconnaissance: source/docs inspected, no animation implementation performed.
- Tasks 1–9: completed. Physical native checks remain deferred as specified by task 9.
- Documentation checkpoint through `$aif-docs`: README, DESCRIPTION, ARCHITECTURE and AGENTS now describe transient motion, the shared observer/adapter/tests and native deferrals. All 40 relative Markdown links resolve. Meaning preservation: N/A — no requirements rewritten. Existing README structure/history and scrolling text are retained; broader documentation consolidation is outside this feature. The earlier title/Close question and physical acceptance remain explicitly pending.
- Extended acceptance: all 33 interaction/layout scenarios passed together: 9 real interaction/lifecycle cases and all 24 language × palette × 320/390 px enlarged-text layouts. Rapid re-press/window blur, background return, disabled-during-hold, sheet close/reopen, Link/keyboard and idle animation-frame checks pass. All 12 focused motion tests pass. Lint/typecheck pass after narrowing the nullable requestAnimationFrame cancellation handle in the test-only observer; a full final suite will exercise the final test text.
- Visual review: inspected the ignored dark 320 px Planning held-press screenshot; controls retain spacing, readable labels and the single editor body.
- Settings/transfer evidence: all 20 interaction/backup cases passed together, including real legacy downloads/file choosers/import/reload, optional preferences, failed-operation feedback, keyboard switch movement, live reduced motion and Back focus. Lint/typecheck passed. Native Switch and all timing/wheel/catalog sources remain unchanged.
- Planning evidence: all 14 Planning-button/editor-scrolling scenarios passed together, with lint/typecheck passing. `EditorBody.tsx` and `.web.tsx` additionally receive a layout-free MotionScope to suspend covered controls without remounting the virtualized draft. Existing heading policy, layout/scroll composition and focus capture are preserved.
- Foundation evidence: all 251 registered Node tests passed after task 1; the two new motion files pass 11 focused tests after task 2. The callback-style Close pilot passes all 3 browser scenarios. Lint/typecheck passed for each foundation/migration checkpoint.
- Shell evidence: all 9 interaction/editor-scrolling cases passed after task 3, including virtualized return focus/offset and real scroll takeover.
- Timing/History evidence: all 4 crono scenarios pass; the History Link/Space regression and real duration-motion Start gate each pass. Migration exposed Expo Router Slot's array-style rejection at the empty-history Link; using its existing single style object fixes the real app regression. The added Link test uses its actual injected link role. No timeout/assertion budget was raised.
- Planning baseline checks on 2026-11-10: `npm run lint` and `npm run typecheck` both passed (exit 0) using the established Windows npm toolchain. These checks validate the preserved starting application state, not unimplemented animations.
- Plan integrity: exact raw request retained; nine unchecked tasks with dependencies; referenced existing browser-test paths and command-source hashes checked. All ten pre-existing modified/untracked files remained byte-identical after branch/plan creation. The plan has no whitespace errors.
- Native physical animation/accessibility acceptance: pending/deferred; no device check is claimed by this plan.
- Existing unrelated scrolling work must remain preserved. Its earlier browser/build results are not animation acceptance evidence.

### Final validation

- `npm test`: 257/257 passed, no failures/skips.
- `npm run lint` and `npm run typecheck`: passed, exit 0.
- `npm run export -- --output-dir .expo/interaction-animations-export`: Android/iOS/web passed; outputs remain ignored. This is bundling evidence, not a signed APK or device test.
- Full browser attempt: the terminal/logger session exited 143 after 297 recorded cases (295 passed, 2 failed); 78 cases remained unrecorded. Its orphaned test process tree was cleaned up without touching the existing Expo server. Continue coverage in smaller selections; this is not one clean full-suite pass.
- The Timer coast case's trace shows its disabled assertion completed before the button became enabled at timestamp 317839, with the actual tap only at 317858. The tap therefore occurred after settling. The unchanged Timer/Planning coordinate pair passed separately (2/2 in 17.8s); wheel/controller/application code is unchanged.
- The shared Stop case's trace shows the sheet/button moving during the hold while font rendering changes; mouseup used the old position outside the final button. The planningButtons hold helper now waits for document.fonts.ready before measuring. No assertion, gesture, timeout or application behavior is weakened. Its complete file plus the new interactions file pass together: 17/17 in 1.8 minutes.
- The final Theme/Timer/usability/layout selection passes 89/89 in 10.7 minutes. Comparing file/title identities from all recorded passing runs with the current JSON test catalog confirms **375/375 distinct declared browser cases have passing evidence**, with no missing or unknown cases. This combines the interrupted full attempt, the unchanged coordinate pair, the 17-case button rerun and the 89-case final selection; it is not one clean full-suite invocation. One worker per invocation, existing scenario budgets and zero configured retries are retained.
- Lint/typecheck pass again after the test-helper correction. The 257 Node tests and Android/iOS/web exports remain bound to unchanged application inputs; no application source changed after those checks. Final source/test/config fingerprint after that single test-only change: `a7112b44f80174d615f39d362697307cf7f7cfd59dfbdff798c079e3f3aff3e2` (same 164-path/NUL algorithm). The earlier `31f5...` fingerprint above identifies the initial full attempt and exports.
- Application/config fingerprint shared by all final checks: `082fe29299b043a972faad09b9e39697b5891ae46e738e48ac0f94a41e8c2b52`, over sorted src TS/TSX files, package.json, package-lock.json and app.json with each path/content separated/terminated by NUL. The only post-export source/test change is the font-readiness await in planningButtons.spec.ts.
- Final audit: 71 visible Pressable call sites migrated. Stock hosts remain only in MotionPressable itself, the invisible Sheet backdrop and native DurationWheel; the web wheel and native Switch retain their existing owners. All final source/test/config hashes match, whitespace/link checks pass, and the prior scrolling plan/patch/picker/editor/sheet tests remain byte-identical to the starting snapshot. No dependency, lockfile, schema, native configuration, timing/audio owner or wheel-physics change was introduced. Localhost:8091 remains running; no commit, push, APK installation or physical-device test was performed.
- Source/test/config fingerprint: `31f5d83756ce75a8faf2e639a86e3dec63eb8b3ff2efa631b619709ac7d8af01` over 164 sorted source/test TS/TSX/JSON files plus package.json, package-lock.json, app.json and playwright.config.ts; each relative path and actual content is separated/terminated by NUL. Git HEAD remains `139cebbb65a28c0153f76b754b8c5ca5d68001d0` with uncommitted implementation changes.
- Refreshed command catalog: `ccc8e8ce5ae283e86ff698f09e2ee021c12a8a1d9e4e5d9665e13645210f0780`; package.json SHA256 `1ce9d18a04797c2b472f85fb54d9b56afe5b53c1050582f428a9a1992570e59d`; package-lock.json SHA256 remains `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. All command IDs/CWD above remain valid; only the test script gained the two new registered files.
