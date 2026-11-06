# Implementation Plan: Scrolling Duration Wheels

Branch: `feature/duration-wheel-picker`
Created: 2026-11-06
Mode: full
Status: code, CLI/browser checks and documentation complete; 11/12 tasks complete; native acceptance pending.
Current task: 11 (pending physical Android/iOS devices and rebuilt binary).

## Original Request

poti te rog sa modifici pentru timer si planificare sa se incrementeze prin scrollinc, ceva de genul cum este la apple in aplicatia ceas

## Settings

- Testing: yes — meaningful duration/selection boundaries, browser interaction and regression coverage, and physical Android/iOS gesture/accessibility checks.
- Logging: minimal — WARN/ERROR at unexpected platform boundaries only; no per-scroll, selected-value, routine rendering, or saved user-text logs.
- Docs: yes — mandatory `$aif-docs` checkpoint, following the existing English documentation structure.
- Planning depth: full. Reuse the user's earlier detailed-plan, tests, documentation, and minimal-logging answers; do not ask those questions again.
- Platforms: iOS and Android first, with functional mouse/trackpad/touch and keyboard support in the web preview. Both palettes and all existing languages remain supported.
- Timer: replace the three numeric duration text fields with inline hours/minutes/seconds wheels. Editing duration no longer opens a numeric keyboard; schedule/action names remain ordinary text fields.
- Planning placement: an optional question offered compact tap-to-open selection versus wheels in every action row. No answer was received while planning. Use the disclosed compact default: an action's duration opens the shared wheel selector inside the existing editor sheet, with Apply and Cancel. This is a planning assumption, not a recorded user answer. Adapt task 6 if the user chooses inline wheels before implementation.
- Proposed interaction details: finite columns with hours 00–23 and minutes/seconds 00–59, one-unit increments, centered snapping and a highlighted selection row. Columns stop at their endpoints, without wrapping or carrying into another column. The request specifies Apple-style scrolling, not exact native Clock rendering or endless repetition; these details are implementation defaults, not additional user answers.
- Keep one-second minimum and 23:59:59 maximum valid duration, current defaults, pause/reset/start rules, independent clocks, sound policy, system-notification ownership, and version-1 persistence.
- No new native dependency is planned. No change to clock calculations, notification permission/scheduling policy, bundled sounds, or saved language/theme is included.
- This invocation owns the new plan and local feature branch only. It does not implement, install packages, commit, push, open a PR, submit a build, or publish.

## Requirements Reconciliation

Authority: the current request replaces the duration-entry interaction in Timer and Planning. Existing domain and persistence contracts remain authoritative for valid values, protected runs, accepted updates and saved drafts. Apple Clock is an interaction reference; CRONO retains its existing palettes, translations and cross-platform architecture.

| Decision | Source and relationship | Verification |
|---|---|---|
| Scroll to select hours, minutes and seconds in both features | Original Request; immediately preceding discussion identifies the current numeric fields | Real scrolling changes the selected value; duration selection does not focus a text input |
| Retain valid duration bounds and timer editability | `src/core/timer.ts`: `validDuration`, `configureTimer`; `src/app/timer.tsx`: `editable` | Bounds, all-zero draft, idle/completed versus running/paused cases |
| Keep Planning edits local until the existing Save succeeds | `ScheduleEditorSheet.tsx`: controlled draft, candidate validation, `onSave`; `core/planning.ts`: `readSchedule`, `isProtectedSchedule` | Apply modifies the correct draft step; Cancel changes nothing; whole-editor discard and rejected Save retain their semantics |
| Preserve state and side-effect ownership | `.ai-factory/ARCHITECTURE.md`: User Actions and Persistence; base rules: Module Boundaries and State and Timing | Wheels never call storage, schedule OS alerts, create run IDs, or own timing/audio controllers |
| Unchanged selection cannot reset completion or stop audio | `timer.tsx`: `commitDuration`; `tests/e2e/timer.spec.ts`: completed timer survives focus; `patches/2026-11-05-00.37.md` | Focus, initial positioning, same-value scroll and cancel preserve the completed run; a real valid duration change still configures it |
| Preserve one virtualized action list and compact mobile editing | `ScheduleEditorSheet.tsx`: one `FlatList`, stable step IDs, `Sheet` non-scrolling mode | Fifty-step list, duration editing near the end, reorder/remove, restored focus and no nested-list warning |
| Respect installed platform behavior | `AGENTS.md`: Expo version/docs and cross-platform requirements; D1–D7 below | Native and web adapters verified separately; physical checks are not inferred from browser/export success |

Supported combinations are limited to this duration-entry change. The persisted duration remains milliseconds; wheel offsets and in-flight selection state are transient.

