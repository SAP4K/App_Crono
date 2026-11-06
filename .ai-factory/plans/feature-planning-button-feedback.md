# Implementation Plan: Planning Button Press Effects

Branch: `feature/planning-button-feedback`
Created: 2026-11-06
Mode: full
Status: implemented; 4/4 tasks completed. Physical-device verification pending.
Current task: none.

## Original Request

poti te rog sa adaugi efecte la butoanele din fereastra planificare la fel ca in restul

## Settings

- Testing: yes — focused browser interactions and existing relevant regressions.
- Logging: minimal — preserve existing WARN/ERROR reporting; no press/render/success logs.
- Docs: yes — small update through the mandatory `$aif-docs` checkpoint during implementation.
- Retain the user's earlier preference for a full plan with dependencies, tests, and documentation.
- Interpretation: visible press feedback matching Stopwatch's existing `opacity: 0.72` and `scale: 0.98`. This is an implementation interpretation of “la fel ca in restul”, grounded in the current buttons; the user has not requested a new animation design.
- Keep the Romanian interface, current blue palettes, existing actions, haptic preference/call sites, and timing/audio behavior. No dependency or persistence change is needed.

## Requirements Reconciliation

Authority: the current request defines the visual change. Existing repository instructions and implemented behavior define its boundaries. The multilingual plan is separate and remains pending; this feature does not depend on its implementation.

| Decision | Source | Verification |
|---|---|---|
| Give Planning buttons the press effect already used elsewhere | Original Request; `src/app/index.tsx` — `styles.pressed` and three Pressable style callbacks | Actual pointer/touch press changes opacity/scale, release restores them, and the action still runs once. |
| Cover schedule list, run controls, editor, action controls, and shared buttons displayed in Planning | `src/app/planning.tsx`; `PlanningRunCard.tsx`; `ScheduleEditorSheet.tsx`; `ScheduleStepRow.tsx`; shared `Sheet.tsx` / `TimingNotices.tsx` | Representative hold/release checks in each category, with the full inventory reviewed. |
| Preserve disabled rules, confirmations, timing, feedback, and controlled drafts | `.ai-factory/ARCHITECTURE.md` — User Actions and Persistence / Display and Device Behavior; `.ai-factory/rules/base.md` — State and Timing / Mobile UI | Disabled controls retain opacity and do not activate; canceled gestures preserve state; existing planning flows and audio regressions pass. |
| Use mobile-compatible existing primitives and theme tokens | `AGENTS.md` — Expo workflow / Project Workflow; `src/theme.ts` | Existing Pressable styling, no new animated runtime, 44-point targets, compact layouts, both palettes, lint/typecheck. |
| Include tests/docs and WARN/ERROR-only logging | User's previous explicit workflow choices | Focused regression evidence and a documentation checkpoint; no per-press console output. |

Supported combinations:

| ID / input and validation | Persisted state | Output or transition | Side effects and invariants | Verification scenario |
|---|---|---|---|---|
| C1: enabled button, light or dark theme, pointer/touch held inside | Unchanged before activation | Opacity 0.72 and scale 0.98 during the press; normal style after release | Existing `onPress` fires once on accepted release; layout dimensions and hit target remain usable | Hold Add action; assert styles and unchanged action count; release; assert one new action and restored styles. |
| C2: canceled press, drag beyond the retention region, or scroll taking the responder | Unchanged | Press appearance clears; no accepted activation | No extra haptic, modal opening, save/delete, or schedule transition | Cancel a held button gesture outside its retention region; assert baseline styles and unchanged state; exercise scrolling in the editor. |
| C3: disabled control because of limit, invalid draft, protected active template, boundary move, or unavailable restart | Unchanged | Existing disabled opacity retained; no pressed transform or activation | Disabled appearance wins even if eligibility changes while a press is in progress | Verify invalid Save, first/last move buttons, protected template actions, 20-template / 50-action limits, and completed run with missing template. |
| C4: running/paused/completed schedule, active independent clocks or alert | Existing domain transition only when accepted | Existing pause/resume/reset/restart/replacement behavior with press feedback | Holding itself does not mutate timing; reset/replacement still confirm; no duplicate sound or timing owner restart | Exercise run controls alongside a stopwatch/timer and retain real-browser timer regressions. |
| C5: editor/discard/delete/reset/replacement sheet open in either palette | Existing draft/confirmed mutation contract | Local action buttons respond visibly; shared Close and Confirm retain their existing effects | Draft survives Continue editing; deletion/reset/replacement require confirmed activation | Existing editor/confirmation journey plus held Cancel and Stop actions. |
| C6: shared Cancel / audio Stop rendered outside Planning | Existing behavior | Same additive pressed styling in all consumers | One visual implementation; no route conditionals or global button rewrite | Spot-check a Timer confirmation and an alert Stop outside Planning; reuse theme/sheet regression coverage. |

