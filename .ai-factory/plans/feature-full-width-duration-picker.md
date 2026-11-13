# Implementation Plan: Full-Width Studio Duration Picker

Branch: `feature/full-width-duration-picker`
Created: 2026-11-13 (Europe/Bucharest)
Mode: full — reuse the user's detailed-plan preference.
Status: complete — 3/3 implementation tasks complete; deferred physical acceptance remains pending.
Starting point: `59e75289a77bda62eda36ae37ffa2f6b4b0dcda2`, with the existing, uncommitted compact-picker implementation retained from `feature/compact-duration-picker`. The branch was created from the current checkout; no base-branch checkout, pull, stash, commit or publication was performed.

## Original Request

poti te rog sa extinzi aceasta componente pe toata latimea, acum asa mic nu pare organic, fala te rog mai organic

## Settings

- Testing: yes — extend the existing rendered-layout and interaction regressions.
- Logging: minimal — existing WARN/ERROR only; no render, per-frame, measurement or saved-data logs.
- Docs: yes — mandatory scoped documentation checkpoint through `$aif-docs`.
- Apply the same shared presentation to Timer setup and the Planning step-duration panel.
- Retain Studio palettes, large numeric typography, full localized unit labels, three independent wheels and the existing app/sheet width limits.
- Physical native typography, font scaling, assistive technology and gesture acceptance remain pending under the existing deferral. Installing the preceding APK did not establish these checks.
- This command creates the plan and branch. Runtime changes follow `$aif-implement`.

## Visual and Responsive Contract

The outer frame and continuous selected-row background fill **100% of the actual parent's usable content width**, aligning with neighboring content and controls. Timer and Planning retain their existing 24 px content gutters and the app/sheet's 480 px maximum width. Full width means the available content area, rather than the physical screen edge.

Center the three equal-width wheel columns in a shared inner track, with `width: '100%'` and a **360 logical-pixel maximum at normal text scale**. This fills typical phone content while keeping the clock group coherent on the widest existing preview. At enlarged native text scale, the inner maximum may grow as `360 * max(1, fontScale)`, still bounded by the available frame width. The outer frame never gains a font-scale-dependent fixed width.

| Element | Target |
|---|---|
| Outer frame | Fill actual usable parent width; preserve Studio border and control radius |
| Selected band | One uninterrupted full-width Studio selected surface |
| Inner wheel track | Centered, full available width up to the scaled 360 px maximum |
| Digits / colons | Preserve 40 / 32 px baseline sizes where they fit |
| Rows | Preserve 50 px baseline, three visible rows and coherent native scaling |
| Vertical padding / caption gap | Preserve 8 / 6 px |
| Unit captions | Existing complete localized labels, readable and able to wrap |

Measure the **inner track**, then derive numeric fitting and colon positions from that same local coordinate system. Position the stationary colons at its one-third and two-third boundaries; they must not follow the wider outer frame boundaries when the track is capped. Keep the band, selected rows and colons vertically aligned. Preserve the existing local numeric fitting for genuinely narrow parents without suppressing native font scaling or scaling text twice.

Preserve stable wheel hosts/keys, callbacks, accessibility roles and focus. The additional layout wrapper must not own scroll gestures, become a focus stop or remount wheels on width, theme, language or text-scale changes. The selection decoration remains pointer-transparent and accessibility-hidden. Continue to expose three adjustable native controls / web spinbuttons, with two-digit values, unchanged bounds and reachable actions.

## Requirements Reconciliation

Authority: the latest explicit request supersedes the preceding fixed **260 px outer-frame width** and centered narrow-card presentation. The preceding compact-picker plan remains historical evidence; retain its large digits/colons and interaction requirements. `AGENTS.md`, `.ai-factory/rules/base.md`, `.ai-factory/ARCHITECTURE.md` and current source retain authority over compatibility, ownership, accessibility, localization and persistence. Optional top-level rules, roadmap and research files are absent.