| ID / accepted input | Persisted state | Output / next transition | Effects and invariants | Verification scenario |
|---|---|---|---|---|
| W1: idle/completed timer; settled, changed, nonzero selection | Configure through existing timer controls only when the valid duration differs | Selected duration becomes configured; Start/Restart uses that same value | No run starts from scrolling; unchanged selection is a no-op | Select 00:01:03, reload, then start; assert 63,000 ms and correct deadline |
| W2: all columns zero | Do not persist an invalid duration or replace the last valid configured timer | Show existing validation; Timer Start and Planning Apply disabled | Zero may exist as an intermediate UI selection; do not silently coerce it to one second | Reach zero, then select one second and recover normally |
| W3: running/paused timer | Current run ID, exact remaining milliseconds and deadline unchanged | Wheels disabled; reset confirmation remains the path to duration editing | Ignore wheel, click, keyboard and accessibility adjustments while disabled | Attempt adjustment during run/pause; reset and edit afterward |
| W4: successful restored data, including completed legacy timer | Existing version/key, clocks/history/false preferences preserved | Wheels show configured duration, not the live remaining countdown | Initial/programmatic alignment cannot emit a configuration change or replay audio | Load the actual legacy fixture, inspect 00:00:01, open/close selection and reload |
| W5: Planning opens duration for an editable action | No application update | Temporary parts initialized from that step ID; Apply changes only its editor draft | Cancel/back/backdrop discards the temporary wheel selection and returns to the editor; schedule Save still required | Edit second action, cancel, reopen/apply, Save and reload |
| W6: reordered/removed/virtualized Planning actions | Stable step IDs and names retained; protected active template remains protected | Selection applies to the original step ID or is safely abandoned if it no longer exists | Never use a stale list index to write another action; no callback after selection/editor unmount | Edit, reorder, edit again, remove, scroll offscreen/back, discard whole draft |
| W7: quick fling, slow drag, multiple columns or immediate Start/Apply | No writes from animation frames or unfinished motion | Publish a settled valid selection; disable Start/Apply while any wheel is still moving | Handle both drag-without-momentum and momentum completion; no stale value or permanently stuck busy state | Real-timer mouse/touch journey, simultaneous column changes, cancel during movement |
| W8: unchanged focus/alignment, theme/language/layout/font changes | User selection, run IDs, deadlines, history and preferences remain intact | Relabel/repaint/realign from current controlled parts | No false `onChange`, route remount, selection reset, new audio or OS scheduling | Both themes, ro/en/ru, narrow layout and font-scale realignment |
| W9: unrelated timer/schedule finishes while Planning duration panel is open | Existing timing transitions only; editor remains unsaved | Shared completion/failure/Stop feedback stays visible in the same sheet | Keep draft/panel open; no competing native modal or alert owner | Running timer plus another schedule's duration editor; expire and Stop |
| W10: web pointer/keyboard and native accessibility adjustment | Same accepted duration semantics across inputs | Touch scroll; mouse/trackpad scroll; ArrowUp/Down and Home/End on web; native increment/decrement | One accessible control per column, clear unit/value/range/disabled state; decorative rows hidden from accessibility | Browser semantic/keyboard tests plus VoiceOver/TalkBack checks |

Meaning preservation: PASS — scrolling replaces duration typing in both features while existing bounds, save/reset rules and timing ownership stay intact. Planning placement and finite endpoints are disclosed defaults. No native gesture or delivery check is represented as completed.

## Technical Decisions and Evidence

