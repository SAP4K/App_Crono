# Implementation Plan: Whole-screen Planning scrolling

Branch: `feature/planning-screen-scroll`
Created: 2026-11-09
Mode: full
Status: Implementation and automated validation complete; 4/4 tasks complete. Physical native gesture/accessibility checks remain pending under the existing device-test deferral.
Base: fetched `origin/master` at `9962105115483e2b56150544def4f5967d383e11`.

## Original Request

Can you change the scrolling behavior of the Planning window? I want to scroll through the entire window, just like in the Timer and Stopwatch windows, instead of scrolling only through the schedules.

## Settings

- Testing: yes; reuse the user's earlier preference. Add meaningful browser gesture regressions and rerun affected existing flows. Do not add implementation-mirroring unit tests for this layout change.
- Logging: minimal; warnings/errors only at existing failure boundaries. Do not log scrolling, offsets, routine rendering or saved schedule names.
- Docs: yes; retain the mandatory completion checkpoint through `$aif-docs`, limited to the existing Planning instructions in `README.md`.
- Planning mode: full, reusing the user's earlier detailed-plan selection. No `--parallel` execution or automatic implementation.
- Scope: the main Planning tab. Its page title, subtitle, New Schedule button, count, date filters, active run card and schedule cards move together. The shared app header, Settings entry and bottom navigation keep the same behavior as Timer/Stopwatch.
- Preserve schedule editing, duration-wheel gestures, modal sheets, calendar filtering, button feedback, clock lifecycles, persistence and all six languages/two themes.
- No dependency, app configuration, native module, storage schema/key or timing/audio policy change is needed.
- Branch context: the separate one-minute alert work is committed on `feature/one-minute-alerts`, PR #12. It is not included in this `master`-based branch or required for this UI change. Preserve that branch and its pending device acceptance; do not merge it as part of this plan.
- Device/build boundary: retain the existing device-test deferral. Planning and later web checks do not authorize a new APK installation, instrumented run or phone permission change. Record unavailable native checks as pending.
- Optional roadmap, research and top-level RULES artifacts are absent; use `AGENTS.md`, `.ai-factory/rules/base.md`, DESCRIPTION and ARCHITECTURE without creating substitute context files.

## Current Behavior and Implementation Direction

`src/app/planning.tsx` renders its title, subtitle, New Schedule button, count and filters in a fixed outer `View`. Only the following `FlatList`, whose header contains `PlanningRunCard`, can scroll. `src/app/timer.tsx` and `src/app/index.tsx` put their page content inside one scrolling surface. `src/app/_layout.tsx` owns the shared header, safe-area spacing and tabs outside the route content.

Keep the existing virtualized schedule list as the single main-screen scroll owner. Move the fixed Planning content into its `ListHeaderComponent`, followed by the existing run card. Keep the empty state and schedule rows in that same list. Use a bounded `flex: 1` screen/list; move the current 26-pixel horizontal, 8-pixel top and 24-pixel bottom spacing to its content container. Keep the existing schedule-ID keys and natural card heights.

Use a React element or a component with stable type for the list header. Do not introduce a newly defined header component function on each render: `PlanningRunCard` owns local display/confirmation state. Keep route-owned editor, date and confirmation sheets as siblings outside the virtualized list. Preserve fresh header/row props for changes to language, theme, selected date and protected run identity; if memoizing render callbacks, supply the required immutable dependencies/`extraData`.

Do not wrap the list in another vertical `ScrollView`, disable its scrolling, add sticky page controls, impose fixed card heights, or introduce a custom gesture responder. Scrolling must not call shared `update`, haptic feedback, permission APIs or timing controls. Retain natural offset clamping when filtered content shrinks; do not reset the viewport on display ticks or ordinary rerenders.

## Requirements Reconciliation

Authority: the current request defines the scrolling change. The actual Timer/Stopwatch routes define its comparison boundary. `AGENTS.md`, base rules and existing architecture constrain mobile behavior, shared state and verification. These sources agree: one scrolling Planning page can retain list virtualization and existing modal/timing ownership.