Meaning preservation: PASS — the plan matches the observed press effect and keeps the user's request scoped to Planning and its existing shared controls. It does not infer click sounds, new haptic behavior, or a redesign.

## Implementation Contract and File Scope

- Add a small reusable visual constant, `buttonPressedStyle`, to existing `src/theme.ts`: opacity 0.72 and `transform: [{ scale: 0.98 }]`. Keep it free of React/native dependencies and do not mutate it. It supplies the new effects; unrelated existing button styles need no refactor.
- Convert the affected static `Pressable.style` arrays/objects to the established `({ pressed }) => [...]` form. Preserve each base style and disabled predicate. Apply the pressed style only while enabled; put disabled appearance last. Keep original unpressed dimensions, padding, radius, colors, labels, and accessible roles.
- Use Pressable's own state. Do not create React state, timers, animated drivers, press delays, custom pointer handlers, or persistence for an effect already supported by the existing primitive. Domain actions and existing `feedback()` calls stay in their current `onPress` paths, not in style callbacks or `onPressIn`.
- **Schedule list:** `Orar nou`, template `Pornește`, `Editează`, `Șterge` in `src/app/planning.tsx`.
- **Run card:** `Resetează` and the state-dependent `Pauză` / `Continuă` / `Repornește` in `src/components/PlanningRunCard.tsx`.
- **Editor:** `Adaugă etapă`, `Salvează orarul`, `Renunță la modificări`, `Continuă editarea` in `src/components/ScheduleEditorSheet.tsx`.
- **Action row:** move up, move down, remove in `src/components/ScheduleStepRow.tsx`; retain first/last disabled states and 44-point targets.
- **Shared controls:** add the missing effect to `ConfirmSheet`'s `Renunță` in `src/components/Sheet.tsx` and `Oprește sunetul` in `src/components/TimingNotices.tsx`. These components also render elsewhere, so this small additive style change applies consistently to their other consumers. Existing Close (opacity 0.5) and Confirm (opacity 0.75) already provide press feedback and keep their established behavior. The modal backdrop is not a button face and keeps its current presentation.
- Inputs, tab navigation, core algorithms, storage, audio adapters/coordinators, automatic completion sounds, native configuration, and dependencies require no changes. Preserve the three `(handle) => clearTimeout(handle)` adapters and existing real-timer tests.

## Baseline and Ownership

- Source checkout: `feature/multilingual-support`, at `dd576e4e4f586e4a21f0b4882cd37d8741009835` (`feat(theme): add blue palettes and fix timer cleanup`). This is the committed theme/timer baseline; multilingual application code has not been implemented.
- Created this new branch from that HEAD, preserving the untracked `.ai-factory/plans/feature-multilingual-support.md` byte-for-byte. Do not stage or revise that separate plan as part of this feature.
- Configured eventual integration branch: `master`. The committed theme baseline was published in PR #2; this planning invocation performs no remote update or merge.
- Read-only inputs: AGENTS, DESCRIPTION, ARCHITECTURE, base rules, config, other plans/patches, source, tests, and manifests. Only this new plan is written; application code is unchanged.
- No roadmap/research artifact exists for linkage. Optional skill-context files are absent. Native-device availability remains unverified. No unresolved product decision blocks this plan.

## Tasks

- [x] Task 1: Add the shared press style and apply it to the Planning list and run card.
  - **Files:** `src/theme.ts`, `src/app/planning.tsx`, `src/components/PlanningRunCard.tsx`.
  - **Depends on:** none.
  - **Deliverable:** implement the visual constant and Pressable style callbacks for all listed list/run buttons. Keep the protected-template, template-limit, and unavailable-restart disabled predicates and opacity. Preserve all action handlers, confirmations, run IDs/deadlines, timing intervals, keys, and existing feedback calls.
  - **Verify:** C1/C3/C4 — inspect primary/secondary/destructive controls, press/release/cancel, each run state, protected template and limit; confirm actions happen once after accepted activation. Keep disabled opacity unchanged and avoid new state writes while holding.
  - **Logging:** none for styling or accepted presses; retain existing warnings/errors.
  - **Source:** Original Request; Stopwatch pressed style; PlanningScreen / PlanningRunCard current handlers and disabled rules.