1. Add framework-free `src/core/durationPicker.ts` with `DurationParts`, unit bounds, duration-to-parts/parts-to-valid-duration conversion, and nearest bounded wheel-index calculation. Reuse `core/timer.ts` validation and keep its existing string parser for callers/tests that still need it. Do not change persisted timing types to store wheel positions.
2. Add `src/components/DurationWheel.tsx` for native and `DurationWheel.web.tsx` for browser behavior, sharing an exported props contract. Add a common `DurationPicker.tsx` to compose the three columns. Use numeric controlled parts and functional partial updates so simultaneous column changes do not overwrite each other. Expose interaction/busy state to the caller.
3. Native: use bounded `ScrollView` columns, measured row geometry, equal top/bottom spacers, snap intervals, and explicit drag/momentum handling. Render only the finite 24/60/60 options; at most one inline Timer picker and one active Planning picker are needed. Keep the schedule's existing outer `FlatList`; do not nest a vertical virtualized wheel inside a plain vertical `ScrollView`. Handle nested scrolling on Android and preserve page scrolling outside the wheels. Selection bands/overlays cannot intercept gestures.
4. Give each wheel a clear lifecycle: initial or prop-driven alignment is silent; user motion owns a generation; final alignment emits at most one effective selection change; replacing values, disabling, cancelling or unmounting invalidates obsolete work. A slow drag must settle without requiring a momentum event. A fling must not publish its release position as the final value. Cancel any fallback timers/frame callbacks, retain browser timer receiver wrappers, and release busy state on all terminal paths. Do not treat native `onScrollEndDrag` alone as the end of momentum [D2].
5. Web: use the same visual/control contract with a scoped scrolling container and CSS scroll snapping. Add real mouse/trackpad and touch scrolling, click-to-select rows, a focusable `spinbutton` semantic target and ArrowUp/Down/Home/End support. Set min/max/current value and disabled semantics; prevent handled keys from scrolling the outer page. Keep DOM/CSS/browser listeners in the `.web.tsx` adapter. Do not rely on React Native Web honoring every native snap/momentum prop. Browser `scrollend` must have a cleaned-up idle fallback where unavailable; use ordinary native timer functions through wrappers.
6. Styling: three compact visible rows, a clearly emphasized center row, neighboring values, two-digit visual numbers and localized unit labels. Reuse semantic theme tokens and bundled fonts. Row height is at least 44 points and must remain consistent with the actual scaled font/layout measurement; recalculate offsets without changing selected values on layout/font changes. No hard-coded light palette, new gradient dependency, or pixel-identical Apple claim is needed.
7. Accessibility: native columns use the adjustable role, meaningful unit/value/range and increment/decrement actions [D3]. Hide decorative duplicates; changes follow the same bounds and disabled guards. Web follows bounded spinbutton keyboard/value semantics [D6]. Preserve visible keyboard focus and use nonanimated alignment for explicit keyboard/accessibility adjustments or reduced-motion preference; respect native/browser reduced-motion APIs after checking their current documentation at implementation time. Physical screen-reader behavior remains separate acceptance evidence.
8. Timer integration: replace `fields` text editing and blur-based configuration with local numeric parts. Derive valid duration using the pure helper, keep zero as a temporary invalid selection, and only configure an effective settled valid change. Disable Start while motion is pending; otherwise use the latest selected parts, not an earlier render closure. Keep the existing accepted-start permission gesture, pause/resume/reset confirmation, completion notices and audio semantics. Use current snapshots for action guards.
9. Planning integration, compact default: retain `StepDraft` and existing validation/save boundaries unless a small internal type change clearly simplifies them. Replace the three duration text inputs in `ScheduleStepRow` with a compact duration button. The editor owns a selected step ID and temporary parts; the duration panel is another body state inside the existing `Sheet`, not a new stacked `Modal` or route. Keep `TimingNotices` visible. Apply is disabled for zero or active wheel motion and functionally updates only that step's draft; Cancel/Back/backdrop returns without applying. Whole-editor Save remains separate. Preserve the editor's list position/focus when returning and avoid replacing another step via an old index. If the user chooses inline placement, reuse the same controlled picker and retain the outer list's virtualization/identity rules.
10. Keep all new user-facing copy in `Messages` and ro/en/ru catalogs. Reuse `timeUnits`, `stepField`, existing cancel and duration-error copy where appropriate; add duration summary/action/panel/Apply/hint keys only when needed. New buttons reuse established press feedback and the saved haptic preference; do not introduce per-scroll audio or haptic ticks in this scope.
11. Browser migration is part of this feature: `tests/e2e/helpers.ts:duration` and direct duration `.fill()` calls currently depend on textboxes. Update them to use supported wheel keyboard/selection interactions and assert the selected value before proceeding. Keep malformed text parsing tests in the pure core; replace impossible UI text-entry scenarios with bounded selection and all-zero cases. Never hide editable textboxes or add a production test-only setter just to keep old tests passing.
12. Add real-scrolling browser cases with real timers alongside the existing deterministic clock/timing scenarios. The previous Illegal invocation incident showed that fake timers can hide runtime adapter mistakes. Seed fixtures for setup only; execute the new selection through the real UI. Preserve current browser timeouts, retries and local transport settings.

### Documentation checked on 2026-11-06