| ID | Decision and source | Verification obligation |
|---|---|---|
| R1 | Original Request; `planning.tsx` render tree; Timer/Stopwatch route scroll containers | Scroll gestures over the page header and over schedule cards move the same page content. The title/New Schedule/filter controls move out of view together with the list. |
| R2 | `_layout.tsx` — shared shell and tabs; user comparison with Timer/Stopwatch | The app header/Settings and bottom tabs retain their existing positions and remain usable while Planning content scrolls. Do not turn the entire application shell into a scroller. |
| R3 | `planning.tsx` — filtering and `scheduleLimit`; `core/planning.ts` — `MAX_SCHEDULES` | Empty, short and 20-template lists remain usable; the create limit uses the total saved count, not the filtered count. A date view with no matching templates still shows its controls and active run card. |
| R4 | `PlanningRunCard.tsx`; ARCHITECTURE — display/state ownership; base rules — State and Timing | Scrolling and parent rerenders do not change run IDs/deadlines, pause/reset clocks, duplicate sound or dismiss an open confirmation/draft. Protected rows refresh when the active run changes. |
| R5 | `ScheduleEditorSheet.tsx`, `Sheet.tsx`, `DurationWheel.tsx`/`.web.tsx`; existing picker tests | Main-page scrolling does not change sheet scrolling, keyboard behavior or the wheel/editor return flow. Touch drags cancel pending button presses rather than starting/editing a schedule. |
| R6 | DESCRIPTION — six languages/themes; `theme.ts`; base rules — Mobile UI | Preserve localized accessible controls, pressed/disabled feedback, compact layouts and bottom-card reachability without horizontal overflow. |
| R7 | `useStopwatch.ts`, schema version 1 and literal legacy fixture; base rules — Validation | A scroll-only interaction leaves stored app data unchanged. Existing legacy restoration, schedule CRUD and calendar workflows still pass through the real application. |

Supported combinations:

| Input/state | Output and side effects | Evidence |
|---|---|---|
| Overflowing schedule list; gesture begins over header space, a schedule card or a pressable | One vertical scroll surface moves the header and cards; a drag does not activate the pressed control or modify persistence. | Real browser wheel and Chromium touch-drag regressions; title displacement and unchanged stored snapshot. |
| Empty/one-template list; no run | Header/actions/empty state remain reachable. Scrolling is needed only when the available height is insufficient; do not demand artificial overflow. | Compact-screen empty/short-content checks. |
| All/day filter; populated/empty results; paused or running run | Filter changes remain correct, run controls remain in the page header, shrinking results produce a usable viewport, and the global 20-template cap remains correct. | Existing calendar flow plus long-list/empty-filter checks. |
| Running/paused/completed schedule; timer/stopwatch also present | Run controls and row protection stay current. Scrolling does not change persisted timing or audio calls. A context update does not remount a header-owned confirmation. | Stable-state scroll snapshot and running/paused controls; confirmation retained across an independent timer completion. |
| Six languages × both themes on a compact viewport; representative wider screens | Localized text wraps, controls remain accessible, final-card actions clear the tab bar, and content has no horizontal overflow. | Browser matrix at 320×568; representative 390×844, 430×932 and 1024×768 checks. |
| Schedule editor/date/confirmation sheet opened after scrolling | Modal remains independent of list virtualization; drafts, wheel focus/return and confirmation behavior persist. | Existing Planning, button-feedback and duration-picker journeys. |

Representative existing artifact: retain the literal `tests/fixtures/app-v1-before-planning.json` journey in `tests/e2e/planning.spec.ts` (calendar editor stages/saves alongside legacy data). Run it through the real app after the layout change; preserve stopwatch, timer, history and saved preferences. Do not replace the literal fixture with the new serializer or synthetic initial data.

