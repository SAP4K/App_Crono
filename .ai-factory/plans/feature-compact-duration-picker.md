# Implementation Plan: Compact Clock-Style Duration Picker

Branch: `feature/compact-duration-picker`
Created: 2026-11-12 (Europe/Bucharest)
Mode: full — retain the user's detailed-plan preference.
Status: complete — 4/4 implementation tasks complete; deferred physical acceptance remains pending.
Base: `59e75289a77bda62eda36ae37ffa2f6b4b0dcda2` from fetched `origin/master`. Studio [PR #26](https://github.com/SAP4K/App_Crono/pull/26) is merged. Its application tree equals the preceding `7e3c02216d31a06e351f6e1ee05526d66130b258` feature tree. Local `master` was not switched or updated.

## Original Request

imi place B, dar as vrea ca cofrele sa fie mai mari si punctele tot

## Accepted Refinement

On 2026-11-12, the user requested another small increase:

> fale te rog putin inca mai mari

Increase the preceding target from 36/28 px to 40/32 px for digits/colons. Keep the 260 px width; use 50 px rows to contain the measured 49 px glyph height without clipping. This supersedes the preceding 44 px row target, while retaining three visible rows and the existing inertia constants.

## Settings

- Testing: yes — meaningful regressions and existing real-input coverage.
- Logging: minimal — existing WARN/ERROR only; no render, per-frame, draft or successful-interaction logs.
- Docs: yes — mandatory scoped completion checkpoint through `$aif-docs`.
- Selected direction: option B from the preceding comparison, refined to use larger digits and larger colon separators. The earlier request was to bring hours/minutes/seconds closer together. Apply the same shared presentation in Timer setup and the Planning step-duration panel.
- Preserve Studio Light/Dark/System, all six languages with Romanian default, duration bounds, stored data, whole-window scrolling, keyboard/accessibility actions, presets, reduced motion and existing timing/playback/notification owners.
- No new preference, dependency, persistence migration, route, native module or timing/motion owner. The new branch and this plan/reference assets are planning work; implementation follows a later `$aif-implement` request.
- Physical Android/iOS font scaling, glyph alignment, assistive technology, wheel feel and earlier background/lock acceptance remain deferred under the user's existing decision.

## Selected Visual Reference

The user chose B and requested larger type. Use a **260 logical-pixel frame**, centered within available content width, with **40 px digits** and **32 px colons** at normal text scale. Original B used 28 px digits and 20 px colons. This is one shared clock-style selector, with full localized labels below and three independent wheels.

| Property | Normal-scale target |
|---|---|
| Frame width | 260, bounded by the actual parent width |
| Digits | Inter semibold, 40; line height approximately 44 |
| Colon separators | Inter medium, 32; line height approximately 38 |
| Selection | One uninterrupted Studio selected-surface band |
| Row geometry | 50 at normal scale; three visible rows; targets remain at least 44 |
| Frame vertical padding / label gap | 8 / 6 |
| Labels | Existing localized unit names, normally 12; retain readable scaling/wrapping |

References: [Dark](feature-compact-duration-picker-assets/b-large-dark.png), [Light](feature-compact-duration-picker-assets/b-large-light.png), [measured visual specification](feature-compact-duration-picker-assets/visual-spec.json). The local before/after comparison is `http://localhost:8110/large-b.html`; that ignored preview is optional, not a runtime dependency.

These images come from isolated DOM-only modifications of the existing exported Studio picker, not implemented native or application code. The sampled browser picker is 260 × 189 px with three 86 px columns and 50 px rows. Its selected two-digit text measures approximately 51.77 × 49 px at 40 px font size in both palettes. This establishes the normal-size browser reference only. Large-text, real input, native layout and actual separator interaction/accessibility acceptance still require implementation checks.

Reference SHA256: Dark `28f889758457a3603dc541a6a4c6332702d94e4d311c78fca45244ec5d3e2b44`; Light `dcbe3d056ae67f327e65af73f8dc7b28f43b1065af1a4babf4b92654cde5990d`. The specification records dimensions, measurements and source identity; do not import plan JSON into runtime code.

### Responsive and Interaction Contract

- At normal scale, keep the frame centered at 260 where it fits. At enlarged native text sizes, permit it to grow toward available parent width before fitting individual numeric labels. Never exceed the parent's actual usable width or the existing 480 px desktop application cap. Keep each wheel's interactive width at least 44.
- Use a 50 px baseline row so the enlarged glyphs fit; the preceding 44 px baseline is superseded by this accepted visual refinement. Grow row geometry coherently for enlarged text, for example `max(50, ceil(50 * fontScale))` rather than the old `40 * fontScale` capacity. Viewport, row padding, snap interval, visual selection and separator center must use the same effective row height. This is a typography/geometry adjustment, not authorization to retune inertia.
- Preserve native text scaling; do not globally disable it or shrink labels to preserve a rigid 260 px frame. Reserve space around the colon boundaries. If large numeric text cannot fit the available column, use local numeric fitting; full two-digit values and localized labels must remain readable without intersecting the separators. Keep font scaling and width fitting separate so native text is not scaled twice.
- Colons stay stationary on the selected row while numbers scroll. They are decorative formatting: no focus stop, announcement, click handler, responder or scroll ownership. They cannot intercept column taps, wheel/touch gestures or keyboard input.
- Preserve the current three adjustable/spinbutton roles, labels, values, hints, tab order and increment/decrement behavior. Retain actual focus indication; decorative layers cannot cover it. Changing theme, language, width or text scale cannot remount the picker or lose accepted/pending selections.

## Requirements Reconciliation

Authority: this request refines the user's selected compact B design. `AGENTS.md` and `.ai-factory/rules/base.md` govern mobile compatibility, localization, accessibility, persistence and verification. `ARCHITECTURE.md` and `DESCRIPTION.md` define existing state/controller ownership. The preceding Studio plan provides retained theme and motion constraints. Optional top-level rules, roadmap and research artifacts are absent; no research requirements are inferred.

| Supported combination | Source / invariant | Verification |
|---|---|---|
| Timer setup and Planning duration panel, both palettes | User's B selection; shared `DurationPicker.tsx` | Real rendered compact frame, larger digits/colons, readable labels, no overlap and three existing roles in both callers. |
| Normal/enlarged text, 320/390 px and capped desktop | `AGENTS.md` — mobile UI; responsive contract above | Actual glyph/column/row/band bounds, reachable Start/Apply/Cancel and no horizontal overflow; separate native scaling acceptance remains pending. |
| All six languages and live theme/language changes | Typed catalogs; existing ThemeContext and shared state | Reuse current locale matrix, retain full unit names, same selected values, focus host and stored state. |
| Manual touch/wheel/keys versus explicit presets, reduced motion and interruption | Existing duration-wheel controllers and transition contracts | Real input, strict centering, immediate accepted values, independent columns, busy gating and lifecycle cleanup. |
| Planning draft Cancel versus Apply and explicit Save | `ScheduleEditorSheet.tsx` and current persistence contract | Cancel preserves data; Apply changes only the draft; Save alone persists it and returning restores source focus/scroll position. |
| Existing records and unchanged timing/audio/notifications | Literal version-1 fixture and current owner boundaries | Retain the registered literal legacy → preset → real backup/import → reload journey; no data migration or second owner. |

Meaning preservation: PASS — B remains compact and gains larger digits/separators. Larger typography does not authorize changed duration values, gesture physics, shared-state semantics, hidden controls or resumption of deferred physical tests.

## Tasks

### Phase 1: Shared clock-style presentation

- [x] **Task 1: Implement the compact frame and stationary decorative colons.**
  - Files: `src/components/DurationPicker.tsx`, `src/theme.ts` only for a small set of genuinely shared presentation constants.
  - Center the normal 260 px frame; derive width limits from the actual parent rather than the window alone, covering the Planning panel's narrower content. Use 8 px vertical padding, 6 px caption gap and the existing Studio border/selected surface. Keep the selection band behind the three independent columns.
  - Place two decorative colons at the boundaries between the columns, vertically centered in the actual selected row. Use 32 px type with the selected foreground color, correct scale/disabled appearance and pointer-transparent, accessibility-hidden layers. Do not insert focusable controls or a second scroll surface.
  - Route row height, band position and separator position through the same effective geometry. Preserve existing unit ordering, public callbacks, local draft handling and stable wheel keys/refs. No timer/planning route needs a duplicate selector.
  - Acceptance: actual shared presentation matches the B reference in both callers; colons remain stationary and cannot consume input. Log no routine layout or user data. Depends on: none. Sources: visual reference and first/fourth reconciliation rows.

- [x] **Task 2: Enlarge numeric typography in both adapters and handle compact/enlarged layouts.**
  - Files: `src/components/DurationWheel.tsx`, `src/components/DurationWheel.web.tsx`, `DurationPicker.tsx`; `DurationWheel.types.ts` only if a small explicit presentation input is needed to keep adapters consistent.
  - Use 40 px digits at normal scale, with native line height around 44 and corresponding bounded web line height. Keep tabular Inter digits, selected/unselected colors, every full two-digit value and the existing full localized labels below. Apply parent width/text-scale fitting locally where needed; no global text-scale suppression or generic typography framework.
  - Use 50 px rows at normal scale; enlarge rows coherently when text scale requires it. Derive pixel-based gesture fixtures from current row measurements instead of retuning the controllers to obsolete 44 px assumptions. Preserve three-row viewports, finite row padding, valid bounds, snap offsets and alignment recovery under current geometry. Preserve the existing controllers and their cancellation identities.
  - Do not change wheel easing constants, the six-row 607.5 ms profile, 940 ms missing-frame deadline, Android 0.99575/iOS 0.99915 deceleration, preset acceptance timing, manual busy ownership or existing focus/keyboard/accessibility actions. Geometry-sensitive tests must derive actual rows rather than retain obsolete pixel assumptions.
  - Acceptance: normal digits and colons are visibly larger than original B, with no row clipping or glyph/colon intersection. At larger text sizes, expand within available width and fit numbers only as necessary while labels remain readable. Native glyph/scale acceptance is explicitly pending until physical testing resumes. Logging: existing bounded WARN/ERROR only. Depends on: Task 1. Sources: responsive contract and first four reconciliation rows.

### Phase 2: Meaningful regression checks and documentation

- [x] **Task 3: Extend existing layout and real-input tests for the selected design.**
  - Files: `tests/e2e/durationPicker.spec.ts`, `tests/e2e/timerPresetMotion.spec.ts`, nearest geometry assertions in `durationInertia.spec.ts` / `editorScrolling.spec.ts` / `theme.spec.ts` only where affected. Reuse helpers and registered journeys rather than create a parallel suite.
  - Assert the actual rendered normal-scale compact width, increased numeric/colon size, three visible rows, column target sizes, selected-row/band/colon alignment and non-overlapping text. Check at least 320/390 px and capped desktop, both palettes and Timer/Planning. Use computed bounds and actual text ranges, not palette constants or screenshots alone.
  - Retain the existing six-language coverage and font readiness waits. The old 36 px CSS override is smaller than the new normal size and must not shrink the selector during nominal enlargement checks. Preserve its functional assertions, verify the new 40 px default, and exercise larger text with coherently enlarged rows through an available production geometry path. Browser zoom/copy enlargement and native font scaling are distinct evidence; record unavailable native scaling as pending instead of claiming a synthetic CSS override proves it.
  - Exercise real wheel/touch/keyboard input, neighboring-row taps near both separator boundaries, independent columns, explicit presets during motion, reduced motion, resizing and interruption. Colons must add no focus stops/announcements or gestures; accepted duration, strict centering, busy guards and Start/Apply behavior remain intact. Preserve test deadlines and contrast thresholds.
  - Retain Planning Cancel/Apply/Save, parent scrolling and focus return, plus the literal legacy fixture → preset → navigation → real reviewed backup/import → reload case. Pure controller tests already cover changed geometry; extend only if this implementation changes a pure calculation or reveals a new case. Register a reproduced defect before correcting it.
  - Acceptance: relevant registered tests pass against the implemented source, including actual narrow layouts and glyph bounds, without weakening existing behavioral assertions. Logging: assertion-local geometry/color diagnostics only; no stored-data dumps. Depends on: Tasks 1–2. Sources: all reconciliation rows.

- [x] **Task 4: Complete scoped documentation and source-bound verification.**
  - Files: `README.md` and this plan's implementation-progress/evidence section. Use `$aif-docs` for the documentation checkpoint. Change other project context only if an actual ownership/map change warrants it; do not rewrite historical Studio results.
  - Describe the compact shared clock-style selector and larger digits/colons in Timer and Planning. Keep the current appearance semantics, locale behavior, native font uncertainty and device-test deferral clear. Capture representative actual implemented views in both palettes and distinguish them from planning mockups.
  - Run `npm run lint`, `npm run typecheck`, `npm test`, fresh Android/iOS/web exports, and the relevant registered duration-picker/preset/inertia/editor-scroll/theme tests. Start with `tests/e2e/durationPicker.spec.ts`, `timerPresetMotion.spec.ts`, `durationInertia.spec.ts`, `editorScrolling.spec.ts` and `theme.spec.ts`; expand only for an actual additional affected surface or failure. A repeated full browser run is not required solely for this localized presentation change.
  - Use a separate ignored export/runner and available port, preserving the user's current app and comparison previews. Record actual command selection, runtime, cases/skips/retries, source/export/runner/result identities and any limits. Keep declaration listings separate from execution JSON. Recheck tested inputs after final checks.
  - Acceptance: docs and final evidence describe the same implemented source; no prototype, old Studio run or bundle export is presented as physical-device validation. No signed build, installation, device-test resumption, commit, push or PR is authorized by this task. Logging: existing WARN/ERROR only. Depends on: Tasks 1–3.

All four tasks form one small feature; a later requested commit may use `feat(duration): compact the picker and enlarge clock digits`. No commit checkpoint or automatic publication is needed during planning/implementation.

## Commands and Compatibility References

Command discovery: `ai-factory commands --json`, cwd `.`, revision `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`; ignored inventory `.expo/compact-picker-plan-commands.json`. Manifest and lockfile are unchanged. Use Windows Node.js 24+, npm and Git for this checkout.

| Command ID | Implementation use |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test` | `npm test` |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- --config <isolated-config> tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/durationInertia.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/theme.spec.ts` |
| `package.json#/scripts/export` | `npm run export -- --output-dir <isolated-output>` for all three platforms |

Installed versions: Expo `~57.0.32`, React Native `0.86.3`. Planning checked [SDK 57](https://docs.expo.dev/versions/v57.0.0/), the [Expo documentation index](https://docs.expo.dev/llms.txt), [RN 0.86 Text](https://reactnative.dev/docs/0.86/text) and [text style props](https://reactnative.dev/docs/0.86/text-style-props). Native font scaling/fitting and line-height behavior must follow those APIs; verify relevant versioned docs again before changing API usage.

## Planning Baseline and Limits

- The new branch starts from merged Studio on `origin/master`; the source tree equals the previously verified Studio/outline-fix tree. Planning changes only this plan and its reference assets.
- Planning-baseline lint and typecheck pass, exit 0. Logs: `.expo/compact-picker-plan-lint.log`, `.expo/compact-picker-plan-types.log`. No implementation, new registered test, fresh application export or physical acceptance is claimed.
- Both normal-size browser mockups were visually inspected, use 40 px digits / 32 px colons and 50 px rows. Their glyph measurements are design-reference evidence, not proof of production keyboard/gesture/large-text behavior.
- Physical Android/iOS font/glyph/scale, screen-reader, touch/gesture, safe-area/keyboard and earlier background/lock checks remain deferred. There is no automatic device-test resumption or publication.

Meaning preservation: PASS — this plan retains the chosen compact B design, enlarges its digits and colons, and preserves existing functional, persistence, motion and accessibility obligations with native uncertainty explicit.

## Implementation Progress

- Task 1: shared 260 px frame, 50 px scaled row geometry and stationary 32 px decorative colons implemented. Lint/typecheck and an all-platform export pass. Four pilot combinations (Timer/Planning × Light/Dark at 320 px) confirm frame size, alignment, three roles, hidden/pointer-transparent separators and unchanged storage. The initial pilot needed its Planning locator scoped to the active duration dialog because the covered Timer remains mounted; application code did not change for that correction. Logs: `.expo/compact-picker-task1-{lint,types,export,pilot}.log`; pilot export remains isolated on port 8112. Numeric enlargement is Task 2, not part of this intermediate result.

- Task 2: 40 px tabular numbers and 6 px label gaps applied in both adapters. Parent-local width fitting reserves separator space; scaled rows/width and proportional colons preserve native text scaling without applying it twice. Lint/typecheck, fresh Android/iOS/web exports and the four 320 px Timer/Planning × Light/Dark pilot combinations pass, including actual 40/32 px fonts, geometry and storage preservation. Controllers and easing constants are unchanged. Logs: `.expo/compact-picker-task2-{lint,types,pilot}.log`, `.expo/compact-picker-export.log`; immutable export on port 8113.

- Task 3, initial selection: eight new registered compact-layout/zoom cases pass. The first five-file selection passed 174/176 cases in 441.5 seconds, with no skips/retries. Two existing no-op tests failed because converting the input helper from pixels to rows accidentally changed their intentional one-pixel input to one full row. The tests correctly observed a different timer value. Their inputs are corrected to 0.02 rows (one pixel at the new geometry), preserving the same-value, no-write and audio assertions; application code/export are unchanged. Initial evidence is retained in `.expo/compact-picker-browser-initial.{log,json}`, `.expo/compact-picker-initial-inventory.json` and `.expo/compact-picker-browser-results/`. Result SHA256: `c498219562b63ee0a78ec215bcdabd26754e479c34325ef222be2e804e6d7d31`. The corrected selection was pending at that checkpoint; this is not a claim of a green initial run.

- Task 3 completed: the two corrected no-op cases pass together in 8.8 seconds, followed by all **176/176 related browser cases in one final run, 423.1 seconds (7.1 minutes), no skips/retries or worker errors**. The eight new cases check rendered glyph/row/band/colon geometry, decorative input pass-through, draft Cancel/Apply/Save, both palettes at 320/390/1024 px, and real 1.25× browser magnification with host identity/focus retained. Existing real gestures, strict centering/deadlines, enlarged labels, six-language presets, scrolling, themes, sound and literal legacy → actual reviewed backup/import → reload checks remain intact. Browser magnification does not exercise native OS fontScale. Corrected-input log: `.expo/compact-picker-noop.log`; final run: `.expo/compact-picker-browser.{log,json}`, `.expo/compact-picker-browser-final-results/`. Source/export/runner inputs were rehashed after the run and match their pre-run inventory.

## Final Verification Evidence

Runtime: Windows Node.js `v24.15.0`, installed Chrome `157.0.8103.51`, one worker and no retries. The isolated runner imports the tracked Playwright configuration, uses `http://localhost:8113`, disables managed web-server startup and tests the immutable export. The user's existing app and comparison previews are preserved.

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | PASS, exit 0 after the input correction | `.expo/compact-picker-final-lint.log` |
| `npm run typecheck` | PASS, exit 0 after the input correction | `.expo/compact-picker-final-types.log` |
| `npm test` | 294/294 pass, no skips/cancellations | `.expo/compact-picker-final-node.log` |
| `npm run export -- --output-dir .expo/compact-picker-export` | PASS, fresh Android/iOS/web bundles, exit 0 | `.expo/compact-picker-export.log` |
| Final related browser selection | 176/176 pass in 423118.675 ms; no skips/retries/flakes/worker errors | `.expo/compact-picker-browser.{log,json}` |

The final browser command was:

```powershell
npm run test:e2e -- --config .expo/compact-picker.config.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/durationInertia.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/theme.spec.ts --output .expo/compact-picker-browser-final-results
```

The separate declaration listing (`--list --reporter=list`, `.expo/compact-picker-browser-list.log`) and executed file/title identities match exactly: 33 inertia, 33 picker, 6 editor-scroll, 40 theme and 64 preset scenarios. No declaration command overwrote execution JSON. The full repository browser suite was not rerun; earlier Studio evidence remains historical.

### Tested Input Identity

The per-file inventory is `.expo/compact-picker-inventory.json`. Group SHA256 values hash compact UTF-8 JSON arrays of `{path,sha256}` with paths and object keys sorted; individual files use raw-byte SHA256.

| Input | Files | SHA256 |
|---|---:|---|
| Application, tests, configs, manifests, assets and local modules | 221 | `940596713d321dc6fe84d16b25392974a2677ead0ffcb57d69c5da83003f5a84` |
| All-platform export | 76 | `855f925a4299ddb5b4e5d26019cfbd63da519a657790b2ca2149aa4303c27e23` |
| Isolated runner/server | 2 | `0a7ce0fd24f43a4499c3bbc05dcfbc64cb33fd58e1c2be44eb3e9785957181b7` |
| Final execution JSON (raw file) | 1 | `e282a80cfc4eb49bcd58bfcb6b6c75b235c9d8613560afe0f8a3a4ece41a880e` |

The initial test-input revision had source-group hash `7512f681cded3ffd9bac662e281c4b31da535c2a4fd591084e8e289c8db7e79d`; only the browser test file changed for the correction. Application/export inputs stayed identical. The final inventory stores actual runtime, statistics and all 176 executed identities; source/export/runner hashes match before and after execution. Command discovery revision remains `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee` (`.expo/compact-picker-implement-commands.json`).

### Implemented Views and Remaining Limits

Final-run actual application captures were visually reviewed for both callers in both palettes:

- Dark: `.expo/compact-picker-browser-final-results/durationPicker-compact-clo-94db7-es-input-through-separators/{timer,planning}-clock.png`.
- Light: `.expo/compact-picker-browser-final-results/durationPicker-compact-clo-b0715-es-input-through-separators/{timer,planning}-clock.png`.

These captures show the implemented 260 px frame, 40 px digits, 32 px fixed colons and 50 px rows. They are separate from the planning mockups above. The registered browser zoom cases use real 1.25× magnification; caption-enlargement checks retain 40 px numbers. Neither proves native OS font scaling. Physical Android/iOS glyph/scale, assistive technology, native wheel feel and prior background/lock acceptance remain deferred. Bundle exports are not physical-device validation. No installation or publication was performed.

### Documentation Checkpoint

`$aif-docs` updates the existing README's feature/usage text and adds this feature's current verification entry. Historical Studio and earlier results are retained. The current AGENTS documentation map remains correct; there is no new page, module, dependency, owner or persistence contract to map. The existing 267-line README layout is retained within the approved scoped update.

Meaning preservation: PASS — compared with the accepted B refinement and existing README passages; duration bounds, inertia, native uncertainty, data ownership, deferred device testing and publication authority are preserved.

| Review | Outcome |
|---|---|
| Technical accuracy | PASS — described dimensions, adapters, commands and counts match the implemented source and actual results. |
| Local references | PASS — 34 README links, including 7 local anchors, and 3 plan reference links resolve. |
| Readability and retained meaning | PASS for changed passages — compact usage and verification additions preserve historical results and native limits. |

- Task 4 completed: README usage/verification and this plan's progress/evidence are updated through `$aif-docs`. Final local links/anchors and Git whitespace checks pass. Rules review confirms shared presentation tokens, unchanged domain/persistence/motion ownership, existing localized labels, decorative accessibility isolation and minimal logging. Source/export/runner/result identities were rechecked after the documentation edits and remain identical. All four implementation tasks are complete; deferred native acceptance remains separate.
