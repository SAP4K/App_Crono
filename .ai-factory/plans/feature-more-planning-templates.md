# Implementation Plan: More built-in Planning templates

Branch: `feature/more-planning-templates`
Created: 2026-11-10
Mode: full
Status: Complete (8/8 tasks; physical native gesture/accessibility acceptance remains pending)
Base: `master` / `origin/master` at `38f73469a5c768b8ec8e14954ca8204222ee02c3` (merged System-theme PR #16).

## Original Request

potit te rog sa fac mai multe sablonae

## Settings

- Testing: yes; retain the user's established preference for core/catalog tests and relevant real-browser journeys, alongside required lint/typecheck.
- Logging: minimal; warnings/errors only at actual failure boundaries. Template lookup, selection, rendering, draft changes and successful saves stay silent. Retain existing storage/error feedback; introduce no logger.
- Docs: yes; mandatory `$aif-docs` checkpoint for the template guide and factual context updates.
- Reuse the user's previously confirmed detailed/full planning preference. The current clarification selects more predefined Planning templates; it does not select a separate personal-template management feature.
- Artifacts: English, as configured. Keep the raw request above unchanged. Romanian remains the default interface language; all six supported catalogs receive the new built-ins.
- Planning owns this plan and branch setup only. Execution begins with `$aif-implement`; commit/push/PR remain separate user-authorized operations.

## Requirements Reconciliation

Authority: the current request and explicit clarification define feature scope. `AGENTS.md` — Project Overview, Project Workflow, Adding a Language and Expo requirements; `.ai-factory/ARCHITECTURE.md` — User Actions and Persistence, Display and Device Behavior; and `.ai-factory/rules/base.md` constrain implementation. Current source and literal fixtures establish compatibility. README/DESCRIPTION statements listing only Focus/Workout describe the existing implementation and should be updated through the documentation task.

Confirmed clarification: “Mai multe șabloane predefinite: Pomodoro, studiu, meditație, rutină de dimineață și altele (Recomandat)”.

- **R1 — Additive library:** retain `focus` and `workout` with their current IDs, names and durations. Add six built-ins in the ordered catalog below, bringing the chooser to eight. The exact six IDs, sequences and durations are proposed implementation defaults, rather than values prescribed by the user. Users can edit every generated draft before Save.
- **R2 — Localized contract:** provide complete schedule/action names in `ro/en/ru/es/fr/de`; enforce the registry's IDs and per-template step counts through the typed catalog contract and runtime tests. Core metadata contains durations and IDs, while i18n owns presentation text.
- **R3 — Draft and save behavior:** opening a built-in generates fresh schedule/action identities and a detached ordinary `Schedule`, then opens the existing editor. Browse/open/unchanged-close do not persist or start anything. Edited drafts retain existing discard confirmation; only accepted Save persists through the existing shared functional update.
- **R4 — Capacity and date behavior:** built-in library size does not consume the 20 saved-schedule slots. Preserve the current live-capacity check, 1–50 actions, trimmed names up to 80 characters, and whole-second action durations from 1 second through 23:59:59. The All filter produces no calendar rule; selecting a civil date supplies the existing one-time rule. The user may change that rule in the editor.
- **R5 — Continuity and compatibility:** saved copies retain their stored user text/order/durations independently of later language changes. Keep AppData and portable backup version 1, `@crono/app-v1`, additive fresh-ID imports, live run snapshots, independent clocks, sound ownership and manual Start unchanged. Adding static templates requires no saved template ID, migration, native module or dependency.
- **R6 — Mobile chooser:** preserve the single whole-window Planning `FlatList`; expanded choices remain ordinary content in its header. Show each localized name, action count, total duration and a short sequence preview. Preserve semantic palette colors, feedback, keyboard disclosure and at least 44px targets; allow localized names and summaries to wrap on compact screens.

| Supported combination | Validation / persisted state | Transition, effects and invariant | Verification |
|---|---|---|---|
| Each of 8 built-ins × each of 6 languages | Exact name/action count, valid bounded text/IDs/durations; no saved change on construction | Independent valid draft with catalog text and exact ordered durations | Registry expectation table plus nested catalog/draft tests |
| All dates × chosen civil date, with capacity available | Ordinary draft; calendar absent under All, `{ kind: 'once', date }` for chosen day | Open editor; no execution or persisted date-filter state | Browser creation under both filters and Save/reload |
| Open → unchanged close; open → edit → discard/cancel; edit → Save | No saved change until accepted Save; changed-draft confirmation retained | Discard/cancel preserves existing data; accepted Save adds one ordinary schedule | Real UI journeys, persisted snapshots and reload |
| 19 saved schedules → Save one; 20 saved schedules → attempt create | Existing bounded `saveSchedule`/live snapshot acceptance | Accepted final slot reaches 20; further creation is disabled/rejected without eviction | Capacity browser case and existing pure capacity checks |
| Existing running/paused schedule and independent clocks × open/save another built-in | Existing run and clock identities/deadlines retained | Editing/saving another template never replaces or starts a run; explicit Start retains confirmation | Frozen-time continuity case and existing runner tests |
| Saved built-in copy × later language selection / reload / optional backup import | Stored text/order/durations retained; imports create independent IDs | Normal restoration/import with existing preferences and live-run protection | Literal legacy journey, portable roundtrip and browser file transfer |
| Expanded chooser × 6 languages × Light/Dark × 320/390px | Ephemeral disclosure only; no storage/audio effects | Later choices and saved content remain reachable through the main scroll surface; fixed shell remains usable | Focused layout matrix and genuine wheel/touch scroll cases |

Representative real artifact: keep `tests/fixtures/app-v1-before-planning.json` unchanged. Hydrate it, open and close a new built-in without saving, reopen/edit/save it, reload and perform a real backup download/import. Assert the fixture's original stopwatch, timer, history and false flags survive, with legitimate missing-field defaults accounted for, and the added/imported schedules retain exact text/order/durations and independent identities.

Meaning preservation: PASS — the broad request and confirmed predefined-template scope are retained. The six-template expansion and exact durations below are explicitly plan decisions. Existing ownership, bounds, date behavior and manual Start remain applicable.

## Built-in Catalog

Order is stable and matches this table. Durations are editable starting values, not claims of health or productivity outcomes. Existing Focus/Workout text and values remain intact. New English names below define the copy intent; localize them naturally in each catalog.

| ID | Name / Romanian intent | Ordered actions and minutes | Actions | Total |
|---|---|---|---:|---:|
| `focus` | Focus / Concentrare (existing) | Work 25 → Break 5 | 2 | 30 min |
| `workout` | Workout / Antrenament (existing) | Warm-up 5 → Exercise 20 → Cool-down 5 | 3 | 30 min |
| `pomodoro` | Pomodoro | Focus 1: 25 → Short break 5 → Focus 2: 25 → Short break 5 → Focus 3: 25 → Short break 5 → Focus 4: 25 → Long break 15 | 8 | 130 min |
| `study` | Study / Studiu | Study 1: 45 → Break 10 → Study 2: 45 → Review 10 | 4 | 110 min |
| `meditation` | Meditation / Meditație | Settle in 1 → Meditation 8 → Finish 1 | 3 | 10 min |
| `morning` | Morning routine / Rutină de dimineață | Wake up 5 → Stretch 10 → Get ready 10 → Breakfast 15 | 4 | 40 min |
| `stretching` | Stretching / Întinderi | Warm-up 2 → Stretch 6 → Relax 2 | 3 | 10 min |
| `activeBreak` | Active break / Pauză activă | Walk 2 → Move 2 → Rest 1 | 3 | 5 min |

For Pomodoro, the final long break is the final action; its end is the single schedule-complete event. Existing `focus` remains the short two-action option. Keep the eight explicit duration tuples in the pure registry; add no persisted cycle/reference model.

## Technical Evidence and Approach

- `src/core/planningTools.ts::PLANNING_TEMPLATES` currently defines only `focus: [25m, 5m]` and `workout: [5m, 20m, 5m]`; `PlanningTemplateId` derives from its keys. `scheduleFromTemplate` checks positional ID/name counts, validates through `readSchedule` and returns an ordinary calendar-free detached schedule. Reuse it for every new built-in.
- `src/i18n/types.ts::Messages.planningTemplateNames` currently hardcodes two keys and tuple lengths. First derive an i18n-owned mapped catalog type from the existing registry using type-only core imports. Use a generic tuple-label helper (`T extends readonly number[]`, mapping `keyof T` to string) to preserve tuple arity; do not map raw array methods or `length` to string. Add key/count/text validation in `tests/i18n.test.ts`, whose existing parity check only covers top-level keys. Then expand the registry and all six catalogs atomically so route indexing remains type-safe at every checkpoint.
- `src/app/planning.tsx::openTemplate` already supplies current-language labels, allocates fresh IDs, checks `getSnapshot()` capacity and applies the selected date to an unsaved draft. `save` already delegates through `update` and `saveSchedule`. Retain those boundaries, preserving current calendar editing and discard behavior.
- Expanded choices already live in `FlatList.ListHeaderComponent`. Eight vertical choices are bounded ordinary header content; retain that structure. Reuse `m.stepCount` and pure `formatRemaining` for count/total, plus a first-three-actions preview like `ScheduleCard`. Preserve the full localized button name for existing accessibility selectors, optionally exposing count/total as its hint; the full sequence remains available in the editor.
- `ScheduleEditorSheet` initially renders four virtualized action rows. Tests of the eight-action Pomodoro should scroll to later rows or inspect the saved result; simultaneous presence of all eight inputs is not a valid requirement. Keep existing local duration Apply/Cancel and dirty-draft confirmation.
- `tests/e2e/usability.spec.ts` already exercises template → Save → Duplicate and keyboard expand/collapse. `tests/e2e/planningScroll.spec.ts` captures nested-list warnings and real wheel/touch behavior. Its existing language/theme capacity matrix fills all 20 slots and disables Templates, so expanded-template layout needs separate available-capacity coverage.
- Existing extended core/catalog/backup tests are already registered by `package.json#/scripts/test`. A new `tests/e2e/planningTemplates.spec.ts` is discovered automatically by Playwright; no test script or package change is needed for this planned file set.
- Before changing React Native/Expo UI API usage, follow the installed-SDK documentation preflight in `AGENTS.md` (current manifest: Expo 57, React Native 0.86.3). This scope reuses installed controls and needs no dependency or native configuration change.

## Commands and Verification Contract

Read-only discovery: `ai-factory commands --json`, CWD `.`, catalog revision `52324bc8a91c2e8775d91c90b203373ad59663b1b090a37fd304440c24ad958e`. Source `package.json`, SHA256 `3b1b385ddd341785da0d090e3ca64f970cf2112236e9b33002a01e3de1378155`; lock SHA256 `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. No command ambiguity. Refresh this evidence if manifests/scripts change; declared commands do not prove future feature checks passed.

| Exact command ID | CWD | Implementation verification |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` |
| `package.json#/scripts/test` | `.` | `npm test`; includes existing planningTools, i18n, backup, planning and notification projection tests |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e -- tests/e2e/planningTemplates.spec.ts tests/e2e/usability.spec.ts tests/e2e/backup.spec.ts tests/e2e/planningScroll.spec.ts tests/e2e/planningButtons.spec.ts` |
| `package.json#/scripts/export` | `.` | `npm run export` for Android/iOS/web bundles after UI/catalog changes |

Use the established Windows Node/npm runtime in this mounted checkout; direct TypeScript tests require Node 24+. Retain Playwright's one worker, 45-second scenario limits, no retries and installed Google Chrome. Preserve any existing user server on 8091; use an isolated owned server/configuration when needed and stop only owned processes. Exercise every affected scenario on the final applicable source; retain passing unchanged task-level coverage rather than repeating it without a reason. Record case selections, failures/reruns and actual outcomes in this plan; exports/browser checks do not prove native gestures or accessibility.

## Commit Plan

Suggested checkpoints for a later authorized commit operation:

- **Commit 1** (tasks 1–4): `feat(planning): expand the built-in template library`
- **Commit 2** (tasks 5–8): `test(planning): verify template compatibility and compact layouts`

Some test files span checkpoints. Group hunks carefully or use a combined commit if authorized; this planning operation does not commit.

## Tasks

### Phase 1: Typed, localized template library

- [x] Task 1: Derive the template catalog contract and validate every existing localized draft.
  Files: `src/i18n/types.ts`, `tests/i18n.test.ts`; type-only references to `src/core/planningTools.ts`.
  Deliverable: replace the hardcoded Focus/Workout catalog shape with an i18n-owned mapped type keyed by the registry, preserving each duration tuple's label count. Initially retain the two existing templates unchanged so the preparatory checkpoint compiles. Add nested key parity, exact action counts, valid bounded/nonempty names and successful draft construction for every registered template in all six languages. Tests should automatically cover new entries when Task 2 expands the registry. Keep core independent of i18n. Logging: none in types/catalog/core tests beyond test failure diagnostics. Dependencies: none. Source: R2/R4, `Messages.planningTemplateNames` and `tests/i18n.test.ts` parity gap.

- [x] Task 2: Add the six duration sequences and all six catalogs atomically.
  Files: `src/core/planningTools.ts`, `src/i18n/ro.ts`, `en.ts`, `ru.ts`, `es.ts`, `fr.ts`, `de.ts`, `tests/planningTools.test.ts`.
  Deliverable: implement the ordered eight-template catalog above, retaining old IDs/names/durations. Supply complete localized schedule/action labels in the same order. Use the existing factory and caller-provided IDs; preserve detached ordinary-schedule construction. Add an independent expected-duration/order/total table, valid bounds, separate-copy mutation/identity assertions and rejection cases for mismatched counts, invalid names and reused IDs. Validate all language/template combinations through Task 1 coverage. Registering a separate Node test file is unnecessary; if the file set changes, register it immediately and refresh command evidence. Logging: no runtime logs; bounded assertion diagnostics only. Depends on 1. Source: R1/R2/R4 and Built-in Catalog.

- [x] Task 3: Make the expanded chooser readable and usable within the main Planning scroll.
  Files: `src/app/planning.tsx`; reuse `src/core/timer.ts::formatRemaining`, existing message functions and semantic styles.
  Deliverable: render all eight choices in stable order inside the current header, each with a localized name, action count, total duration and short bounded sequence preview. Retain a single vertical choice per row, natural wrapping, 44px targets, pressed/haptic feedback and expanded-state semantics. Preserve accessible button names and whole-window scrolling. Reuse `openTemplate` and the existing editor/save path, including latest-capacity checks and chosen-date inheritance; keep creation disabled at capacity. Opening/closing a built-in never calls update, requests permission or starts a run. Logging: no new selection/render logs; existing failure handling stays scoped. Depends on 2. Source: R3/R4/R6 and current route/card patterns.

### Phase 2: Functional, compatibility and mobile coverage

- [x] Task 4: Exercise real creation, editing, discard, capacity and date inheritance.
  Files: new `tests/e2e/planningTemplates.spec.ts`, existing `tests/e2e/usability.spec.ts` and `tests/e2e/planningButtons.spec.ts`; `tests/e2e/helpers.ts` only for a narrowly reusable helper.
  Deliverable: cover each built-in's exact draft/save values through the real chooser; retain the existing Focus/Duplicate journey. Assert opening/unchanged closing leaves saved state untouched, changed-draft cancel/discard remains correct, editing a name/duration then Save persists one schedule, reopening the same built-in allocates independent IDs, and save/reload does not start execution. Verify All versus a chosen date, adding the twentieth schedule and disabled/rejected additions at capacity. Exercise the first and last actions of a long Pomodoro draft using editor scrolling and saved assertions, plus keyboard expand/collapse/activation. Logging: browser error capture and test diagnostics only. Depends on 3. Source: R1/R3/R4 and corresponding combination rows.

- [x] Task 5: Verify real legacy/backup compatibility and active-run continuity.
  Files: `tests/planningTools.test.ts`, `tests/backup.test.ts`, `tests/e2e/planningTemplates.spec.ts`, `tests/e2e/backup.spec.ts`; read unchanged `tests/fixtures/app-v1-before-planning.json`.
  Deliverable: execute the representative literal-fixture journey described above, including real file download/upload and independently imported IDs. Preserve original clocks/history/false flags, exact saved names/order/durations, schema/key, and current live runs through creation/import. Verify a saved copy retains its text after language selection/reload while a newly opened draft uses the new language. Add a frozen-time case with an existing running or paused schedule and active independent clocks while another built-in is edited/saved. In core coverage, run Pomodoro through `startSchedule`, notification projection and final reconciliation: cumulative deadlines, eight unique event IDs and exactly one final completion at the end of the long break. Keep production runner/audio/notification owners unchanged. Logging: assertion diagnostics only; use current page/audio error observers where relevant. Depends on 4. Source: R5, real artifact and multi-action catalog.

- [x] Task 6: Check expanded-selector layout, real scrolling and localized access.
  Files: `tests/e2e/planningTemplates.spec.ts`, `tests/e2e/planningScroll.spec.ts`; reuse fit/enlarged-text patterns from `tests/e2e/usabilityLayout.spec.ts`.
  Deliverable: with available saved capacity, cover all six languages in both effective palettes at 320/390px; expand the chooser, inspect count/total/preview wrapping and 44px target geometry, reach the final built-in, select it and close its editor. Reopen and scroll to saved schedules below the choices. Add representative real wheel and touch-drag cases that retain the fixed header/tab bar and show the same main scrolling surface moves; assert no horizontal overflow, nested-list warnings, storage mutation or spontaneous audio. Include representative enlarged text/reduced motion and inspect compact Russian/Romanian screenshots. Retain the existing 20-schedule matrix separately. Physical native font scaling, scroll gestures and TalkBack/VoiceOver remain pending unless independently exercised; browser evidence is not a native acceptance claim. Logging: existing warning/page-error observers and concise test diagnostics. Depends on 5. Source: R2/R6 and the disabled-selector gap in existing layout coverage.

### Phase 3: Documentation and completion checks

- [x] Task 7: Document the expanded library and preserve accurate project context.
  Files: `README.md`, `.ai-factory/DESCRIPTION.md`; `.ai-factory/ARCHITECTURE.md` only if its template/catalog ownership explanation needs a factual update.
  Deliverable: invoke `$aif-docs` for the required checkpoint. Describe the eight built-ins, editable default durations, chooser summaries, draft versus Save behavior, one-date inheritance and unchanged manual Start/whole-page scrolling. Keep saved-schedule limits distinct from bundled-template count. Update the old Focus/Workout-only inventory and active-plan pointer; preserve historical validation and known follow-up findings. Validate affected local documentation links. Logging: none. Depends on 6. Source: R1–R6 and current README/DESCRIPTION inventory.

- [x] Task 8: Complete the scoped quality gates and record truthful implementation evidence.
  Files: affected source/tests/docs and this plan's progress/evidence only.
  Deliverable: refresh command evidence if manifests changed, run required lint/typecheck and all registered core tests, complete relevant browser selections for every modified UI/test boundary and export the three platform bundles. Reuse applicable passing unchanged task-level evidence; broaden/rerun when changes or failures justify it. Verify unchanged literal fixture/schema/key/dependencies/native configuration, no draft-only writes or auto-start, exact catalog totals/localization, real legacy preservation and retained clocks/audio ownership. Mark tasks from actual results and record remaining physical-device checks here; create no separate report artifact. Stop only owned test processes. Logging: concise gate failures/outcomes and existing scoped warnings only. Depends on 7. Source: all requirements, project validation rules and Commands and Verification Contract.

## Acceptance Conditions

Planning offers eight localized built-ins with the stated exact action sequences and useful summaries. Existing Focus/Workout remain compatible. Each selection opens an independent editable unsaved draft; only accepted Save adds an ordinary schedule within existing bounds. Date inheritance, saved-text independence, whole-window scrolling, active clocks/run snapshots and file compatibility remain intact. Required checks pass with accurate records of any limitations, and documentation matches the implemented behavior.

## Planning Validation

- Requirements clarification received; detailed planning, tests/docs and minimal logging reuse the user's established preferences. No unresolved scope decision blocks this plan; exact presets are explicitly proposed defaults for review.
- Parallel read-only reconnaissance confirmed core/catalog and route/editor/scroll/test boundaries. No application implementation was performed during planning.
- Started from a clean `master`; `git pull --ff-only origin master` reported up to date. Created `feature/more-planning-templates`; checked that neither the same-stem full file nor an ultra entrypoint existed.
- Optional `.ai-factory/ROADMAP.md`, `.ai-factory/RESEARCH.md`, `.ai-factory/RULES.md` and project skill-context layers are absent. Existing architecture/base rules govern the plan; no research source or roadmap linkage is implied.
- Read-only command discovery completed without ambiguities. Baseline `npm run lint` and `npm run typecheck` both passed on 2026-11-10 using Windows npm. These are planning-baseline results; the new feature's core/browser/export checks remain planned and unexecuted.
- Meaning preservation: PASS. Runtime source, catalogs, fixtures, dependencies and configuration remain unchanged by this planning operation.

## Implementation Evidence

- Task 1: the i18n-owned mapped type now derives every template key and exact action-label tuple from the pure registry through type-only imports. All 12 catalog tests and typecheck passed before expanding the registry. Nested catalog checks cover valid draft construction and bounded text in each supported language.
- Task 2: added the six specified tuples and complete names/actions in all six catalogs atomically. Existing Focus/Workout labels, IDs and durations remain intact. All 17 focused planningTools/catalog checks and typecheck passed; the catalog matrix exercises all 48 language/template combinations. Independent expected-duration tests also cover valid bounds, invalid inputs and detached editable copies.
- Task 3: the chooser retains the main FlatList header and displays eight labelled choices with counts, total times and short previews. Existing live-capacity/date/editor/save boundaries remain intact; options also reflect disabled capacity. Lint/typecheck passed, and the unchanged Focus/Save/Duplicate browser journey passed in 12.4s.
- Task 4: all 10 new functional browser cases passed in 33.1s: every built-in through unchanged close, two independently identified saves and reload; Pomodoro first/last action edits plus discard/continue; chosen-date inheritance and the twentieth-slot limit. Selection/save leaves timing idle unless the existing explicit Start action is used.
- Task 5: focused planningTools/backup tests passed (15/15), including all eight portable records and Pomodoro's eight exact cumulative deadlines with one final completion. Four browser compatibility cases passed in 17.1s: unchanged literal legacy data through real file export/import, saved-language independence, and creating another draft beside running/paused planning with active independent clocks. User text, false flags, history and timing identities are retained.
- Task 6: all 26 selected browser cases passed in 45.6s: a 24-case six-language/two-palette/320–390px matrix with enlarged text and reduced motion, plus real wheel/touch gestures over the expanded choices. Final choices and saved cards remain reachable, with no horizontal overflow, nested-list warnings, unintended save/open or audio. Inspected compact Russian Dark and Romanian Light screenshots; Fontconfig confirmed every template character and preview mark exists in all five bundled Inter weights.
- Task 7: applied `$aif-docs` to existing README instructions and updated the factual DESCRIPTION/ARCHITECTURE context plus the AGENTS documentation entry. Meaning preservation: PASS. Checked 36 local links/anchors; source examples, all eight totals, Save/Start/date/capacity behavior and historical evidence remain accurate. Existing README restructuring was outside this feature's scope.
- Task 8: final lint/typecheck and all 245 registered Node tests passed. Android/iOS/web exports passed; logs are `D:/crono-android/more-templates-final-{lint,types,core,export}.log`. The remaining 64 selected browser regressions passed in one 1.8m run (`more-templates-regression.log`). Together with the prior 1 + 10 + 4 + 26 focused cases, all 105 distinct selected browser scenarios have passing results across runs. Exact file/title reconciliation against `D:/crono-android/more-templates-browser-manifest.json` confirms no omitted/duplicate cases: backup 15, planningButtons 8, planningScroll 29, planningTemplates 37, usability 16. Retained one worker, 45-second limits and no retries. Two initial shell/regex selection commands were corrected before scenario execution; no feature scenario failed.
- Final runtime/config SHA256: `44a66c6bf5d28207b64767b6fa41854b7a11a8c013ab847ea7a17f5ccf19ffbc` (sorted src TS/TSX paths plus package.json/lock/app.json, each path and content NUL-delimited). Selected browser-source SHA256: `b045f2c564bd0e5a0f873fd31b51e333b486eb7dd304d051d6a0b30f43f41047` (sorted five spec paths/content with the same delimiting). Command catalog/manifests remain unchanged from planning.
- Boundaries: no dependency, package/lock, app configuration, native module, storage schema/key, timing/audio owner, core runner or literal-fixture change. No separate persistent preset store or automatic scheduling was introduced. Owned test servers on 8094 exited; confirmed the port has no listener and preserved the user's 8091 server. No commit, push, PR or device installation was performed.
- Remaining physical acceptance: native Android/iOS scrolling, font scaling and TalkBack/VoiceOver are pending. Node/browser/export evidence does not establish these device outcomes or replace the existing deferred background-acoustic checks. Optional roadmap/research/top-level RULES artifacts remain absent; base rules and architecture are satisfied.
