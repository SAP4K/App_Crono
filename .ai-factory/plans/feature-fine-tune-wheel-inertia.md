# Implementation Plan: Fine-Tune Duration-Wheel Inertia

Branch: `feature/fine-tune-wheel-inertia`
Created: 2026-11-12 (Europe/Bucharest)
Mode: full
Status: completed — all four tasks implemented and verified; physical native acceptance remains deferred.
Base: `3576016db00bfac76c51e70dfcebf1d3fc53ef53` from `feature/slower-wheel-inertia`. This branch preserves the implementation the user has just approved in principle. Its [PR #23](https://github.com/SAP4K/App_Crono/pull/23) remains open against `feature/progressive-wheel-deceleration`; that prerequisite's [PR #22](https://github.com/SAP4K/App_Crono/pull/22) remains open against `master`. Configured integration base: `master` (`origin/master`: `ded865ed808ab2c16f46314ab6e3d062b295b815`). Publication and the eventual PR base must account for these dependencies; this planning invocation does not merge or publish anything.

## Original Request

is good but i want little bit slower

## Settings

- Testing: yes — retain the user's detailed-plan and regression-test preferences.
- Logging: minimal — existing bounded WARN/ERROR for unexpected driver failures; no normal-input, per-frame, velocity or saved-data logs.
- Docs: yes — mandatory documentation checkpoint through `$aif-docs` during implementation.
- Scope: a small further adjustment to the shared hours/minutes/seconds selectors in Timer and the Planning action-duration panel.
- Browser tuning assumption: extend the existing owned glide by exactly 7/6 (about 16.7%), retaining the current easing and target. This is an engineering interpretation of “little bit,” not a user-specified percentage. Input still takes effect immediately.
- Native tuning candidates: Android `0.9955`, iOS `0.9991`, using the existing public `ScrollView` prop. These values move each rate 10% closer to 1. Native travel remains gesture/platform dependent; they do not guarantee a browser-equivalent percentage, fixed endpoint or lower initial fling speed.
- Preserve presets, finite bounds, manual busy/selection ownership, reduced motion, lifecycle cancellation and Planning's temporary edit → Apply → Save boundaries. No new settings, dependencies, persistence/schema changes, drivers or native modules.
- Physical Android/iOS gesture and accessibility acceptance remains pending under the user's existing device-test deferral. Planning does not resume device tests, build/install an APK, restart previews, commit, push or open a PR.

## Requirements Reconciliation

Authority: Original Request refines the completed slower-wheel feature. `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` retain mobile performance, ownership, compatibility and verification requirements. The [completed slower-wheel plan](feature-slower-wheel-inertia.md) is historical evidence, not a prohibition on further tuning. No roadmap or research artifact applies.

| Supported combination / decision | Source and preserved contract | Verification |
|---|---|---|
| Timer/Planning; eligible cancelable browser wheel or trackpad; normal motion | `wheelDeceleration.ts`: same normalization, finite target, cubic curve and single visual writer. Slowing comes from longer travel time, without an input delay. | Both-direction fixed-time displacement and endpoint tests; real-frame profiles in both consumers. |
| Native Android/iOS drag or flick | `DurationWheel.tsx`: native momentum, snapping and accessibility actions retain ownership; only numeric deceleration changes. | Installed/versioned API audit, typecheck and platform exports. Physical precision/flick/endpoints/accessibility acceptance stays pending. |
| Browser touch, noncancelable/modifier events, or initially reduced motion | `DurationWheel.web.tsx`, shared motion policy: existing platform/default behavior and manual gates. | Existing touch/unsupported-event/reduced-motion regressions; no competing interpolation. |
| Unfinished glide followed by reverse input, explicit choice, preset or live Reduce motion | `useDurationWheel.ts`, `durationWheel.ts`, `wheelPresentation.ts`: prompt takeover, sole manual busy/selection owner, independent immediate preset acceptance. | Interrupt observed unfinished movement; check exact final row, usable controls and no stale update after the old deadline. |
| Backgrounding, route/panel departure, disablement, changed geometry or disposal | Existing generation fences, cancellation and finite recovery. | Retain lifecycle/geometry/failure checks; missing frames finish by the new 880 ms maximum deadline. Do not widen watchdogs or blanket waits. |
| Multiple moving columns; literal legacy save; either theme and all six languages | Shared picker and persistence rules: busy is the OR of manual columns; clocks/text/preferences survive; only accepted edits change data. Planning Cancel discards, Apply edits the draft, Save persists. | Existing multi-column and literal fixture → real edit → reload journeys, preset/backup journey and localized/theme cases. |

Meaning preservation: PASS — the existing feel receives a modest further slowdown. Immediate response, target selection, explicit choices and unrelated animations remain intact. Browser timings are measurable engineering targets; native feel remains a separate pending acceptance check.

## Implementation Evidence and API Context

- `src/hooks/wheelDeceleration.ts:61` currently uses `Math.min(720, 270 + rows * 36)`. Use `Math.min(840, 315 + rows * 42)` with the same current row-distance expression. Both policies cap at 12.5 rows; the new duration is exactly 7/6 at every distance. For the same distance, the curve's peak speed is 6/7 of the current speed.

| Travel / deadline | Current | Planned |
|---|---:|---:|
| One row | 306 ms | 357 ms |
| Six rows | 486 ms | 567 ms |
| Capped glide | 720 ms | 840 ms |
| Capped glide with missing frames, `duration + 40` | 760 ms | 880 ms |

- Preserve elapsed-time cubic ease-out, fractional accumulation, reverse-input rebasing, exact snap and callback generations. `durationWheel.ts` has a 1000 ms recovery interval without updates, renewed on every scroll write; the independent 880 ms maximum deadline already fits. A continuous input stream may retarget repeatedly; 840 ms bounds each latest request, not an entire stream.
- `src/components/DurationWheel.tsx:36` currently uses Android `0.995` / iOS `0.999`. Keep native snapping, drag/momentum callbacks and separate preset `scrollTo` presentation intact. No adapter/controller rewrite is expected.
- Manifest verified: Expo `~57.0.32`, React Native `0.86.3`. Matching [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt) and [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview#decelerationrate) were fetched during planning. Installed `processDecelerationRate.js` accepts numeric values; Android `ReactScrollView.java` maps rate to `1 - rate` friction, while iOS maps the numeric prop to native deceleration. Recheck matching documentation before changing native API usage during implementation.
- Existing Timer/Planning browser profiles require only a 300 ms progressing span. Historical completed-feature observations were about 429 ms. A proposed 460 ms minimum should distinguish the refinement while allowing real-frame sampling; prove this against the current source/export before retuning.
- Keep completed plans and their evidence unchanged. This request does not approve any unrelated old improvement proposal.

## Tasks

- [x] **Task 1: Retune browser glide with behavioral regressions.**
  - Files: `src/hooks/wheelDeceleration.ts`, `tests/wheelDeceleration.test.ts`.
  - First strengthen the existing tests on the unchanged implementation. At 44 px rows, a six-row request should travel approximately 63.86 px in the first 50 ms (assert a 60–70 px range, compared with the current approximately 73.39 px); it must remain unfinished at the former 486 ms endpoint and at 566 ms, then finish exactly once on the same row at 567 ms. Exercise both signs.
  - Update the short/capped cases to 357/840 ms. For missing frames, assert pending at 879 ms, one terminal finish at 880 ms, and rejection of an obsolete late frame. Adjust progressive sampling to reach 567 ms; preserve irregular-frame, fractional-input, reversal, endpoint, cancellation and failure coverage.
  - Confirm the new assertions fail for the old timing, then change only the duration policy to `Math.min(840, 315 + rows * 42)`. Keep the cubic curve, target math, scheduling ownership, generation guards, terminal deadline and manual watchdog unchanged.
  - Logging: preserve existing bounded WARN/ERROR failure codes; no new successful-input or per-frame logs.
  - Depends on: none. Evidence: browser, takeover and finite-recovery combinations above.

- [x] **Task 2: Apply the small native deceleration adjustment.**
  - File: `src/components/DurationWheel.tsx`.
  - Change the existing public numeric prop to Android `0.9955` / iOS `0.9991`. Keep finite ranges, `snapToInterval`, offsets, events, adjustable actions and preset presentation intact. Do not add JS physics, another writer, a dependency or a helper/test that merely mirrors the two literals.
  - Verify the installed native mapping and compatible public API. Retain the pending physical checklist: slow precision, matched flick slowing, both bounds, reversal, multi-column Start/Apply, enlarged text and accessibility. Bundle/type checks do not close this checklist.
  - Logging: no new logs for a numeric prop change; retain existing guarded failures.
  - Depends on: none. Evidence: native combination above; final source must include Task 1 for combined validation.

- [x] **Task 3: Verify the modest slowdown in both real picker consumers.**
  - Primary file: `tests/e2e/durationInertia.spec.ts`. Reuse `durationPicker.spec.ts`, `timerPresetMotion.spec.ts` and `navigationTransitions.spec.ts`; edit them only if a meaningful assertion depends on the previous profile.
  - Strengthen the existing Timer/Planning six-row real-frame profiles with a candidate progressing-span minimum of 460 ms. Demonstrate failure on the current source/export, then passing behavior on the refinement. Keep decreasing speed, exact row centering, busy/old accepted value during unfinished movement, unchanged parent offsets and unrelated stored-state assertions. Pair this sampling criterion with Task 1's exact clock/displacement tests; if sampling variance warrants adjustment, record measurements and retain a bound that distinguishes the old profile.
  - Retain observed-unfinished takeover by reverse input, keyboard/row choice, preset, reduced motion, background and route/panel departure. Preserve delta units, touch/held-touch, geometry, endpoints, all six alignment-failure cases, multiple-column gating and prompt preset Start. Existing 1100/1200 ms stale-observation windows exceed the new 880 ms deadline and need no blanket increase.
  - Reuse literal `tests/fixtures/app-v1-before-planning.json` through real Timer editing/reload, Planning Cancel/Apply/Save, and the existing preset/backup/import journey. Retain both themes and the existing six-language coverage; do not duplicate fixture journeys or alter persisted data.
  - Logging: assertion-local offsets/timestamps are acceptable; no product telemetry or saved-data dumps.
  - Depends on: Task 1; include Task 2 in the final validated source snapshot. Evidence: all browser-supported combinations above.

- [x] **Task 4: Update factual documentation and validate the final change.**
  - Files: `README.md`; `.ai-factory/ARCHITECTURE.md` for the current rate/range statements; `.ai-factory/DESCRIPTION.md` only if its behavior description becomes stale. Use `$aif-docs` for the mandatory documentation checkpoint. Update this plan's progress/evidence without rewriting prior completed plans.
  - Describe the slightly gentler coast and exact row selection, preserving the distinction between custom browser wheel input and native/platform touch. Replace stale current rates/ranges, including 315–840 ms browser glides and the separate deadline where documented. Keep pending physical acceptance explicit.
  - Run lint, typecheck, core tests, the four relevant browser files in one final run and fresh Android/iOS/web exports on the combined change. Discover actual case counts and record failures/retries/skips. Record source identity and the exact browser bundle/runner tested; source-equivalent rebuilds must not be called byte-identical. Keep ignored runners/exports isolated from the user's preview. Further unrelated tests require a new failure or integration concern.
  - Logging: warnings/errors-only product behavior; use existing ignored check logs and this plan for evidence, without adding a separate report or workflow refactor.
  - Depends on: Tasks 1–3. Evidence: documentation, cross-platform compilation and all relevant regression requirements.

## Verification Commands

Discovered using `ai-factory commands --json` on 2026-11-12, cwd `.`. Catalog `revision_sha256`: `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`; `package.json` SHA256: `b69e16c481b7f82de9491307d476a747764d1915782d291216a6a9d50c23ef9a`; `package-lock.json` SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh discovery if command sources change. Catalog status `declared` / `not_run` is not implementation verification.

| Command ID, cwd `.` | Planned invocation |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test` | `npm test` |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/navigationTransitions.spec.ts` |
| `package.json#/scripts/export` | `npm run export` |

Use Windows Node.js 24+, npm and Git for this checkout. Browser checks use Chrome with phone-sized emulation, not native device execution. Platform exports verify bundling, not a signed build or physical gesture behavior.

### Planning Baseline

On 2026-11-12, `npm run lint` and `npm run typecheck` both passed (exit 0) on unchanged application source at `3576016`. Logs: `.expo/fine-tune-wheel-plan-lint.log` and `.expo/fine-tune-wheel-plan-types.log`. Plan structure, exact Original Request, task dependencies, whitespace and catalog source hashes were checked. These checks validate the planning baseline, not the proposed slowdown; no runtime or test file was changed and all four tasks remain pending.

## Completion Criteria

- Browser travel is measurably slower by the modest planned amount, reaches the same exact row and retains immediate takeover; native rates use the existing driver with physical acceptance still pending.
- Presets, manual gates, reduced motion, lifecycle cleanup, current clocks, persisted values and explicit Planning save boundaries remain correct.
- Relevant checks pass on the final source and documentation describes actual platform behavior. All tasks above remain pending until implementation evidence exists.
- A single eventual commit is sufficient, for example `feat(duration): fine-tune wheel inertia`. Publication is a later request.

## Implementation Evidence

- Task 1: strengthened controller tests first failed 4/15 on the previous policy, then passed 15/15 after the duration-only retune. Lint and typecheck passed. Both signs, exact 567 ms settlement, 357/840 ms bounds and the independent 880 ms missing-frame deadline are covered. Logs: `.expo/fine-tune-wheel-{red-node,green-node,task1-lint,task1-types}.log`.

- Task 2: applied Android `0.9955` / iOS `0.9991` through the existing native prop after verifying the installed RN 0.86.3 mapping and matching docs. Lint/typecheck passed; platform exports are part of Task 4. Physical native precision/flick/endpoints/reversal/Start/Apply/font-scale/accessibility checks remain pending under the existing deferral.

- Task 3: both strengthened browser profiles failed the unchanged prior export (430.3 / 428.3 ms progressing spans, below 460 ms), then passed the fresh combined export (2/2). No timeout changes or weaker centering/busy/persistence assertions. Lint/typecheck passed; the four-file combined regression run passed in Task 4. Logs/results: `.expo/fine-tune-wheel-{red-browser,pilot,task3-lint,task3-types}.log`, `.expo/fine-tune-wheel-{before,pilot}.json`.

- Task 4: final-source `npm test` passed 292/292 (no failures, cancellations or skips); lint/typecheck passed. Fresh Android/iOS/web exports succeeded in `.expo/fine-tune-wheel-export`; the focused four-file browser run passed 143/143 in one invocation (4.8 minutes), with no failures, skips, cancellations, retries or flaky cases. Documentation checkpoint via `$aif-docs` updated existing README wording and current architecture rates/ranges, and advanced the latest implementation reference while preserving history. Meaning preservation: PASS; edited passages and relative file links checked. Existing README length/organization and AGENTS documentation mappings were retained because this small update adds no documents or structure.

### Final Validation, 2026-11-12

| Check | Final result |
|---|---|
| Controller regression before / after retuning | 4 failed / 11 passed before; 15/15 passed after |
| Stronger Timer/Planning real-frame profiles on previous export | Both failed the 460 ms progressing-span bound: 430.3 / 428.3 ms |
| Same profiles on fresh final export | Both passed; pilot 500.2 / 499.6 ms; final run 496.7 / 496.7 ms |
| `npm test` | 292/292 passed; no failures, skips or cancellations |
| `npm run lint`, `npm run typecheck` | Both passed, exit 0 |
| Four selected browser files | 143/143 passed in one invocation, 4.8 minutes; no skips/retries/flaky cases |
| `npm run export -- --output-dir .expo/fine-tune-wheel-export` | Android, iOS and web succeeded on the same combined application source |
| Documentation | Existing README and factual context updated through `$aif-docs`; meaning-preservation and relative file-link checks passed |

The exact browser command was the planned four-file `test:e2e` selection with `--config .expo/fine-tune-wheel.config.ts`, serving the isolated immutable export on port 8104. The user preview and prior exports were preserved. The new export was not rebuilt or modified after browser testing.

Source-bound evidence in ignored `.expo/fine-tune-wheel-inventory.json`:

- Source SHA256: `00a512a45e507aef5327ab8ab12856019a64fb171279e6ac947bc3578cddbd4c` over the 220 exact app/test/configuration/asset inputs listed in its `source.files`; documentation, plan, dependencies and generated outputs are outside that inventory.
- Export SHA256: `b17fe6f9af9fe8a455abea03fd18c29337e4cf6f3495e1f827a362b404ad3e7b` over all 76 files in `.expo/fine-tune-wheel-export`, including the three platform bundles.
- Runner SHA256: `b7dc327661e8220f81c9a210a30945a5545c39b8b37ff5cd89518c1ceb2c6cc1` over `.expo/fine-tune-wheel.config.ts` and `.expo/serve-fine-tune-wheel.cjs`; the shared Playwright configuration is in the source inventory.
- Digests use SHA256 of compact UTF-8 JSON file arrays, sorted by path with object keys sorted, recording each path and raw-byte SHA256. All inventoried bytes were rechecked after the final run. Catalog revision remains the one recorded above; manifest/lock hashes still match.
- Final logs: `.expo/fine-tune-wheel-{node,lint,types,browser,export}.log`; browser case accounting and profile attachments: `.expo/fine-tune-wheel-browser.json`. The manifest binds the result JSON hash and records stats/retry count. Earlier red/pilot evidence remains separate.

Validation scope: local Chrome with phone-sized emulation and platform bundling. The full unrelated browser suite was not repeated. No physical Android/iOS test, signed build, APK install, commit, push or PR was performed. Existing native gesture, enlarged-text, TalkBack/VoiceOver and background/lock acceptance remains deferred.