- **D1:** [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and the previously loaded [Expo index](https://docs.expo.dev/llms.txt); package manifest is Expo 57 / React Native 0.86.3.
- **D2:** [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview) — bounded viewports, snapping, drag/momentum events, nested Android scrolling and positioning. Do not infer identical web behavior.
- **D3:** [React Native 0.86 accessibility](https://reactnative.dev/docs/0.86/accessibility) — adjustable controls and increment/decrement actions.
- **D4:** [Expo SDK 57 Picker](https://docs.expo.dev/versions/v57.0.0/sdk/picker/) and [picker upstream props](https://github.com/react-native-picker/picker#mode). The reviewed Android modes are dialog/dropdown; installing that package alone would not provide the requested wheel interaction on both mobile platforms. No dependency is selected for this plan.
- **D5:** [CSS scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-snap-type) — explicit browser scroll-snap behavior for the web adapter.
- **D6:** [W3C spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) — bounded value semantics and keyboard adjustment. Direct text editing is not part of this request.
- **D7:** Installed `react-native-web` ScrollView source was inspected alongside its native counterpart; platform-specific implementations share the public picker contract instead of assuming full native prop parity.

## Baseline, Commands and Ownership

- Started on `feature/background-notifications` with 26 modified tracked and 18 untracked files from earlier notification work, including its separate plan and learning patch. Preserve all 44 byte-for-byte during planning. The earlier unapproved notification-plan improvement stays unapplied.
- Current HEAD and local `master` both point to `8c01dd245098366a8ebd707d1e069f0a2b025411`. Created `feature/duration-wheel-picker` at that same commit while retaining existing local work. Avoided checkout/pull/stash/reset so the unfinished work was not overwritten or silently moved to a different base revision; this does not assert that remote `master` was freshly checked.
- The new branch does not isolate existing uncommitted notification edits. Future commits must inspect and scope actual diffs; commit checkpoints below do not authorize committing unrelated work. No existing source/context/notification plan is changed by this planning invocation.
- The preceding review identified Android requestable-denied permission gating and iOS DATE-trigger precision issues. They remain separate notification fixes, not tasks added to this UI plan. Wheel work must preserve the current notification owner, and a clean duration-picker check must not be presented as resolving that review or physical native notification acceptance.
- Retained context: `AGENTS.md`, DESCRIPTION, ARCHITECTURE, base rules, config, current timer/editor/core/tests and prior fix lessons. No roadmap, top-level RULES, research artifact, or optional skill-context override exists; no artificial milestone/research copy is created. Task tools are unavailable, so this file is the durable task ledger; direct source inspection supplied the permitted fallback for exploration.
- Read-only command discovery: installed `ai-factory commands --json`, CWD `.`; catalog `revision_sha256: 1d2b8bcb5323d6a6dfc0db6f568ede5b74a603741688454017e6fdf7188fff8b`. Manifest SHA-256 `02e9ed4cac486eb675e1b2f873bbbe7cd6cb5f28369535f1006dfcd09892cc32`; lock SHA-256 `b0edcf55daf61e1550368f11fb19f83bd25c9e04e4dec547ada32833713ac3a2`. Refresh after test registration changes the manifest.
- Planned command IDs, CWD `.`: `package.json#/scripts/lint` → `npm run lint`; `/scripts/typecheck` → `npm run typecheck`; `/scripts/test` → `npm test`; `/scripts/test:e2e` → `npm run test:e2e`; `/scripts/export` → `npm run export`. Windows Node/npm from WSL are the working toolchain; direct TypeScript tests require Node 24+.
- The preceding review passed 92 Node tests, lint and typecheck on the pre-picker application. Those results are baseline evidence, not verification of this unimplemented feature. This planning pass runs lint/typecheck again and records their actual results in Planning Validation below. Browser/export/device checks for the new picker are not yet run.
- No dependency install is planned. If implementation establishes that a dependency is necessary, check current official SDK docs and use `npx expo install`, preserving lockfile/config requirements; do not add a native module just to bypass gesture validation.

## Commit Plan

- **Commit 1, after tasks 1–4:** `feat(duration): add accessible scrolling wheel controls`
- **Commit 2, after tasks 5–8:** `feat(duration): use wheels in timer and schedule editing`
- **Commit 3, after tasks 9–12:** `test(duration): verify picker compatibility and document usage`

These are proposed checkpoints only. Each must compile and pass relevant registered checks. Missing devices remain pending; never claim task 11 completed to make a commit group appear finished. No automatic commit/push is included.

## Tasks

### Phase 1: Shared selection model and platform controls

- [x] Task 1: Add bounded duration-selection helpers and register meaningful unit coverage immediately.
  - **Files:** new `src/core/durationPicker.ts`, `tests/durationPicker.test.ts`; `package.json` test registration.
  - **Depends on:** none.
  - **Deliverable:** numeric parts, finite unit ranges, conversion preserving one-second precision and validation via the existing timer contract, nearest-index clamping for scroll offsets/row heights. Zero is a valid temporary selection but not a valid start/save duration. Invalid inputs cannot yield NaN offsets or an out-of-range selected value. Keep the core framework-free and avoid changing stored types/string parsing semantics.
  - **Verify:** 00:00:00, 00:00:01, 23:59:59; round trips for representative durations, malformed parts, negative/bouncing/oversized offsets and unusable geometry. Keep existing timer/planning boundaries intact, run registered tests, and refresh command discovery after manifest changes.
  - **Logging:** pure helpers remain silent; named assertions provide diagnostics. No routine input/value logs.
  - **Source:** W1–W4/W7; `core/timer.ts:validDuration` and base rules.

- [x] Task 2: Implement native scrolling columns with correct settling, cancellation and disabled behavior.
  - **Files:** new `src/components/DurationWheel.tsx`; add a small focused lifecycle helper/test only if needed for shared asynchronous behavior.
  - **Depends on:** 1.
  - **Deliverable:** controlled bounded native wheel, silent initial positioning, 44-point-or-larger rows, stable measured offsets, centered snapping and selected-row visuals. Implement slow-drag and momentum terminal paths, interaction state, programmatic update guards and cleanup. Disabled columns cannot change through gestures, row taps or accessibility actions. Preserve gesture isolation inside Timer's scrolling page; use the documented Android nesting mechanism where applicable.
  - **Verify:** check installed RN types/docs; unit-test nontrivial injectable settling/generation logic if extracted, and retain native slow-drag/fling/parent-scroll acceptance for task 11. No duplicate emission, stale callback, lost simultaneous-column update or permanent busy flag.
  - **Logging:** WARN only on an unexpected unrecoverable platform/ref operation; no scroll/event/selection logs. Wrap platform timer cancellation callbacks, following the existing regression lesson.
  - **Source:** W3/W7/W8/W10; decisions 2–4, D2/D3.

- [x] Task 3: Implement the web wheel adapter with real scrolling and keyboard semantics.
  - **Files:** new `src/components/DurationWheel.web.tsx`; reuse task 2's public props and task 1's pure bounds.
  - **Depends on:** 1, 2.
  - **Deliverable:** matching finite values/visual selection, CSS snapping, scoped pointer/touch scrolling, click-to-select and ArrowUp/Down/Home/End. Expose accessible name/min/max/current value and disabled state without editable numeric inputs. Keep keyboard alignment deterministic, isolate outer-page movement while interacting, respect reduced motion and clean listeners/fallback timers. DOM-specific code remains web-only.
  - **Verify:** typecheck both platform files; inspect the rendered spinbutton semantics and test real browser scroll/focus behavior in task 8. No native assumption that a web momentum event always exists; no browser/platform dependency enters the pure helper.
  - **Logging:** WARN for an actual failed browser boundary only; no routine wheel or keyboard logs.
  - **Source:** W3/W7/W8/W10; decisions 4–7, D5/D6/D7.

- [x] Task 4: Compose the shared themed/localized duration picker and accessible labels.
  - **Files:** new `src/components/DurationPicker.tsx`; `src/i18n/types.ts`, `ro.ts`, `en.ts`, `ru.ts`; existing catalog tests as applicable. Change `src/theme.ts` only if an existing semantic token is insufficient.
  - **Depends on:** 1, 2, 3.
  - **Deliverable:** compose three controlled columns with functional partial updates and aggregated interaction state. Reuse unit copy and semantic palettes; add the compact Planning duration action, panel title, Apply and adjustment hint translations. Preserve values on label/theme/layout/font changes. Native columns remain individually adjustable; decorative rows are not duplicate accessibility targets.
  - **Verify:** catalog parity/parameters, both palettes, two-digit visuals, clear center selection, min/max labels, disabled semantics, 320px/Russian/large-font layout and no newly hard-coded user-facing strings.
  - **Logging:** no render, translation-success or selection logs; existing WARN/ERROR boundaries only.
  - **Source:** W7/W8/W10; existing theme/i18n contracts, D3/D6.

<!-- Commit checkpoint 1: tasks 1–4 -->

### Phase 2: Timer and Planning integration

- [x] Task 5: Replace Timer text duration fields while preserving timing and completion behavior.
  - **Files:** `src/app/timer.tsx`; affected `tests/e2e/timer.spec.ts` coverage coordinated with task 7.
  - **Depends on:** 1, 4.
  - **Deliverable:** inline shared wheels and local numeric parts initialized from configured duration. Configure only an effective settled valid change. Preserve completed state/sound on no-op focus/alignment; real changed duration still returns the completed timer to idle. Keep zero validation, latest-value Start, motion gating, running/paused disabling and reset confirmation. Keep existing accepted-start permission gestures and separate timing/audio owners.
  - **Verify:** idle setup, one-second/max duration, zero recovery, rapid scroll then Start, configured-duration reload, running/paused attempts, reset/cancel, completion no-op versus actual change, and independent clocks. No writes from scroll animation frames.
  - **Logging:** no routine scroll/configuration/start logs; retain existing failure warnings without dumping AppData.
  - **Source:** W1–W4/W7–W9; `timer.tsx`, existing focus/audio regression.

- [x] Task 6: Replace Planning duration typing with compact wheel editing inside the existing sheet.
  - **Files:** `src/components/ScheduleStepRow.tsx`, `ScheduleEditorSheet.tsx`; shared picker and catalog entries if needed.
  - **Depends on:** 1, 4.
  - **Deliverable:** duration summary/action per row; one selected step ID and temporary parts owned by the editor. Show the wheel panel within the same sheet body, preserving outer list state and shared notices. Apply changes only the matching local draft after settling/validation; Cancel/back/backdrop returns without applying. Restore list position/focus, preserve Save/discard behavior, stable IDs, reorder/remove controls and protected-run rules. Keep name fields as TextInput. Respect a later user placement answer without changing the duration contract.
  - **Verify:** non-first action, Cancel versus Apply versus final Save, zero validation, rapid motion, action reorder/removal, fifty-step scrolling, close/discard, stale protected-template rejection, and concurrent completion/Stop while the panel remains open.
  - **Logging:** no user names/durations/scroll logs; use existing save failure feedback and WARN/ERROR policy.
  - **Source:** W2/W4–W10; compact placement assumption, current `StepDraft`/editor/save boundaries.

- [x] Task 7: Migrate existing UI test helpers and textbox-specific assertions without weakening coverage.
  - **Files:** `tests/e2e/helpers.ts`, `timer.spec.ts`, `planning.spec.ts`, `localization.spec.ts`, `theme.spec.ts`, `sounds.spec.ts`, `planningButtons.spec.ts`, `realTimers.spec.ts`; inspect all remaining duration `.fill()` consumers.
  - **Depends on:** 5, 6.
  - **Deliverable:** shared supported wheel-selection helper with localized/scoped labels and observed values; Planning helper opens the correct action duration panel and applies it. Keep fake-clock timing tests deterministic using supported immediate keyboard adjustment, not hidden React setters. Replace unavailable text-entry interactions with range/zero/disabled-wheel checks, preserving malformed parsing coverage in existing pure tests and all prior timing/persistence/audio assertions.
  - **Verify:** search for leftover numeric `.fill()`/textbox editability expectations; run impacted timer/planning/localization/theme/sound journeys. Retain no-op focus/completion regression using wheel focus and effective changes, and keep real-timer coverage real.
  - **Logging:** test diagnostics/page errors only; do not add runtime test hooks, environment flags or success logs.
  - **Source:** W1–W10; existing helper consumers and prior fake-timer lessons.

- [x] Task 8: Add actual wheel interaction, settling and accessibility browser regressions.
  - **Files:** new `tests/e2e/durationPicker.spec.ts`; reusable test helper changes if needed. Existing Playwright discovery includes new spec files automatically.
  - **Depends on:** 5, 6, 7.
  - **Deliverable:** real mouse-wheel/trackpad-equivalent events and touch-drag coverage without fake clocks, plus keyboard/row selection, endpoint behavior, centered selection and outer-page isolation. Exercise quick/slow motion, immediate Start/Apply gating, cancellation during motion and latest-parts correctness. Assert wheel interaction never focuses a numeric input and disabled wheels preserve stored clocks. Do not represent touch emulation as a physical native test.
  - **Verify:** actual selected accessibility values and persisted accepted durations, no page errors/warnings, no late selection after closing the panel, no stuck busy state, and no infinite fallback work. Use existing timeout/retry/transport settings; do not weaken them to hide failures.
  - **Logging:** normal Playwright traces/assertions only; no runtime selection instrumentation.
  - **Source:** W1–W3/W5–W10; previous native browser-timer regression pattern.

<!-- Commit checkpoint 2: tasks 5–8 -->

### Phase 3: Compatibility, verification and documentation

- [x] Task 9: Verify legacy data, concurrent feedback, localization and mobile layouts through the new controls.
  - **Files:** `tests/e2e/durationPicker.spec.ts`, existing `sounds.spec.ts`, `planning.spec.ts`, `localization.spec.ts`, `theme.spec.ts`; existing `tests/fixtures/app-v1-before-planning.json` remains read-only.
  - **Depends on:** 7, 8.
  - **Deliverable:** use the actual legacy fixture through app hydration, wheel focus/selection, unrelated save and reload; retain its completed one-second timer, stopwatch/history and false settings unless a real accepted edit changes them. Cover ro/en/ru in both palettes, Russian at 320px, representative 390/430px layouts and larger text. Exercise editor duration selection while another clock completes; Stop remains available and draft/panel persists. Include fifty-action editing near the end and restored list position/focus.
  - **Verify:** exact unaffected domain snapshots and user text, no no-op write/audio churn, correct duration after accepted edit/Save/reload, existing protected schedule semantics, and screenshots inspected for selection alignment/clipping. No fixture rewrite or replacement with synthetic-only data.
  - **Logging:** test/page failure diagnostics only; no saved payload logging in the application.
  - **Source:** W4–W10; representative fixture, i18n/theme/editor and audio contracts.

- [x] Task 10: Run final registered checks and all-platform exports on the final picker source revision.
  - **Files:** source/tests only for reproduced scoped failures; `package.json` registration if incomplete.
  - **Depends on:** 1–9. Physical devices are not required for independent CLI/browser verification.
  - **Deliverable:** refresh command discovery and hashes, run lint/typecheck/full Node suite/full browser suite and Android/iOS/web export. Confirm web DOM implementation stays out of native dependency paths, source/platform props compile and existing timing/audio/notification tests retain their assertions. Bind results to actual revision/fingerprint and distinguish pre-existing notification findings from picker regressions.
  - **Verify:** exact command IDs/CWD/results; no altered test deadlines/retries, fabricated native success, or missing test registration. Investigate and reproduce failures before fixes. Document unavailable checks and remaining reviewed notification issues honestly rather than silently expanding this plan.
  - **Logging:** command failure diagnostics; application logging remains WARN/ERROR only.
  - **Source:** AGENTS/base validation rules, discovered package scripts, W1–W10.

- [ ] Task 11: Check native gestures, keyboard avoidance and accessibility on physical Android/iOS devices.
  - **Files:** implemented picker/integration only for verified defects; record evidence or pending cases in this plan and owned usage documentation.
  - **Depends on:** 5, 6, 8, 9. Can run independently of task 10 when devices/builds are available.
  - **Deliverable:** identify actual binary/profile, device OS and source revision. Check one-unit slow drags, fast flicks/snapping/endpoints, multiple columns, page-versus-wheel scrolling, immediate Start/Apply, interruption/background/return, cancel/back, disabled running/paused controls and action-list return position. Verify duration selection opens no numeric keyboard, name typing still works, VoiceOver/TalkBack increment/decrement/focus, increased font size, reduced motion, both themes and compact translated labels. Recheck current API docs before any new platform workaround.
  - **Verify:** observed values/deadlines and pass/fail/pending per case. Browser emulation/exports do not establish native gesture or screen-reader behavior. If no device/binary is available, leave this task unchecked and continue independent checks/docs with the limitation visible; no cloud build submission is performed automatically.
  - **Logging:** actionable platform failure diagnostics only, without saved schedule/action names or credentials.
  - **Source:** W3/W6–W10; Original Request and AGENTS mobile-validation rule.

- [x] Task 12: Complete the mandatory usage-documentation checkpoint and factual context updates.
  - **Files:** `README.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, and this plan's progress ledger.
  - **Depends on:** 10 and available results/pending status from 11.
  - **Deliverable:** invoke `$aif-docs` for usage changes. Explain wheel interaction, finite ranges, zero validation, Timer editability/reset, compact Planning Apply/Cancel versus whole-schedule Save, desktop keyboard support and native accessibility evidence. Update file maps/data flow only to implemented facts, preserve the notification feature and its unresolved findings, and keep current README structure. No new standalone report, roadmap or rules artifact is needed.
  - **Verify:** meaning preservation, relative links, labels matching all catalogs, actual command/device evidence and accurate task completion. Do not mark all tasks complete while required native acceptance remains pending.
  - **Logging:** no new runtime logs; a concise warning identifies an unavailable required check when applicable.
  - **Source:** retained Docs: yes policy, W1–W10, `$aif-docs` ownership.

<!-- Commit checkpoint 3: tasks 9–12 -->

## Completion Criteria

- Both Timer and Planning durations can be selected by scrolling hours/minutes/seconds without numeric keyboard entry.
- Centered/settled selection, boundaries, simultaneous changes and immediate actions use the correct values; disabled/obsolete callbacks cannot alter a running timer or another action.
- Version-1 saved data, valid durations, names, drafts/confirmations, timing/audio/notification owners, both themes and all three languages retain their contracts.
- Registered tests and exports pass on an identified revision; native gesture/accessibility evidence or explicitly pending checks are recorded separately.
- Only actually completed tasks are checked. No commit, push, PR or build submission is implied by plan completion.

## Planning Validation

- Fresh `npm run lint` and `npm run typecheck` passed through Windows npm in `D:\app_crono`. No application code was changed; no picker test/browser/export/device result is claimed by this planning pass.
- Plan-integrity checks passed: exact Original Request, 12 unique unchecked tasks, ordered dependencies, required per-task file/deliverable/verification/logging/source fields, branch-matching discovery and whitespace. All 44 pre-existing modified/untracked files still match their pre-plan SHA-256 baseline. Meaning preservation: PASS.
- Continuation: implement task 1 on `feature/duration-wheel-picker` through `$aif-implement`. The optional Planning-placement question remains open; until answered, the disclosed compact selector is the draft default. Existing notification review issues and device acceptance remain separate.

## Implementation Progress

- Started from the planned branch with existing local notification work retained. The explicit implementation request authorizes the disclosed compact Planning default. Tests/docs/minimal logging retained; proposed commit checkpoints are deferred and no publishing is authorized.

- Task 1 complete: pure bounded numeric parts/conversion/snapping helpers added; test registration refreshed immediately. All 96 Node tests, lint and typecheck pass. Catalog `39b4ab2760a95ca6bc9e63672a7ea5834b75f8f27e215192a1b3021d785ee43f`; manifest `ef32f7bc2b22642775139088f67f0355efcdfa060de668a15af191b48e59349e`; lock unchanged.

- Task 2 complete: native bounded wheels and a shared injectable settling controller/hook added. Six immediately registered lifecycle tests cover drag, momentum, stale timers, disabled state, disposal/reactivation and explicit selection; all 102 Node tests pass. Lint/typecheck pass. Controller creation and committed-prop binding run in layout effects, satisfying React refs/immutability rules without lint suppressions. Catalog `280e2ab3cedeb1adf3bd596e4eb2a1aea1aeaa97841566463e267eed3db7696b`; manifest `e26fe37c0dc20caeeba68cd151d08faf44bde1cd014fa429bfc0f3a4d2f73ef3`. Native gestures still require task 11.

- Task 3 complete: web adapter adds bounded CSS snapping, pointer/touch scrolling, click selection, ArrowUp/Down/Home/End, spinbutton semantics and a non-passive disabled-wheel guard. Shared idle settling supplies the portable browser fallback; programmatic alignment is always nonanimated. Lint/typecheck pass; mounted real browser interaction follows in tasks 5/8.

- Task 4 complete: shared controlled three-column picker, aggregated interaction state, font-scale geometry, contextual accessible names and five new typed ro/en/ru messages added. Existing catalog parity and all 102 Node tests pass; lint/typecheck pass. Semantic palettes reused; layout screenshots follow mounted integration. Checkpoint 1 deferred as planned.

- Task 5 complete: Timer uses local numeric wheels with effective settled configuration, zero/start and motion guards, disabled running/paused selection, and existing reset/accepted-start behavior. Lint/typecheck pass. A real Chrome smoke journey passed zero validation, 3,000ms start and blocked running adjustments without page errors; light 390px screenshot inspected. Full migrated regressions follow task 7.

- Task 6 complete: each action opens one temporary wheel panel inside the existing editor sheet. Zero validation, Cancel, local-only Apply, explicit Save and reload passed in real Chrome without page errors; screenshot inspected. Lint/typecheck pass. Stable IDs, the mounted virtualized list, existing notices and whole-editor save/discard boundaries are retained; broader list/concurrency regressions follow tasks 7–9.

- Task 7 complete: supported keyboard wheel helpers replace all numeric duration fills; zero/endpoints/disabled semantics replace impossible textbox inputs. The selected row retains palette contrast assertions. Seventy-five affected browser cases passed on the initial run; eight layout failures from the old color assertion were corrected and all eight passed on rerun. That rerun also reproduced a focus race with a closing sheet; awaiting actual CSS dismissal fixes the test setup without changing deadlines/retries or production navigation. Lint/typecheck pass. Existing completion no-op/effective-change, audio, persistence, fractional pause/resume and localization assertions remain.

- Task 8 complete: six real-timer Chrome cases pass for mouse scrolling, simultaneous columns, Start/Apply gating, endpoints, row clicks, touch drag/cancel, background interruption, draft cancellation and same-value completion/audio preservation. The outside-column mouse-release regression failed before the fix and passed afterward: cleaned-up window pointer-release/cancel/blur listeners now release that column's controller. No page errors or console warnings; lint/typecheck pass. Touch emulation is browser evidence only. Checkpoint 2 deferred as planned.

- Task 9 complete: all 15 picker browser cases pass across the last full run (14) and the final fifty-action rerun (1); all 103 Node tests and lint/typecheck pass. Real legacy data preserves exact clocks/history/false settings, adds only existing normalized preference defaults on unrelated Save, and has no no-op wheel write/audio churn. Concurrent timer/schedule completion and Stop preserve the unsaved panel. ro/en/ru in both palettes, 320/390/430px layouts, resizing, enlarged web text and covered-editor tab exclusion pass; screenshots inspected. The fifty-action regression reproduced a lost viewport/focus: new native/web `EditorBody` adapters preserve layout while hiding interaction/accessibility, and duration return uses a captured offset. Cancel/Apply/reorder/removal/Save/reload now pass with stable IDs and at most one pixel of browser rounding. A geometry-change unit case invalidates old-row callbacks silently. Native font scaling/screen-reader acceptance remains task 11.

- Task 10 complete: refreshed catalog remains `280e2ab3cedeb1adf3bd596e4eb2a1aea1aeaa97841566463e267eed3db7696b`; manifest `e26fe37c0dc20caeeba68cd151d08faf44bde1cd014fa429bfc0f3a4d2f73ef3`, lock unchanged. Final 110-file implementation/test/config/asset fingerprint is `b6ed99c1e947aa64ab588ceb17edcaac08f44b6c96013c684cf7d1a90bcec394` on HEAD `8c01dd245098366a8ebd707d1e069f0a2b025411` with uncommitted picker/notification work. CWD `.` command IDs `package.json#/scripts/{lint,typecheck,test,test:e2e,export}` ran through Windows npm in `D:\app_crono`: lint/typecheck, 103 Node tests and Android/iOS/web export passed. Full browser run: 118 passed, one unchanged stopwatch journey timed out at 45 seconds (24.1min total); that exact case then passed alone in 26.1s, with no source changes, timeout increase or retry configuration. This is 119 passing cases across the full run plus isolated rerun, not one clean full run. Concurrent export and observed host memory pressure are possible timing contributors, not a proven cause. No source drift and whitespace checks passed. Native bundle entry hashes: Android `7d2e43970c0266528d76028ab42edc731fb40bb63d649bdda3a3d3def94a9656`, iOS `72598db6c5e0c8fceda1f8b648de71eab67a666359b872538961ced8e0afea50`; web `7d3fc3330d7010577e02626d6dd96e883ac315f0faa85b52d58ab028072e9f74`. The native adapters import no DOM; Metro resolves the `.web.tsx` implementations only for web. The earlier Android permission/iOS DATE precision findings remain outside picker scope.

- Task 11 pending: no controllable physical native device/runtime or rebuilt binary was available. Linux/PATH/default-Windows-SDK ADB probes and project-root APK/IPA searches found none; no native projects or cloud builds were created. Both Android and iOS still need slow drag/fling/snapping/endpoints, parent scrolling, simultaneous columns/immediate actions, interruption/return, disabled controls, keyboard avoidance, editor return position, VoiceOver/TalkBack actions/focus, native font scaling, reduced motion, themes and translated compact labels. Browser touch emulation and successful exports do not pass these cases. Per the task's explicit fallback, continue independent documentation while leaving this checkbox open.

- Task 12 complete: applied `$aif-docs` within the already authorized usage/file-map scope. README explains centered finite wheels, zero/motion validation, Timer editability/reset, web keys and Planning Apply/Cancel versus Save. AGENTS/DESCRIPTION/ARCHITECTURE map actual modules and data flow, preserve the separate notification owner and record its two unresolved review findings. Existing README structure/history retained per this plan; no split, new report, roadmap or rules edit. Reviewed final content against the original request, W1–W10, catalogs and source: **Meaning preservation: PASS**. Technical/readability review passed for the scoped updates; all 15 internal Markdown links/anchors resolve, authoritative AGENTS instructions remain byte-identical outside the owned map/documentation additions, and final lint/typecheck/whitespace checks pass. The 110-file checked implementation fingerprint is unchanged; every pre-existing baseline file outside the intended picker/docs scope remains byte-identical. No commit, push, PR, cloud build or publication occurred. Resume task 11 through `$aif-implement` when a usable native binary/device is available; this plan remains active with native acceptance explicitly unfinished.