- [x] Task 2: Apply matching feedback to the editor and action-row controls.
  - **Files:** `src/components/ScheduleEditorSheet.tsx`, `src/components/ScheduleStepRow.tsx`.
  - **Depends on:** 1.
  - **Deliverable:** add style callbacks using the same visual constant to Add, Save, discard/continue and move/remove buttons. Keep validation, max actions, row keys, controlled inputs, virtualization, keyboard handling, save-error behavior, and explicit discard flow intact. Do not add haptic calls merely because these controls gain a visual effect.
  - **Verify:** C1/C2/C3/C5 — invalid Save stays disabled, 50-action Add stays disabled, first/last move buttons remain disabled, one accepted move/removal/add occurs, scrolling/canceled gestures do not edit the draft, and Continue editing preserves values.
  - **Logging:** no press/draft/render logs; retain existing failure feedback without logging user text.
  - **Source:** editor and row inventory above; existing `tests/e2e/planning.spec.ts` editor journey; project controlled-state and mobile rules.

- [x] Task 3: Complete the missing effects on shared Cancel and audio Stop controls.
  - **Files:** `src/components/Sheet.tsx`, `src/components/TimingNotices.tsx`.
  - **Depends on:** 1.
  - **Deliverable:** style callbacks using the shared constant on Cancel and Stop. Preserve existing Close/Confirm effects, backdrop behavior, accessible modal handling, and Stop's single audio-owner cancellation. Shared components use one implementation across routes; do not add Planning-only flags or alter other button families.
  - **Verify:** C2/C5/C6 — held/released/canceled Cancel and Stop; Cancel dismisses without a domain mutation; Stop cancels once and preserves schedule/timer state and any open editor. Check a Timer confirmation to cover the shared-component effect beyond Planning.
  - **Logging:** preserve current audio failure reporting; no new click/success or style logs.
  - **Source:** current shared Sheet/TimingNotices handlers; architecture one-playback-owner contract; existing modal Stop scenarios.

- [x] Task 4: Verify press behavior and regressions, then complete the documentation checkpoint.
  - **Files:** new `tests/e2e/planningButtons.spec.ts`; existing `tests/e2e/planning.spec.ts`, `theme.spec.ts`, and helpers only if a reusable extension is necessary; `README.md` through `$aif-docs`; this plan's evidence ledger.
  - **Depends on:** 1, 2, 3.
  - **Deliverable:** add a few meaningful real interaction cases covering the combinations table. Use actual press/hold/release and cancel gestures, not `testOnly_pressed`, injected component state, source-text assertions, or a test of the exported style constant. Record styles before/during/after the gesture and compare action/state effects. Cover both palettes; keep browser page-error observation. Documentation gets a short factual note about consistent Planning feedback and actual validation, without a new docs page.
  - **Verify:** use a stable editor Add button for exact pre-release and post-release assertions; exercise representative list/run, row, and shared controls. For pointer cancellation move beyond the whole press-retention region; verify actual cancellation rather than assuming leaving the rectangle cancels. Add a Chrome touch-event path or record touch cancellation as native/manual pending when the runner cannot reproduce it accurately. Use the literal `tests/fixtures/app-v1-before-planning.json` through actual hydration for a representative no-data-loss path, add/save a schedule, and assert the fixture's stopwatch/history/preferences remain intact. Seed valid bounded data for 20-template / 50-action disabled cases and retain the fixture's original bytes.
  - **Validation:** run lint, typecheck, Node contrast/regression tests, focused new button tests, existing planning/theme scenarios, and the real-timer file once after the final source changes. Run browser commands sequentially; retain one worker, 45-second limits, no retries, loopback identity encoding, and current audio fixtures. Inspect representative light/dark screenshots at 320px and 390px for clipping, transforms, full labels, and hit targets. On available iOS/Android devices check hold/release, scrolling cancellation, disabled controls, and existing haptics on/off; explicitly record unavailable native checks. Web verification does not prove physical-device behavior.
  - **Logging:** normal assertions/traces supply diagnostics; no production event instrumentation or saved payload dumps.
  - **Source:** request and C1–C6; AGENTS required lint/typecheck; existing legacy fixture, planning/theme coverage, and real-timer prevention patch.

Four tasks form one focused UI change. Suggested final commit after verification: `feat(planning): add consistent button press feedback`. Planning does not execute that commit or implementation.

## Command Provenance

Read-only `ai-factory commands --json` discovery ran from repository root on 2026-11-06 through the installed Windows Node CLI. Catalog revision SHA-256: `a2bfcc72b13c0813af89dc3a119b9375d36375a75ffd025d472969d65604c6ba`.

- `package.json` SHA-256: `a85c779b5e417bdbe98dc06f75ee9869dcd62f593ce69d399327a35dba785d21`.
- `package-lock.json` SHA-256: `9faa54bacbf3c0741e5d586438bd147df17dc598e460c03cf78bf64029609766`.
- Entries are declared / not_run; discovery alone is not verification. Refresh if manifests change; none is planned.

| Command ID | CWD | Planned verification command |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` |
| `package.json#/scripts/test` | `.` | `npm test` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e -- tests/e2e/planningButtons.spec.ts` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e -- tests/e2e/planning.spec.ts tests/e2e/theme.spec.ts tests/e2e/realTimers.spec.ts` |

