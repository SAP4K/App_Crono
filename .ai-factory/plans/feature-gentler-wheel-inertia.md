# Implementation Plan: A Slightly Gentler Duration-Wheel Glide

Branch: `feature/gentler-wheel-inertia`
Created: 2026-11-12 (Europe/Bucharest)
Mode: full
Status: completed — all four tasks implemented and verified; physical native acceptance remains deferred.
Base: `af6073c075de91d935b0977e75f0e2d5ab540af4` from the fetched `origin/master`. The preceding [PR #24](https://github.com/SAP4K/App_Crono/pull/24) is merged into `master`; its application tree matches the previously checked-out `e65c313`. This feature starts from that merged version, without changing the local `master` branch. Configured integration base: `master`.

## Original Request

is good, but i want little slower

## Settings

- Testing: yes — retain the user's detailed-plan and regression-test preferences.
- Logging: minimal — existing bounded WARN/ERROR for unexpected motion-driver failures only; no routine input, per-frame, velocity or saved-data logs.
- Docs: yes — mandatory checkpoint through `$aif-docs`, updating existing documentation during implementation.
- Scope: another small adjustment to the shared hours/minutes/seconds selectors in Timer and Planning's action-duration panel. Keep immediate input response and exact snapping.
- Browser tuning assumption: extend the current owned glide by 15/14 (about 7.1%). This smaller increment interprets “little slower”; the user did not specify a percentage. Keep the current easing and accepted target.
- Native tuning candidates: Android `0.99575` / iOS `0.99915`, each 5.56% closer to 1 than the current coefficient. Native momentum remains platform-owned; these values do not establish a matching browser percentage, fixed final row or lower initial fling speed.
- Preserve preset acceptance/presentation, explicit choices, manual busy/selection ownership, finite bounds, reduced motion, lifecycle cancellation and Planning's temporary selection → Apply → Save boundaries. No new setting, dependency, persistence/schema field, animation owner or native module.
- Physical Android/iOS gesture, enlarged-text and accessibility acceptance remains deferred under the user's existing decision. This invocation creates the branch and plan only; it does not implement, run device tests, build/install an APK, restart the preview, commit, push or open a PR.

## Requirements Reconciliation

Authority: the Original Request refines the completed [wheel fine-tuning](feature-fine-tune-wheel-inertia.md). `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` retain mobile performance, ownership, compatibility and verification requirements. Earlier completed plans and their measurements remain historical evidence. No roadmap or research artifact applies.

| Supported combination / decision | Source and preserved behavior | Verification |
|---|---|---|
| Timer/Planning; eligible cancelable browser wheel/trackpad; normal motion | `wheelDeceleration.ts`: same normalized delta, bounded target, cubic curve and single visual writer; longer travel begins promptly. | Both-direction displacement and exact duration tests; real-frame Timer/Planning profiles and natural accepted-value/action-availability timing. |
| Native Android/iOS slow drag or flick | `DurationWheel.tsx`: existing native momentum/snap, events and adjustable actions; only numeric deceleration changes. | Installed/versioned API audit, typecheck and native exports. Physical precision, matched flicks, endpoints and accessibility remain pending. |
| Browser touch, noncancelable/modifier events, or initially reduced motion | Existing web adapter and shared motion policy retain platform/default handling and manual action guards. | Existing held-touch, flick, unsupported-event, explicit-choice and reduced-motion regressions. |
| Unfinished movement followed by reversal, keyboard/row/accessibility choice, preset or live Reduce motion | `durationWheel`, `useDurationWheel`, `wheelPresentation`: one manual busy/selection owner; explicit choices and accepted presets remain prompt. | Interrupt an observed unfinished approach, then check accepted value, exact centering and absence of an obsolete update after the old request lifetime. |
| Backgrounding, route/panel departure, geometry/disabled-state changes or disposal | Existing generation fences and finite cancellation/recovery. Keep the independent deadline and renewed 1000 ms inactivity watchdog. | Missing frames settle by 940 ms; retain stale-callback, geometry, lifecycle and all six real adapter-failure cases without widening recovery or blanket waits. |
| Multiple moving columns, literal legacy save, six languages and either theme | Busy remains the OR of manual columns; only accepted edits reach consumers. Clocks, history, preferences and user text survive; Planning Cancel/Apply/Save stay distinct. | Existing multi-column and literal fixture → real edit → reload cases, Planning draft journeys, preset/backup/import journey and locale/theme layouts. |

Meaning preservation: PASS — the requested small further slowdown is represented by a modest duration increase, without an input delay or unrelated animation change. Numerical tuning is an explicit engineering assumption; native feel remains an unverified acceptance item.

## Implementation Evidence and API Context

- `src/hooks/wheelDeceleration.ts:61` currently uses `Math.min(840, 315 + rows * 42)`. Proposed `Math.min(900, 337.5 + rows * 45)` is exactly 15/14 as long for every current displacement, with the same 12.5-row cap crossover. Keep the existing row-distance expression. Peak speed over the same distance becomes 14/15 of the current curve's speed.

| Travel / fallback | Current | Planned |
|---|---:|---:|
| One row | 357 ms | 382.5 ms |
| Six rows | 567 ms | 607.5 ms |
| Capped glide | 840 ms | 900 ms |
| Capped glide with missing frames, `duration + 40` | 880 ms | 940 ms |

- At 44 px rows, six-row first-50-ms displacement changes from approximately 63.86 to 59.97 px; final travel remains exactly ±264 px. These are elapsed-time properties, not frame-count requirements.
- `durationWheel.ts` recovers after 1000 ms without updates, refreshed by each scroll write. The new independent deadline retains 60 ms of margin even without frames. Do not enlarge the watchdog or introduce an input/selection delay. A continuing input stream can retarget; the cap bounds each latest request, not a whole stream.
- `DurationWheel.tsx:36` currently uses Android `0.9955` / iOS `0.9991`. Numeric prop support and native mappings exist in installed RN 0.86.3: `processDecelerationRate.js`, Android `ReactScrollView.java` and iOS `RCTScrollViewComponentView.mm`. Keep platform snapping/momentum and the separate preset presentation driver.
- Manifest: Expo `~57.0.32`, RN `0.86.3`. Matching [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt) and [RN 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview#decelerationrate) were fetched during planning. Recheck matching documentation before implementation touches native API usage.
- Existing real-frame profiles in `tests/e2e/durationInertia.spec.ts` measured 496.7 ms progressing spans for both consumers, with first rendered acceptance around 575–585 ms in the final/pilot reports. Observing busy near 567 ms alone cannot distinguish the new curve. Preserve the current 460 ms progressing-span minimum and add a natural acceptance-time check of at least 600 ms, paired with exact controller timing and decreasing-speed/centering checks.
- Reuse the existing recorder's offsets, timestamps, accepted value and action busy state. Observe one actual settled sample with bounded existing polling if needed; do not assume the recorder sampled after React rendered merely because another assertion saw the DOM change.

## Tasks

### Phase 1: Small motion adjustment

- [x] **Task 1: Retune the browser duration policy with failing-first regressions.**
  - Files: `src/hooks/wheelDeceleration.ts`, `tests/wheelDeceleration.test.ts`.
  - First strengthen existing tests on the unchanged policy. For ±six rows at 44 px, assert first-50-ms displacement between 59 and 61 px, unfinished movement at the former 567 ms endpoint and at 607 ms, then one exact finish at 607.5 ms on the same row. Retain a later stale-observation check for no additional finish.
  - Change short/capped expectations to 382.5/900 ms, progressive sampling to a 607.5 ms endpoint, and missing-frame recovery to pending at 939 ms / one finish at 940 ms with rejection of the obsolete late frame. Existing irregular-frame, fractional-input, reversal, endpoint, immediate-choice, cancellation and bounded-warning checks remain relevant.
  - Demonstrate the stronger assertions fail before changing only the duration expression to `Math.min(900, 337.5 + rows * 45)`. Keep cubic easing, target calculation, delta normalization, generation guards, the independent `+40` deadline and manual recovery unchanged.
  - Logging: preserve bounded WARN/ERROR failure handling; add no successful-input or frame logs.
  - Depends on: none. Evidence: browser, takeover and finite-recovery combinations above.

- [x] **Task 2: Apply the smaller native deceleration adjustment.**
  - File: `src/components/DurationWheel.tsx`.
  - Set the existing public numeric prop to Android `0.99575` / iOS `0.99915`, retaining finite ranges, `snapToInterval`, offsets, drag/momentum callbacks, adjustable actions and separate preset presentation. Add no JS-driven fling, helper that merely wraps these literals, dependency or setting.
  - Confirm API support against the installed version and matching documentation; include both native platforms in Task 4's exports. Preserve the pending physical checklist: precision, matched flick slowdown, both endpoints, reversal, multi-column Start/Apply, font scaling and TalkBack/VoiceOver. Exports cannot establish those results.
  - Logging: no new logs for the prop change; preserve existing guarded failures.
  - Depends on: none. Evidence: native combination above.

### Phase 2: Consumer verification and documentation

- [x] **Task 3: Distinguish the extra slowdown in both real picker consumers.**
  - Primary file: `tests/e2e/durationInertia.spec.ts`; reuse `durationPicker.spec.ts`, `timerPresetMotion.spec.ts` and `navigationTransitions.spec.ts` without edits unless an existing meaningful assertion truly depends on the previous duration.
  - Strengthen each existing Timer/Planning six-row real-wheel profile using its current recorder. After observing a settled sample, require the first sample with value 26 and action no longer busy to occur at least 600 ms after the wheel input. Establish that sample with existing bounded assertion polling if necessary. Keep the ≥460 ms progressing span, decreasing speed, exact centering, busy/old accepted value while unfinished, unchanged parent offsets and unrelated saved-state assertions.
  - Prove the added assertion fails on the current source/export before checking the candidate on a fresh export. The new threshold measures the driver's natural 607.5 ms lifetime; never delay input, accepted state or control availability to satisfy it. Task 1 remains the precise timing oracle; browser sampling does not establish an exact millisecond endpoint.
  - Retain observed-unfinished takeover, explicit choices, presets, reduced motion, background/route/panel cleanup, all six alignment failures, delta units, touch holds/flicks, geometry/bounds and multi-column gating. Existing 1100/1200 ms stale windows exceed the new 940 ms deadline and need no blanket increase.
  - Reuse literal `tests/fixtures/app-v1-before-planning.json` through real editing/reload and the existing reviewed backup/import journey. Retain Planning Cancel/Apply/Save and the six-language/two-theme layout cases; do not add duplicate fixtures or change storage.
  - Logging: assertion-local timestamps/offsets are acceptable; no product frame telemetry or saved-data dumps.
  - Depends on: Task 1; include Task 2 in the final validated application snapshot. Evidence: all supported browser combinations above.

- [x] **Task 4: Update existing documentation and validate the combined change.**
  - Files: `README.md`, `.ai-factory/ARCHITECTURE.md`; `.ai-factory/DESCRIPTION.md` only for factual current-behavior/latest-plan references. Use `$aif-docs` for the mandatory documentation checkpoint. Update this plan's progress and source-bound evidence while preserving previous completed plans and historical results.
  - Describe the slightly longer coast, exact row selection and prompt takeover, retaining the native/browser-touch distinction and pending physical acceptance. Replace stale current rates and range statements with 337.5–900 ms and the separate 940 ms maximum deadline where documented; keep the user-facing README concise.
  - Run lint, typecheck, core tests, the four existing relevant browser files in one combined final run and fresh Android/iOS/web exports. Record actual counts, failures/retries/skips, command metadata and the exact source/export/runner tested. Recheck inventoried files afterward; distinguish source-equivalent rebuilds from byte-identical bundles. Isolate ignored test outputs from the user's running preview.
  - Broaden or repeat tests only for a new failure, source change or unresolved integration concern. No new report files, workflow refactor, signed builds or device-test resumption.
  - Logging: retain warnings/errors-only product behavior; keep execution evidence in the existing ignored log area and this plan.
  - Depends on: Tasks 1–3. Evidence: all requirements, documentation and cross-platform compilation.

## Verification Commands

Discovered through `ai-factory commands --json` on 2026-11-12, cwd `.`. Catalog `revision_sha256`: `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`. Source `package.json` SHA256: `b69e16c481b7f82de9491307d476a747764d1915782d291216a6a9d50c23ef9a`; `package-lock.json` SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh discovery if command sources change. Catalog `declared` / `not_run` entries are not implementation results.

| Command ID, cwd `.` | Planned invocation |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test` | `npm test` |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/durationInertia.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/timerPresetMotion.spec.ts tests/e2e/navigationTransitions.spec.ts` |
| `package.json#/scripts/export` | `npm run export` |

Use Windows Node.js 24+, npm and Git for this checkout. Local Chrome's phone-sized emulation is browser evidence; platform exports establish bundling, not signed-build or physical gesture acceptance.

## Completion Criteria

- Both browser consumers show the planned modest increase in glide time, lower early displacement and the same exact accepted row, with prompt takeover and natural manual-action gating.
- Native rates are adjusted through the existing driver, with physical acceptance still explicitly pending. Presets, explicit choices, reduced motion, lifecycle cleanup, independent clocks and stored-data/save contracts remain correct.
- All relevant checks pass on the final combined source and documentation matches measured behavior. One eventual commit is sufficient, for example `feat(duration): make wheel glide slightly gentler`; publication is a separate request.
- All four implementation tasks are complete; source-bound evidence follows. Physical native acceptance remains deferred.

## Planning Baseline

On 2026-11-12, lint and typecheck passed (exit 0) on unchanged application source. The former feature tree and fetched `origin/master` are identical; creating this branch changed no application files. Logs: `.expo/gentler-wheel-plan-lint.log` and `.expo/gentler-wheel-plan-types.log`. These checks and the preceding feature's test results do not validate the proposed tuning. Only this new plan is written during planning.

## Implementation Evidence

- Task 1: strengthened controller regressions failed 4/15 before the policy change, then passed 15/15 afterward. Exact 607.5 ms settlement, lower 50 ms displacement, 382.5/900 ms bounds and the 940 ms missing-frame deadline are covered. Lint/typecheck passed. Logs: `.expo/gentler-wheel-{red-node,green-node,task1-lint,task1-types}.log`.

- Task 2: applied Android `0.99575` / iOS `0.99915` using the existing public prop after checking RN 0.86.3 numeric/native mappings and matching docs. Lint/typecheck passed. Native exports follow with final combined validation; physical gesture/font-scale/accessibility acceptance stays deferred.

- Task 3: both added acceptance-time assertions failed on the prior immutable export (577.6 / 577.4 ms, below 600 ms), then passed the fresh combined export (2/2). Existing progressive-speed/centering/busy/persistence checks stayed intact; the recorder explicitly observes a settled sample. Lint/typecheck passed. The four-file combined run passed in Task 4. Evidence: `.expo/gentler-wheel-{red-browser,pilot,task3-lint,task3-types}.log`, `.expo/gentler-wheel-{before,pilot}.json`.

- Task 4: `npm test` passed 292/292 (no failures, skips or cancellations), lint/typecheck passed, and fresh Android/iOS/web exports succeeded. The four-file browser run passed 143/143 in one invocation (4.8 minutes), without failures, skips, retries or flaky cases. Current architecture rates/ranges and the latest implementation reference were updated; the README verification entry records actual final results.

### Final Validation, 2026-11-12

| Check | Result |
|---|---|
| Controller regressions before / after the timing change | 4 failed / 11 passed before; 15/15 passed after |
| Stronger Timer/Planning acceptance checks on the prior export | Both failed the 600 ms minimum: 577.6 / 577.4 ms |
| Same checks on the fresh combined export | Both passed; pilot 618.1 / 617.2 ms; final 618.3 / 617.3 ms |
| Final progressing spans | 535.5 / 535.4 ms; existing decreasing-speed and exact-centering assertions passed |
| `npm test` | 292/292 passed; no failures, skips or cancellations |
| `npm run lint`, `npm run typecheck` | Both passed, exit 0 |
| Four targeted browser files | 143/143 passed in one run, 4.8 minutes; no skips, retries or flaky cases |
| `npm run export -- --output-dir .expo/gentler-wheel-export` | Fresh Android, iOS and web exports succeeded |
| Documentation | Existing README and factual context updated through `$aif-docs`; meaning-preservation and relative file-link review passed |

The browser invocation used the planned four-file selection with `--config .expo/gentler-wheel.config.ts`, serving the isolated export on port 8106. The export was generated after both production changes and both test-file updates, then kept byte-identical through the final run. Documentation/progress-only edits followed; application, test, configuration and asset inputs remained unchanged. The user's preview and previous exports were preserved.

Evidence inventory: `.expo/gentler-wheel-inventory.json`.

- Source SHA256: `cf0d1739f49d56daa3cef5764eceb0b845f1a12745145d2b0efce53ffb6f1469`, covering the exact 220 app/test/configuration/asset inputs listed in `source.files`. Documentation, plans, installed dependencies and generated exports are outside that source inventory.
- Export SHA256: `cfa41ee52152127c0011c9a1cbeff39e745f13e63e8044cef384c93d38553971`, covering all 76 files in `.expo/gentler-wheel-export`, including Android/iOS/web bundles.
- Runner SHA256: `eec51b830f8f96b9028d08b1bc3d0ba9425531e5f8de8ef9182f70f7832c5ec2`, covering `.expo/gentler-wheel.config.ts` and `.expo/serve-gentler-wheel.cjs`; the shared Playwright config is in the source inventory.
- Algorithm: SHA256 of compact UTF-8 JSON file arrays, paths and object keys sorted; each entry records its path and raw-byte SHA256. All source/export/runner inputs were checked again after the final run. The manifest also binds the final browser-result JSON hash, case/retry counts and profile measurements.
- Catalog revision remains `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`; package/lock source hashes match the recorded command discovery.
- Raw logs: `.expo/gentler-wheel-{node,lint,types,browser,export}.log`. Browser results/profile attachments: `.expo/gentler-wheel-browser.json`. Red/pilot results are retained separately under the corresponding `before` / `pilot` names.

Meaning preservation: PASS — numerical changes follow the approved plan; prompt takeover, explicit save boundaries, reduced-motion/lifecycle conditions and native uncertainty are preserved. Documentation review is limited to the edited passages and links. Existing README organization and accurate AGENTS documentation mappings were retained; no new document, module or structural map was needed.

Validation scope remains local Chrome with phone-sized emulation and platform bundling. The full unrelated browser suite was not repeated. No physical native test, signed build, APK installation, commit, push or PR was performed. Native gesture feel, font scaling, TalkBack/VoiceOver and prior background/lock acceptance remain deferred under the user's existing decision.