| Supported combination | Source and retained behavior | Verification |
|---|---|---|
| Timer and Planning, Light/Dark, 320/390 px phones and capped desktop | Latest request; `DurationPicker.tsx`; existing caller gutters | Frame matches actual parent content edges, band fills frame, inner track is centered and bounded, full glyphs/captions fit. |
| Normal and enlarged text, live parent resize | `AGENTS.md` — mobile UI; previous responsive obligations | Real parent-width changes and browser zoom retain wheel hosts/focus/selection; native fontScale remains a distinct pending check. |
| Six languages and live theme/language changes | Typed catalogs and existing selection lifecycle | Complete captions remain readable; saved duration, draft and independent preferences retain their values. |
| Manual wheel/touch/keyboard input and explicit presets | Existing wheel/presentation/deceleration controllers | Independent input, exact centering, separator pass-through, immediate preset acceptance and existing interruption/busy guards remain intact. |
| Planning Cancel, Apply and whole-schedule Save | `ScheduleEditorSheet.tsx` and persistence contract | Cancel retains data; Apply changes only the draft; explicit Save persists; returning restores source focus and parent scrolling. |
| Literal existing data and timing/audio/notification owners | `tests/fixtures/app-v1-before-planning.json`; architecture boundaries | Retain the registered literal legacy → preset → real backup/import → reload journey; no migration or second owner. |

Meaning preservation: PASS — the requested width and visual integration change supersedes only the narrow outer-frame design. Large typography, independent selection, existing inertia and data/lifecycle semantics are retained. The 360 px inner maximum is an implementation choice for balanced spacing, not a restriction on the outer frame.

The earlier unapproved compact-picker refinement proposal at `/tmp/crono-compact-picker-improve-proposal.patch` remains unapproved and is not applied to its historical plan. The parent-width regressions below are justified independently by this new full-width requirement.

## Tasks

### Phase 1: Shared full-width presentation

- [x] **Task 1: Stretch the outer frame and balance the clock inside a locally measured track.**
  - Files: `src/components/DurationPicker.tsx`, `src/theme.ts` for the small shared presentation metric; no caller duplication is expected.
  - Replace the outer `metrics.width * scale` width with parent-filling layout. Remove or rename the obsolete fixed-frame width metric so it cannot reintroduce a 260 px cap. Preserve existing gutters, border, radius, vertical padding and full-width selection band.
  - Add one centered inner row for the existing equal-flex wheel columns, bounded at the scaled 360 px maximum. Measure that row with `onLayout` for the existing numeric-fitting calculation. Make zero/unmeasured width safe and avoid measurement loops; do not introduce a global resize observer or a generic layout framework.
  - Place colon decoration using the inner track's coordinates while leaving the selected background full width. Preserve hidden/pointer-transparent semantics for every decorative layer, stable wheel keys/refs, coherent row geometry, caption layout and the public props/callback contract.
  - Keep `DurationWheel.tsx`, `.web.tsx`, `DurationWheel.types.ts` and all timing/motion controllers unchanged unless a concrete reproduced integration defect requires a narrowly justified correction. Do not retune inertia, preset timing, bounds, manual busy ownership or input handling.
  - Acceptance: both callers fill their own actual usable width, normal digits/colons remain 40/32 px, the inner group is centered with equal columns and stationary correctly aligned colons, and large text/narrow parents fit without horizontal overflow. Sources: visual contract and reconciliation rows 1–4. Logging: no new routine logs; preserve existing bounded WARN/ERROR. Depends on: none.

### Phase 2: Layout and interaction regression coverage