The existing Playwright test directory discovers the new `.spec.ts` automatically; no package-script registration or new Node test file is needed. On this WSL host use Windows Node/npm, for example `cmd.exe /d /c "cd /d D:\app_crono && npm run lint"`. Node 24+ is required for the current Node test script; npm/package-lock remain authoritative.

Installed Expo is `~57.0.31`, with React Native `0.86.3`. The [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [Expo documentation index](https://docs.expo.dev/llms.txt) were consulted in this planning session; the specific interaction contract was checked against [React Native 0.86 Pressable](https://reactnative.dev/docs/0.86/pressable). Follow AGENTS' matching-documentation rule before implementation touches any native/Expo API. No app API code is written by this plan.

## Completion Evidence

Planning checks on 2026-11-06 passed: exact Original Request; four pending task specifications with valid earlier dependencies, file scopes, verification, logging, and sources; one plan representation; matching command catalog/source hashes; correct branch at `dd576e4e4f586e4a21f0b4882cd37d8741009835`; unchanged application files/index; and byte-identical separate multilingual plan. `npm run lint` and `npm run typecheck` passed. Meaning preservation: PASS.

Implementation verification is complete for the available browser/CLI environment. This plan, source changes, tests, and documentation remain local and uncommitted; the separate multilingual plan is unchanged. Native iOS/Android gesture and haptic checks remain pending.

- Task 1 complete (2026-11-06): shared visual style and list/run callbacks added with disabled guards. Lint/typecheck passed. A real Chrome smoke check verified New hold/cancel, pause hold/release, protected disabled template actions, unchanged run identity, and no page errors. Broader boundary/theme cases remain assigned to task 4.
- Task 2 complete (2026-11-06): editor/discard/action-row callbacks use the shared effect with disabled guards. Lint/typecheck passed. A real Chrome check verified Add hold/release/cancel, invalid Save and first/last move disabled states, and pressed Continue editing without losing the draft. Remaining limit/touch cases are assigned to task 4.
- Task 3 complete (2026-11-06): shared Cancel and Stop gain the effect; existing handlers and Close/Confirm effects are retained. Lint/typecheck passed. Chrome verified hold/cancel/release on a Timer confirmation and Settings audio Stop, retaining the timer snapshot and one playback, without page errors.
- Task 4 progress (2026-11-06): eight new browser cases pass in one rerun (29.4 seconds), including genuine Chrome touchStart/touchCancel/touchEnd, both palettes, disabled bounds/limits, shared actions, and the literal legacy fixture. The first run passed 7/8: the dark legacy case incorrectly assumed hydration had already persisted a planning field. Its corrected assertion now checks the whole raw stored snapshot is unchanged while Save is held; application behavior was not changed for that failure. All 51 Node tests pass. Four 320/390px light/dark screenshots were visually inspected. The separate 36-case existing regression run is still in progress; its Windows runner continued after the shell connection closed. README usage and its AGENTS documentation entry were updated through aif-docs; final evidence review is pending.
- Task 4 complete (2026-11-06): all 36 existing planning/theme/real-timer cases finished successfully, for 44 targeted browser cases across the two final commands. The shell bridge ended with 143 after partial output, but the identified Windows runner continued; no second runner was started. Its final `test-results/.last-run.json` was written at 00:48:09 UTC with `status: passed` / `failedTests: []`, and the Windows runner then exited. Existing 45-second limits, one worker, no retries, loopback headers, and audio fixtures are unchanged. Final lint/typecheck and tracked diff checks pass. README remains 148 lines with valid relative links; usage, actual checks, and pending native press/haptic checks are documented, and its AGENTS entry is current. Documentation meaning preservation PASS; no document restructuring was needed or performed.

Verification binds to HEAD `dd576e4e4f586e4a21f0b4882cd37d8741009835` plus the uncommitted feature changes. SHA-256 of the sorted source/test snapshot is `0a164dd317a9160e3a9b4dc670c21de828ea926625fa00f20e013df07d57d697`: feed each relative POSIX path, NUL, raw file bytes, NUL for all `src/**/*.ts` / `src/**/*.tsx`, the four browser spec files in Command Provenance, `tests/e2e/helpers.ts`, the literal legacy fixture, `playwright.config.ts`, and both package manifests, sorted together. Source/test inputs were unchanged between final runs and review. The legacy fixture and multilingual plan are preserved; no timing/core/persistence/audio owner, dependency, or runtime configuration changed. The full browser suite and bundle exports were not rerun for this style-only feature. Native iOS/Android hold/release, scroll cancellation, and haptics on/off remain pending; adb is absent on both WSL and Windows, and no native device run was performed.