Meaning preservation: PASS — the page content scrolls together as requested, with the comparison's shared shell boundary intact. Existing schedule limits, timing, feedback, editor interactions and saved data retain their contracts. This plan changes layout behavior, not scroll physics or duration-wheel selection.

## Versioned API Evidence

Read `package.json`: Expo `~57.0.32`, React Native `0.86.3`. Checked the [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [React Native 0.86 FlatList reference](https://reactnative.dev/docs/0.86/flatlist) and [ScrollView reference](https://reactnative.dev/docs/0.86/scrollview). `ListHeaderComponent` supports placing page controls before rows in one virtualized list; external render dependencies must remain observable. Bounded parent dimensions and content-container spacing support the proposed layout.

Followed the Expo index to [Safe areas](https://docs.expo.dev/develop/user-interface/safe-areas/). The existing SDK-57 shell already owns its insets; this route refactor does not add a second safe-area provider or adopt newer-SDK web behavior. Recheck the installed versions and matching docs before implementation if the branch has advanced.

## Command Evidence

CWD: `/mnt/d/app_crono` (`D:\App_Crono` for Windows Node/npm). Use npm with Node.js 24+ and the committed lockfile.

Read-only discovery: `ai-factory commands --json`; catalog revision `434c0a5999f0bb8135eb83d692e652a087ed124319b930e2a190bd0f2eeab46b`. External catalog: `/tmp/crono-planning-scroll-commands.json`.
Sources: `package.json` SHA256 `91832b14e6e27ac86a56bfea4be8f3e4ec8925e8c1f4d179344ebe5eaca0f4ce`; `package-lock.json` SHA256 `fd6a7c8e60b7af3cdddf2ee0b1c4c941c4fc194beb647e9b0aab2338a2a99557`.

| Command ID | CWD | Planned use |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint`; baseline passed during this planning run. |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck`; baseline passed during this planning run. |
| `package.json#/scripts/test:e2e` | `.` | First run the new `tests/e2e/planningScroll.spec.ts` after Task 1 creates it, then run it with the existing affected suites listed in Task 4. Auto-discovered through `playwright.config.ts`. |
| `package.json#/scripts/test` | `.` | `npm test` once for the final integrated change; no new core tests are required for layout. |
| `package.json#/scripts/export` | `.` | `npm run export` after implementation for Android/iOS/web compilation. |

Discovery entries are declarations, not test results. Baseline lint/typecheck are the only checks executed by this planning invocation. Refresh discovery if package/lock contents change. Playwright uses the installed Chrome, one worker, 45-second case limits and port 8091; verify server ownership/source before reusing it. If the known Windows path/module-loading issue recurs, use the already inspected single-runner/fresh-server approach rather than changing product code or weakening gesture assertions.

## Tasks

### Phase 1: Reproduce the requested behavior and change the route

- [x] Task 1: Add fail-first whole-page scrolling regressions.
  Files: new `tests/e2e/planningScroll.spec.ts`; reuse `tests/e2e/helpers.ts` without changing unrelated helpers.
  Deliverable: seed enough valid named schedules for genuine overflow on a compact viewport. Use real `page.mouse.wheel` from header space and from a schedule card, plus the existing Chromium `Input.dispatchTouchEvent` pattern from `durationPicker.spec.ts` for a touch drag that begins on a pressable. Assert actual displacement of the Planning heading/New Schedule controls, reachability of the final card and return to the top, stationary shell/tab geometry, no accidental button action and unchanged persisted data. Check gesture movement before Playwright can auto-scroll a target into view; DOM existence or `scrollIntoViewIfNeeded()` alone cannot prove the requested behavior. This spec is automatically registered by the current test directory configuration.
  Verification: run the new spec against unchanged Planning and record the expected failure where page controls remain fixed; preserve independent controls/assertions. Observe page errors and VirtualizedList/nested-scroll warnings. Use real browser scrolling rather than assigning `scrollTop` as the primary gesture. Sources: R1, R2, R5, R7; overflowing-list gesture combinations.
  Logging: test failure diagnostics only; no product logging or persisted test output. Dependencies: none.

- [x] Task 2: Make one FlatList own all main Planning content.
  Files: `src/app/planning.tsx`.
  Deliverable: move title, subtitle, New Schedule button, total count and date filters into `ListHeaderComponent` immediately before `PlanningRunCard`. Keep schedule rows and the existing empty message inside that list; keep route-owned sheets outside it. Separate bounded screen/list styles from content padding, retaining the current spacing and bottom reachability. Keep stable component types/keys, current callbacks, date defaults, total-count limit, row protection and pressed/disabled styles. Preserve fresh render dependencies without remounting the run card. Do not add an outer vertical scroller, sticky header, per-scroll state writes or custom gesture system.
  Verification: rerun the exact Task 1 failures until they pass; check both empty and overflowing content. Confirm meaningful dragging over New Schedule/row actions scrolls without invoking them. Inspect the root/header structure and bounded layout; do not write structural unit tests that merely mirror JSX. Sources: R1–R7.
  Logging: none added for scrolling/layout; retain existing error boundaries. Depends on 1.

### Phase 2: Preserve interactions and verify compact layouts

- [x] Task 3: Cover filtered lists, active run state and overlays after scrolling.
  Files: `tests/e2e/planningScroll.spec.ts`; existing `tests/e2e/planning.spec.ts`, `tests/e2e/planningButtons.spec.ts`, `tests/e2e/durationPicker.spec.ts` only where an additional interaction assertion is needed. Reuse existing app/test utilities and the literal legacy fixture.
  Deliverable: check zero/one/20 templates; All/date filters with populated and empty results; the saved-template cap under filtering; running/paused/completed run controls and protected rows. Verify a reset confirmation survives a context rerender caused by an independent timer completion, without resetting or replacing the schedule. Exercise editor save/discard and duration-panel return after scrolling, preserving drafts, focus, feedback and shared notices. A scroll-only case compares stored data and audio calls before/after. Use the six-language/two-theme compact matrix and representative wider sizes from the reconciliation table; verify wrapped labels, accessible roles, minimum existing touch targets, last-row reachability and no horizontal overflow. Existing Timer wheel and Stopwatch scrolling remain regression controls.
  Verification: new interaction/layout cases and affected existing journeys pass without reducing assertions, increasing timeouts or adding retries to hide scroll defects. The existing legacy calendar journey still uses the literal fixture through real restoration. Keep physical Android/iOS swipe, momentum, large native text and TalkBack/VoiceOver checks explicitly pending until native QA is resumed; browser touch emulation does not establish them. Sources: R2–R7 and the supported-state combinations above.
  Logging: bounded test diagnostics and existing runtime warnings/errors only; no scroll metrics or saved names logged. Depends on 2.

### Phase 3: Documentation checkpoint and final validation

- [x] Task 4: Document whole-page scrolling and complete the required checks.
  Files: `README.md` — Planning Example; implementation/test files only if a demonstrated check failure needs correction.
  Deliverable: invoke `$aif-docs` for a concise update explaining that the Planning page scrolls as one surface and the top controls are reached by scrolling back up. Keep product instructions free of FlatList/virtualization details. Preserve existing duration-wheel/editor and calendar instructions. No new report/context file, dependency/config change, APK build or installation is part of this task.
  Verification: run `npm run lint`, `npm run typecheck`, `npm test`, then `npm run test:e2e -- tests/e2e/planningScroll.spec.ts tests/e2e/planning.spec.ts tests/e2e/planningButtons.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timer.spec.ts tests/e2e/crono.spec.ts`. Run `npm run export` for Android/iOS/web. Check README links and commands. Record actual outcomes and unavailable native checks in the plan's implementation evidence; keep plan checkboxes honest. Repeat affected checks only when later changes/failures justify it. Sources: all reconciled requirements, retained test/docs preferences and project validation rules.
  Logging: concise check outcomes and failure diagnostics; warnings/errors-only product policy remains. Depends on 3.

## Completion Criteria

One main Planning scroll surface moves the page controls, run card and schedule cards together from header/card/pressable gestures, while the shared shell remains consistent with Timer/Stopwatch. Empty/filtered/max-capacity content and all existing actions stay usable. The exact fail-first scrolling regressions pass; relevant interaction/layout, lint/typecheck, core and export checks pass. Documentation reflects the implemented behavior, and unavailable native checks stay pending.

Four focused tasks need one final commit after validation, suggested as `fix(planning): scroll the entire planning screen`. This planning request does not authorize implementation, committing, pushing, opening another PR, merging the one-minute branch or installing a new app build. Start execution with `$aif-implement` when requested.

## Implementation Evidence — 2026-11-09

- Task 1: the three new registered Playwright gesture regressions failed against unchanged application code. Wheel gestures over the subtitle and a schedule, plus a real Chromium touch drag over New Schedule, left the heading at 88 pixels instead of moving it. No dialog was accidentally opened. Test-file typecheck passed. Log: `D:\crono-android\planning-scroll-red.log`; fresh server on port 8093, existing single-runner configuration and no retries. This is the expected regression-first result, not a passing feature check.
- Task 2: the exact unchanged three-test regression file passes after moving all page controls and the run card into one FlatList header; 3/3 in 13.6 seconds. The existing empty-screen editor/validation/discard journey also passes. Source changes are limited to `src/app/planning.tsx`; sheets, timing owners, dependencies and native configuration are unchanged. Logs: `planning-scroll-green.log` and `planning-scroll-empty-editor.log` outside Git.
- Task 3: all **88 selected Playwright scenarios passed in one complete 2.5-minute run**, with no failures, skips or retries. This includes **27 new scrolling/layout/interaction scenarios**, the existing literal-legacy calendar and picker journeys, editor/feedback tests, and Timer/Stopwatch controls. Coverage includes header/card wheel gestures, touch drags over New Schedule and Start without activation, all six languages in both themes at 320×568, representative 390/430/1024-pixel widths, zero/one/20 templates, filtered empty results with a paused run, refreshed protected rows, independent clocks, retained reset confirmation after timer completion and a scrolled editor's duration/save/discard flow. Romanian light and compact French dark screenshots were inspected. Log: `D:\crono-android\planning-scroll-browser.log`; outputs/screenshots are ignored.
- Fresh `npm run lint`, `npm run typecheck` and **171/171 Node tests** passed on the final application/test source before the documentation-only checkpoint. Node log: `D:\crono-android\planning-scroll-node.log`. The earlier 156 count in baseline documentation is historical, not this run's result. Physical native gestures, momentum, native font scaling and TalkBack/VoiceOver remain pending under the device-test deferral.
- Task 4: `$aif-docs` added two sentences to the README Planning Example explaining whole-page scrolling and returning to the top controls. **Meaning preservation: PASS**; all prior README content is unchanged. Technical review checked **13 local links/anchors**, existing commands and the still-accurate AGENTS documentation map; readability review confirmed concise product instructions without implementation detail. No documentation file was moved, created or removed.
- `npm run export` passed for **Android, iOS and web** after the final application/test changes; log `D:\crono-android\planning-scroll-export.log`. The 88-case browser run and lint/typecheck/171-case Node results cover the same application/test source; the only later content change was the scoped README paragraph. No redundant rerun or native build/install was performed.
- Verified source identities: `src/app/planning.tsx` SHA256 `5f537b267d6d1a8f10075066d51f1411f0aced5c77ecc0bd4908cc45cc516271`; `tests/e2e/planningScroll.spec.ts` SHA256 `76aa59f62bf09de3723c9d77965e8f94b13f570bc7bf26470a6739309b9ab043`; `README.md` SHA256 `4531dfa6810498086f3a6f899c0cff05c395ee51aaf7c90bcb5b964b033703d8`. Base commit and package/command discovery identities remain those recorded above. Only the route, new browser spec, README and this plan changed; generated outputs are ignored, and root native directories remain absent.