- [x] **Task 2: Update existing browser checks for parent fill, centered inner geometry and stable interaction.**
  - Files: `tests/e2e/durationPicker.spec.ts`, `tests/e2e/timerPresetMotion.spec.ts`; existing `durationInertia.spec.ts` only if an actual wrapper-sensitive assertion needs adjustment.
  - Replace `clockGeometry`'s hard-coded 260 px frame assertion with measured parent **content** edges, accounting for padding, borders and box sizing, with at most 1 px rounding tolerance. Assert full-width selection-band bounds independently from inner-track width/centering. Preserve all existing row, font, glyph, column-target, separator-spacing, role and centering assertions.
  - Extend the registered Timer/Planning × palette × 320/390/1024 cases. At desktop, prove the frame grows beyond the inner maximum while the inner clock remains centered; on phones, prove the track fits within the full-width frame. Measure actual caption text bounds, not only the presence of translated labels.
  - Add a real parent-constrain-and-restore step to the existing layout cases: temporarily give the actual caller parent 180 px usable width, allow production `onLayout`/numeric fitting to run, then restore. Check frame fill, complete digits/captions, no colon overlap, at least 44 px column targets, strict row centering, stable wheel host/focus, unchanged selection/draft/storage and available Start/Apply after settling. Do not override numeric fonts or rows to manufacture a pass.
  - Update the existing caption-enlargement CSS selectors in both files because adding an inner wrapper changes their current direct-child relationship. Use a narrow stable caption target and prove that the 16 px caption enlargement actually applied; never accidentally style decorative colons. Retain the existing six-language/theme/resizing journeys rather than add a duplicate Cartesian suite.
  - Retain real browser zoom, manual gestures/keys, separator input pass-through, preset takeover, reduced motion, lifecycle interruption, exact settling, Planning Cancel/Apply/Save and outer scrolling. Keep the registered literal legacy-data backup/import journey. A failed check needing a fix must reproduce first and pass after that fix.
  - Acceptance: the changed presentation is verified through actual rendered bounds and existing user flows, with focus/data and deadlines preserved. Browser magnification does not establish native fontScale acceptance. Sources: all reconciliation rows. Logging: assertion-local geometry diagnostics only; no stored-data dumps. Depends on: Task 1.

### Phase 3: Documentation and scoped verification

- [x] **Task 3: Document the responsive selector and verify the implemented source.**
  - Files: `README.md` and this plan's progress/evidence sections. Route the mandatory documentation checkpoint through `$aif-docs`.
  - Update current-behavior copy from the compact fixed-width picker to the full-width Studio frame with a centered clock group. Preserve the historical compact-picker plan/results. Capture representative actual Timer/Planning views in both palettes for visual review; do not present planning references as implemented screenshots.
  - Run `npm run lint`, `npm run typecheck`, and the existing registered picker/preset/inertia scenarios. Include the relevant editor-scroll and theme cases because the new wrapper participates in panels and font/layout changes. Start with the five files listed below; broaden only for a concrete new affected surface or unresolved failure.
  - Produce a fresh `npm run export -- --output-dir <ignored-isolated-output>` for Android/iOS/web bundling. Pure core/controller behavior is outside this scope; run `npm test` if a pure calculation/controller changes or a reproduced concern justifies it. Do not add unit tests that mirror static style constants.
  - Preserve the user's running development server on port 8091. Use an isolated export/runner and a separate available port for final browser checks, and bind results to the tested application/test inputs. Record actual commands, passing/failing case accounting and native limitations without rewriting old evidence or claiming physical acceptance.
  - Acceptance: documentation, rendered visual review and checks refer to the same implemented source. Physical native checks remain pending. No commit, push, PR, APK rebuild or installation follows automatically from this plan. Sources: `AGENTS.md` validation and documentation policy, all reconciliation rows. Logging: existing WARN/ERROR only. Depends on: Tasks 1–2.

## Commands and Compatibility References

Command discovery: `ai-factory commands --json`, cwd `.`, revision SHA256 `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`. Source `package.json` SHA256 `b69e16c481b7f82de9491307d476a747764d1915782d291216a6a9d50c23ef9a`; `package-lock.json` SHA256 `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh discovery if either input changes. Declared commands are not execution evidence. Use the existing Windows Node.js 24+ and npm environment for this checkout.

| Command ID, cwd `.` | Planned use |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- --config <isolated-config> tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/durationInertia.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/theme.spec.ts` |
| `package.json#/scripts/export` | `npm run export -- --output-dir <ignored-isolated-output>` |
| `package.json#/scripts/test` | `npm test` if core/controller changes or a concrete concern warrants it |

Installed versions: Expo `~57.0.32`, React Native `0.86.3`. Planning checked the matching [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [React Native 0.86 layout props](https://reactnative.dev/docs/0.86/layout-props) and [Text](https://reactnative.dev/docs/0.86/text). Recheck relevant versioned APIs before changing their usage during implementation.

## Planning Evidence and Limits

- Read-only source/test reconnaissance identifies the fixed-width constraint in `DurationPicker.tsx`, the shared metric in `theme.ts`, and existing parent containers that already support stretched content. The bounded inner-track design is a planned visual choice, not yet a tested result.
- Retained-source inventory before planning: 180 files under `src/`, `tests/`, plus README, package/app manifests and the preceding compact-picker plan; SHA256 `a871b0eee5ec55577a1bef31cdf6dba111b8cab2c45626210ba3e287c09879ca`. Hash input is sorted project-relative paths and file bytes, each separated/terminated by NUL.
- Only this new plan is written during planning. Existing application edits, tests, references and the preceding plan are preserved; the runtime remains the preceding compact layout until implementation.
- Planning-baseline `npm run lint` and `npm run typecheck` both pass, exit 0. Logs: `.expo/full-width-picker-plan-lint.log`, `.expo/full-width-picker-plan-types.log`. The retained-source inventory matches exactly after the plan was written; the original request, three pending task IDs and single canonical plan representation were checked. No new full-width test, export or physical acceptance is claimed here.

Meaning preservation: PASS — full outer width, balanced clock spacing and shared Timer/Planning behavior preserve the latest request and the retained functional obligations.

## Implementation Progress

- Task 1 complete: shared parent-filling frame and selection band, centered 360 px maximum inner track, locally measured fitting and track-relative decorative colons. Existing wheel adapters/controllers and caller containers are unchanged. Lint/typecheck and fresh Android/iOS/web exports pass. Eight rendered pilot combinations (Timer/Planning × Light/Dark × 320/1024 px) pass: actual frames are 272/432 px, inner tracks 270/360 px, and normal digits remain 40 px. Representative actual screenshots were inspected. Logs: `.expo/full-width-{lint,types,export,pilot}.log`; previews: `.expo/full-width-previews/`; isolated immutable export: `.expo/full-width-export`, port 8114. These are browser/build checks, not native font/gesture acceptance.

- Task 2 complete: the eight registered full-width/zoom cases pass, including 180 px usable-parent constraint/restoration in both callers and palettes, real glyph/caption bounds, band/track alignment, stable hosts/focus/values/storage and enabled actions. Both caption-enlargement tests now assert that their styling actually applies. The first five-file run was stopped after 50 passes and 14 repeated failures because the test selector incorrectly assumed production Text classes contained `css-text`; the actual export uses hashed classes. No application defect was involved. A DOM probe confirmed the old selector matched zero captions and the component-scoped structural selector matched three. After this test-only correction, the exact English 320 px layout case and a German dark 320 px enlarged-preset case pass. Logs: `.expo/full-width-layout.log`, `.expo/full-width-initial-browser.log`, `.expo/full-width-caption-{rerun,preset}.log`; initial traces and the initial input inventory are retained. Final five-file verification is Task 3; no green full run is claimed yet.

- Task 3 complete: README feature summary and detailed appearance copy now describe the full-width frame and balanced inner group. The historical compact-picker results remain explicitly historical. Documentation review: **Meaning preservation: PASS**; current copy matches source and inspected renders, all 35 local path references exist, and physical acceptance remains pending. The existing documentation map stays accurate; no new page/module or general documentation restructuring was needed. Lint/typecheck, fresh Android/iOS/web exports and the final five-file browser selection pass. The existing development server remains available on port 8091; a fresh isolated browser loaded `/timer` with HTTP 200, a 342 px parent-filling frame at a 390 px viewport, and no page errors.

## Final Verification Evidence

The final selection passed **176/176 cases in one run, 425327.767 ms (7.1 minutes), with zero skips, retries, flaky cases or worker errors**. File/title identities match the separate declaration listing exactly: 33 inertia, 33 picker, 6 editor-scroll, 40 theme and 64 preset cases. This is the relevant five-file selection, not a claim that the entire repository browser suite ran.

| Check | Result | Evidence |
|---|---|---|
| `npm run lint` | PASS, exit 0 after the selector correction | `.expo/full-width-final-lint.log` |
| `npm run typecheck` | PASS, exit 0 after the selector correction | `.expo/full-width-final-types.log` |
| `npm run export -- --output-dir .expo/full-width-export` | PASS, exit 0; fresh Android/iOS/web bundles | `.expo/full-width-export.log` |
| Final related browser selection | 176/176 pass, no skips/retries | `.expo/full-width-browser.{log,json}`, `.expo/full-width-final-browser-results/` |
| Existing local development app | HTTP 200, current full-width track, no runtime page errors | `.expo/full-width-local-smoke.log` |

Final browser command, cwd `.`:

```powershell
npm run test:e2e -- --config .expo/full-width.config.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/durationInertia.spec.ts tests/e2e/editorScrolling.spec.ts tests/e2e/theme.spec.ts --max-failures=1 --output .expo/full-width-final-browser-results
```

Runtime: Windows Node.js `v24.15.0`, installed Chrome `157.0.8103.51`, one worker. The isolated configuration imports the tracked Playwright config, targets immutable export port 8114 and disables managed web-server startup. The separate `--list --reporter=list` output is `.expo/full-width-browser-list.log`; it never overwrote execution JSON.

The initial stopped run and selector correction remain recorded above. The application/export did not change for that correction. Actual implemented Timer/Planning screenshots in both palettes were inspected from `.expo/full-width-previews/`. The development server on 8091 was preserved throughout.

### Tested Input Identity

Ignored manifest: `.expo/full-width-inventory.json`. Its explicitly listed file bytes and group hashes match the pre-run inventory after final execution:

| Group | Files | SHA256 |
|---|---:|---|
| Source/configuration/asset/test inputs | 221 | `1164ebf62d7a53aebbc1cae1a1b67d831a63e10ecfa8dab762c13050d9a9d925` |
| Android/iOS/web export files | 76 | `a5137c060a7026c2a9dbc747a4c65cea6fb8e742098bf7e2ec50a731217b40c9` |
| Isolated runner and static server | 2 | `830412c7d1f74006123b8207a8873c69e0a562a3aa9dd467403b0444b717b0f1` |
| Final executed JSON | — | `1eeef22cfba2a8a88aab918254bdca5afd43a1b80fc0bd08c6c2b9da0c2bcfe6` |

The source inventory differs from the preceding verified compact picker only in `DurationPicker.tsx`, `theme.ts`, `durationPicker.spec.ts` and `timerPresetMotion.spec.ts`. Wheel adapters, public props, core/controllers, assets, manifests and persistence owners are unchanged. README and this plan are documentation, outside that application/test inventory.

No core/controller calculation changed, so the conditional `npm test` rerun was unnecessary. No APK/IPA was rebuilt or installed for this change. Physical native typography/fontScale, screen-reader and gesture acceptance, along with earlier background/lock acceptance, remain deferred; browser checks and bundle exports do not establish them. No commit, push, PR or automatic device-test resumption was performed.
