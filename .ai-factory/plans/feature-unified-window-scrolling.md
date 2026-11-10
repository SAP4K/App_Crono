# Implementation Plan: Unified window scrolling

Branch: `feature/unified-window-scrolling`
Created: 2026-11-10
Mode: full
Status: Awaiting clarification (4/8 tasks complete; no task active; Tasks 6–8 have partial accepted evidence below; Task 4 requires header-policy answer Q1)
Base: `master` / `origin/master` at `139cebb` (PR #17 merged; includes the template library and editor spacing).

## Original Request

fa te rog ca cand dau scroll in jos sa se duca toata fereastra un doar etaple si aplica te rog acest patern pentru toate ferestrele care au scroll

## Settings

- Reuse the user's full planning, tests, documentation and minimal logging preferences. The subsequent `$aif-implement` authorizes implementation of the requested scrolling work.
- Testing: meaningful browser regression coverage, real wheel/touch input, existing restoration/inertia/compatibility journeys, and required lint/typecheck. Register new browser specs through existing Playwright discovery; no package change is needed.
- Logging: warnings/errors only at existing failure boundaries; no render, scroll-tick, input or successful-update logging and no new logger.
- Docs: yes; mandatory `$aif-docs` checkpoint for the actual accepted interaction contract and factual context updates.
- Artifacts: English. Preserve the raw request above, Romanian default and all six catalogs. No dependency, native configuration, storage schema/key or timing/audio-policy change is planned.
- Header-independent evidence, geometry checks and factual body documentation may proceed while Q1 remains pending; only the heading-dependent portions of Tasks 4/6/7 and final closure require the answer. Keep completed evidence rather than repeating completed work. Do not infer an answer from elapsed time, the recommended option, approval of a plan refinement or a subsequent skill invocation. Do not mark the complete plan ready/done without resolving Q1.

## Required Clarification

**Q1 — Modal title/Close:** the user has been asked whether (1) the entire body including Save scrolls while title/Close remain fixed, or (2) title/Close also join the same scroller. No answer has been supplied yet. Task 4 and the final shared-window acceptance depend on this choice. Until then, retain current header placement and implement only behavior required by both choices.

## Requirements Reconciliation

Authority: the request/screenshot defines whole-window scrolling. `AGENTS.md` — Expo workflow, Project Workflow and existing limits; `.ai-factory/rules/base.md` — Module Boundaries, Mobile UI, Validation; `.ai-factory/ARCHITECTURE.md` — Display and Device Behavior and User Actions and Persistence constrain the implementation. The prior row-only editor description is the behavior being changed, not a requirement to retain a fixed metadata block.

- **R1 — One content owner:** each app-owned page/modal/panel has one vertical content owner. In the main editor, name, Scheduling, Repeat, count/total, action rows, Add, errors and Save scroll together. Retain the existing 12-unit spacing.
- **R2 — Bounded input exceptions:** duration wheels remain independent finite input scrollers, with their existing inertia, endpoint isolation, motion guards and Apply/Cancel semantics. Native OS file pickers/settings are outside application-window layout ownership. The application branding/navigation shell remains fixed.
- **R3 — Continuity:** retain controlled drafts, stable action IDs, explicit Save/discard, latest-state acceptance, protected active schedules, backup/legacy records, clocks and one audio owner. Scrolling itself never persists, starts work, plays audio, requests permissions or activates a dragged-over button.
- **R4 — Restoration and accessibility:** keep the covered editor mounted with its current layout and native/web interaction/accessibility isolation. Capture the whole-editor offset for duration, calendar, repeat and discard entry; restore the correct source control and position on return. Preserve keyboard avoidance, safe areas, Back/Escape/backdrop, notices and accessible Stop. Exact offset assertions apply when geometry is unchanged; after resize/font changes, keep the source visible rather than insisting on a stale coordinate.
- **R5 — Shared policy:** audit Settings home/all seven groups and backup preview, history detail, date selection, all confirmations, editor duration/calendar/repeat/discard and all main tabs. Already compliant surfaces need verification rather than a new wrapper. Apply Q1 consistently through Sheet; completion notices/Stop must remain accessible while other app controls are isolated.
- **R6 — Mobile performance:** retain the editor's virtualized 1–50-action FlatList and current bounds, stable header/footer element types and controlled inputs. Do not nest a vertical FlatList in a plain vertical ScrollView. Preserve existing lap rendering and verify maximum 1,000-lap reachability without adding an unrelated performance refactor.

| Supported combination | Transition and invariant | Verification |
|---|---|---|
| New Focus draft expanded through real Repeat 4× then 2× (16 actions), existing 50-action draft | Metadata, rows and footer share a scroll surface; no changes until Save | Real wheel over metadata/rows and paced touch over controls; reach final action/Add/Save and return to top |
| Duration/calendar/repeat/discard × Apply/Cancel/Close/Back | Preserve the mounted draft, restore opening offset/source; only accepted local Apply changes a draft | Existing durationPicker 50-action case plus targeted return paths and stable IDs |
| Distant action in a 50-action draft × resize/enlargement while its panel is open × Apply/Cancel | Return to the same action ID, keep the source visible after changed geometry, preserve draft and stored clocks; unchanged geometry retains exact offset checks | Pending Task 6 geometry cases; existing one-action wheel resizing alone does not cover this interaction |
| Q1=2 only: dirty discard requested via Escape/backdrop while the heading is offscreen | Continue editing restores the opening visible context without an offscreen Close focus forcing a jump; explicit header-Close entry retains its own source semantics | Conditional Task 4 implementation and Task 6 regression, not a claim of a defect in the current fixed-heading code |
| Editor/body scroll × independent duration-wheel gesture and finite endpoints | Wheel changes do not move parent; body scrolling does not change a duration | Existing real wheel/touch/inertia cases and parent-offset observations |
| Shared windows × overflowing Settings, backup review, history details and confirmations | Entire active content scrolls; backdrop/background remains isolated; Q1 header contract is consistent | Genuine gesture cases, original transfer/delete/reset actions and max-lap detail reachability |
| Six languages × Light/Dark; representative 320/390px and enlarged text | Wrapping, targets, action reachability and safe layout; no saved selection changes due to scrolling | Focused matrix plus existing localization/usability-layout scenarios |
| Existing running/paused clocks × scroll or panel switch | Deadlines, IDs, saved records and playback ownership remain intact; notices/Stop reachable | Frozen-time continuity and in-sheet completion scenarios |

Representative real artifact: reuse the unchanged literal `tests/fixtures/app-v1-before-planning.json` through a real draft/open/scroll/discard/Save/reload path. Account for legitimate missing-field defaults; retain original clocks/history/false flags and exact saved user text/actions.

Meaning preservation: PASS for the common scrolling behavior and retained constraints. Q1 remains explicitly unresolved rather than being silently decided.

## Surface Inventory and Design

- Already implemented: `ScheduleEditorSheet.tsx`, the sole `Sheet scrollable={false}` caller, uses its FlatList header for metadata and footer for Add/error/Save. Retain that one virtualized list, stable JSX element/component types, Sheet shell and mounted EditorBody; do not rebuild the completed body composition.
- Already implemented: duration/discard now join calendar/repeat in using bounded body ScrollViews. Numeric duration wheels stay intentional input-scroller exceptions. Retain the current 26-unit horizontal composition without adding a second outer list or doubled padding.
- Already implemented: `listOffset`, `panelReturn` and `restoring` refer to the complete editor, capture each panel entry and retry a duration target through the stable-ID button map. Keep that behavior. Remaining acceptance must exercise a distant virtualized action after geometry changes and, conditionally on Q1=2, discard return when Close is outside the visible window.
- `Sheet.tsx` already supplies one body ScrollView to Settings, date selection, session detail and ConfirmSheet. If Q1=1, retain its fixed chrome and verify consistency. If Q1=2, introduce one reusable header/body composition contract so default ScrollView and externally supplied FlatList place the same heading in their own scroll surface. Active editor panels must receive that header too; do not hide the only heading inside covered EditorBody. Keep Modal/backdrop/isolation/safe areas and accessible timing notices outside hidden content.
- `index.tsx`, `timer.tsx`, `history.tsx` and main `planning.tsx` already scroll all route content under the fixed application shell. Retain their owners; verify them and shared-modal callers. `LapList` is bounded ordinary content, not an independent scroller.
- Already adapted: the fifty-action durationPicker scenario exercises Calendar at its scrolling header before navigating to action 50. Retain its strict unchanged-geometry return/ID checks and independent accepted Save/reload journey. Do not reintroduce the old fixed-metadata assumption.

## Tasks

- [x] Task 1: Capture the whole-editor regression before changing production code.
  Files: new `tests/e2e/editorScrolling.spec.ts`, reuse `tests/e2e/helpers.ts`, current typed catalogs and literal fixture.
  Deliverable: register a real Focus → Repeat 4× → Repeat 2× draft journey; demonstrate the current fixed metadata/Save versus row-only scrolling with a small failing behavioral check. Observe page/nested-list errors, storage and audio. Record the expected pre-change failure, not a passing claim. Logging: browser/test diagnostics only. Dependencies: none; Q1-independent. Sources: R1/R3 and screenshot.

- [x] Task 2: Move the complete editor body into its existing FlatList and preserve return semantics.
  Files: `src/components/ScheduleEditorSheet.tsx`; `Sheet.tsx` for an optional Close-button ref used on discard return, without changing heading placement; `EditorBody.tsx` / `.web.tsx` only if a demonstrated layout requirement requires it.
  Deliverable: list header owns metadata, footer owns Add/error/Save; retain virtualization, controlled names, stable IDs and 12-unit button separation. Capture/restore whole-body offsets and source focus for duration/calendar/repeat/discard; retry pending virtualized focus when its ref registers. Keep current title placement until Q1 is resolved. Rerun Task 1's exact check. Logging: no new routine logs. Depends on 1; Q1-independent. Sources: R1/R3/R4/R6.

- [x] Task 3: Make every editor subpanel's complete body reachable through one scroll owner.
  Files: `src/components/ScheduleEditorSheet.tsx`; existing `ScheduleCalendarPanel.tsx`, `ScheduleRepeatPanel.tsx`, `DurationPicker.tsx` as read-only consumers unless a concrete composition issue requires edits.
  Deliverable: bounded ScrollView composition for overflowing duration/discard content and consistent calendar/repeat bodies; retain Apply/Cancel, wheel-busy/zero guards, source restoration, keyboard/safe areas, independent wheel gestures and accessible notices/Stop. No nested same-axis virtualized list. Logging: existing errors only. Depends on 2; Q1-independent content work only. Sources: R2/R4/R5.

- [ ] Task 4: Apply the confirmed title/Close policy to shared Sheet and all active panel compositions.
  Files: `src/components/Sheet.tsx`, `ScheduleEditorSheet.tsx`; shared callers only if required by the selected composition contract.
  Deliverable: first record the user's explicit Q1 answer. Option 1 retains fixed title/Close and uses the single body scroller; option 2 shares scrollable heading composition between default ScrollView, editor FlatList header and active subpanels. For option 2, distinguish explicit header-Close entry from Escape/backdrop/native Back while the heading is offscreen. Continue editing must preserve the unchanged-geometry opening offset and restore an appropriate previously focused/visible source, rather than blindly focusing an offscreen Close control and scrolling to the top. Implement only after the selected branch is known and the corresponding regression reproduces any failure; preserve native/web accessibility isolation and stable metadata inputs. Keep accessible timing notices and modal/background ownership intact. Audit every inventory surface; do not add wrappers to already compliant pages. Logging: none for layout; retain scoped failures. Depends on 3 and Q1 (currently blocked). Sources: R1/R2/R4/R5.

- [x] Task 5: Complete editor regression coverage and adapt restoration tests to the new scroll owner.
  Files: `tests/e2e/editorScrolling.spec.ts`, `tests/e2e/durationPicker.spec.ts`; existing `planningTemplates.spec.ts`, `planningButtons.spec.ts`, `planning.spec.ts`, `durationInertia.spec.ts` as relevant regressions.
  Deliverable: real wheel/touch movement over metadata, rows and buttons; 1/16/50-action reachability; no accidental Save/Add/reorder/delete; virtualized return after duration Apply/Cancel and explicit calendar/repeat/discard navigation; typing focus and stable IDs; a literal-fixture Save/reload journey. Preserve wheel endpoint/momentum isolation and existing sound/notice invariants. Register tests immediately through automatic discovery. Logging: current observers/assertion diagnostics only. Depends on 2,3; Q1-independent assertions may run before Task 4. Sources: R1–R4/R6.

- [ ] Task 6: Verify every shared-window family and existing whole-page routes under the chosen policy.
  Files: existing `tests/e2e/sheetScrolling.spec.ts`, `editorScrolling.spec.ts`, `durationPicker.spec.ts`; relevant `usabilityLayout.spec.ts`, `usability.spec.ts`, `backup.spec.ts`, `crono.spec.ts`, `planningScroll.spec.ts`, `localization.spec.ts`, `theme.spec.ts`.
  Existing body evidence: retain the 17 registered shared-window cases and 64 related existing passes recorded in the November 10 fix patch. They already exercise all seven Settings groups in six languages/both themes, enlarged compact layouts, a 1,000-lap detail, actual backup review/import/reload, date selection, calendar/repeat and an overflowing reset confirmation. Background isolation, Back/Escape/Close, draft/data preservation and independent activities remain required; completion Stop also retains the existing duration-panel coverage. These are passing selections, not completed final heading acceptance.
  Remaining deliverable: assert the explicitly selected Q1 heading positions on every Sheet family and editor subpanel, including the conditional offscreen-heading discard case in Task 4. Add a 50-action duration-panel journey parameterized by Light/Dark and Apply/Cancel: reach the distant source through real scrolling, open it, resize width and height and enlarge the covered editor once, then return to the same stable action ID. For changed geometry assert focused/visible source and reachable actions instead of a stale pixel offset; keep the existing exact unchanged-geometry assertions. Observe no premature Save, clock/preference changes or automatic audio; only accepted Apply changes the local draft. If a new behavioral check fails, reproduce before the smallest production fix and rerun it unchanged.
  Helper contract: simulate the intended text enlargement once against a known baseline. Current enlarged helpers multiply computed font sizes, so repeated calls on retained nodes can compound. Per-panel reachability checks must not accidentally rescale the hidden editor; the explicit geometry cases intentionally resize/enlarge it once. Retain actual wheel/touch input, one-frame movement comparisons, finite wheel isolation, and bounded endpoint polling that can send another real gesture after remeasurement. Do not replace gesture proof with direct scrollTop assignment or fixed sleeps. Retain fixed application shell and one owner on already compliant routes. Physical native gestures, keyboard avoidance, OS font scaling and TalkBack/VoiceOver stay pending unless exercised.
  Logging: existing observers/assertion diagnostics only. Dependencies: Task 5 for independent body/geometry work; Task 4 and Q1 for final heading assertions. Sources: R2–R6.

- [ ] Task 7: Update the existing usage and architecture documentation through the docs checkpoint.
  Files: `README.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`; `AGENTS.md` only for a changed entry-point/map.
  Existing body evidence: the `$aif-docs` checkpoint has already updated README and the factual description/architecture passages for the shared draft owner, independent wheels, Save/footer reachability and unchanged-layout position restoration. The active plan pointer is present and 37 relative file links resolve. Retain these changes and historical/device evidence; do not recreate the checkpoint or mark the entire task complete. Remaining deliverable: after Q1 and its acceptance, make only the corresponding title/Close and changed-geometry documentation deltas, keep pending device limitations explicit, and rerun the affected meaning/link checks. No new standalone report or unrelated README reorganization. Logging: none. Dependencies: factual body documentation is independent and already present; final wording depends on Tasks 4/6 and Q1. Sources: R1–R6 and documentation preference.

- [ ] Task 8: Complete scoped quality gates and record exact evidence.
  Files: affected source/tests/docs and this plan's progress/evidence.
  Existing evidence: 184 distinct browser scenarios have passing source-bound results across prior selections, not one complete suite run; lint/typecheck and fresh Android/iOS/web exports passed during verification. The subsequent fix changed only registered tests and factual docs, retaining the two production hashes below. Remaining deliverable: revalidate source/command identities, run required lint/typecheck for actual new changes and the new/affected regressions first, then all relevant shared Sheet consumers if its composition changes. Repeat Android/iOS/web exports when runtime/configuration changes invalidate the retained results; preserve valid unchanged evidence rather than repeating every successful selection solely to update a count. Core remains unchanged; run Node tests if a pure helper/contract changes or a concrete concern requires it. Record precise run selections, helper versus production failures/reruns, source identity and unavailable physical checks. Final closure requires Tasks 4/6/7 and Q1. Keep user port 8091 alive and stop only owned test processes. Logging: concise actual outcomes/errors. Sources: all requirements/project validation.

## Commit Plan

Advisory only for a later authorized operation; task file sets overlap, so use careful hunk grouping or a combined commit if authorized:
- Tasks 1–4: `feat(ui): unify editor and sheet scrolling`
- Tasks 5–8: `test(ui): verify whole-window scrolling and document behavior`

## Commands and Verification Contract

Read-only `ai-factory commands --json`, CWD `.`, revision `52324bc8a91c2e8775d91c90b203373ad59663b1b090a37fd304440c24ad958e`; package SHA256 `3b1b385ddd341785da0d090e3ca64f970cf2112236e9b33002a01e3de1378155`, lock SHA256 `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. No ambiguities; refresh after script/manifest changes.

| Exact command ID | CWD | Verification |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` |
| `package.json#/scripts/test:e2e` | `.` | New editor/sheet specs, then relevant existing durationPicker, durationInertia, planning, planningTemplates, planningButtons, planningScroll, usability, usabilityLayout, backup, crono, localization and theme suites; run a full final suite if shared Sheet composition affects all consumers |
| `package.json#/scripts/export` | `.` | `npm run export` (Android/iOS/web) |
| `package.json#/scripts/test` | `.` | `npm test` only for changed pure/core contracts or a concrete unresolved concern |

Use established Windows Node/npm, one Playwright worker, 45-second limits and no retries. Preserve the running local preview at 8091. Reuse it in isolated browser contexts or use an external temporary configuration on an owned port (such as 8094). Browser auto-scrolling alone does not prove gesture ownership; include real wheel/touch movement comparisons.

## Planning and Execution Notes

- Read-only architecture/surface reconnaissance mapped every ScrollView/FlatList and Sheet caller. No research/roadmap/top-level RULES or skill-context override exists; architecture/base rules apply. Expo 57/RN 0.86 documentation preflight is required and has been read before this implementation's UI edits.
- PR #17 is merged into `origin/master`; fetched and fast-forwarded local `master` to `139cebb`, then created this clean feature branch. No implementation work was stashed/discarded and no commit/push is authorized by this implement invocation.
- Planning-baseline lint and typecheck passed on 2026-11-10. No scrolling implementation result is implied by that baseline.
- Q1 is still unanswered. Only independent body/regression tasks may proceed; retain current title placement until the explicit answer arrives.

## Implementation Evidence

- Task 1: the registered real Focus → Repeat 4× → Repeat 2× browser journey reproduced the pre-change behavior in 7.0 seconds. Its first behavioral assertion failed because Save remained in the viewport rather than following the 16-action content. This is the expected regression result before production edits, not an unexplained application/test failure. Existing one-worker/45-second/no-retry settings were retained.
- Task 2: metadata/count now use the existing FlatList header and Add/error/Save its footer. The identical regression passed after the production change (3.5-second case, 4.6-second run); typecheck also passed. Added shared pending return metadata for all editor panels and an optional Close-button ref on Sheet, without moving the heading. Body/header types remain stable and EditorBody remains mounted. More extensive restoration/gesture coverage belongs to Task 5; Q1 is still unanswered.
- Task 3: duration and discard bodies now have bounded ScrollViews; calendar/repeat retain their existing owners. Twenty existing duration-picker scenarios passed (45.5 seconds), including real wheel/touch isolation, temporary Apply/Cancel, completion notices/Stop and the six-language/two-theme layout matrix. The fifty-action scenario is reserved for Task 5's changed navigation contract. New compact 320×400/enlarged-text Light/Dark panel cases passed (2/2, 9.0 seconds) after fixing a test-only locator that initially matched both intentionally retained hidden editor text and visible panel text. Lint and typecheck passed on the production changes. No device-level acceptance is implied.
- Task 5: all six new editor cases passed together (19.2 seconds). They cover real sixteen-action repetition/wheel movement, a paced touch drag over Repeat without activation, compact/enlarged panels, controlled typing and return focus/offset, and literal legacy Save/reload. The adapted fifty-action case passed separately (8.6 seconds): Calendar is exercised at its now-scrollable header before navigating to action 50; unchanged-geometry duration return assertions, IDs, reorder/remove and Save/reload remain strict. All 76 existing scenarios in `durationInertia.spec.ts`, `planning.spec.ts`, `planningButtons.spec.ts` and `planningTemplates.spec.ts` passed in 4.1 minutes, including all 14 inertia cases and the six-language/two-theme/320–390px template matrix. Together with Task 3's 20 other duration-picker scenarios, 103 distinct browser scenarios passed on the unchanged production source. Final lint, typecheck and diff whitespace checks passed; no pure/core changes required Node tests.
- Source identity at the end of the initial implementation (SHA256 of actual worktree bytes): `ScheduleEditorSheet.tsx` = `eb8c50850a58adec6e99a70e7f2b4fa267df869d92f7e5d2fa58a2d6841a953a`; `Sheet.tsx` = `f989178bfb59e5c29be7533c75fac98f74de0abc38240da7e257fcceacc2d028`. Package and lock hashes remain the catalog values above. Only these two production files, the adapted duration-picker spec, new editor spec and this plan changed. User preview at 8091 remains running; no commit/push was performed.
- Subsequent verification exported Android/iOS/web successfully and reran lint/typecheck on the unchanged production bytes. The later scoped fix added 17 passing shared-window cases (1.5 minutes), 64 passing existing backup/crono/planningScroll/usability cases (5.7 minutes) and body documentation through `$aif-docs`; all 37 relative file links resolve. Together with the prior 103 scenarios, 184 distinct browser cases have passing results across selections, not one clean full-suite invocation. See [the scoped learning patch](../patches/2026-11-10-11.19.md) for exact commands, helper failure/rerun and source identities.
- These later changes add the shared spec plus README/DESCRIPTION/ARCHITECTURE deltas; the feature plan retained four completed checkboxes because complete heading-dependent acceptance was not performed. The production hashes and command/manifest identities remain unchanged. Reconcile existing work before scheduling any repeated implementation or verification.
- Resumption: header-independent geometry/helper checks may proceed under Task 6; obtain Q1 explicitly before Task 4 and final heading assertions. Then close the remaining documentation delta and source-appropriate gates under Tasks 7/8. Physical native gesture/keyboard/font-scaling/accessibility acceptance remains pending. Plan-refinement approval does not answer Q1, and the feature must not be reported complete without it.

## Refinement Rationale (approved 2026-11-10)

- Reconcile factual work and evidence already accepted during verify/fix; preserve all four completed task entries and all eight task IDs.
- Leave Q1 unresolved and retain both branches. The offscreen-Close risk applies only if scrolling headings are selected; it is not a reproduced failure of today's fixed headings.
- Add explicit far-row resize/font-change acceptance for R4 instead of counting the existing one-action wheel resizing as proof of virtualized source restoration.
- Bound font simulation and preserve real gesture ownership; no production change is authorized merely because a test helper needs correction.
- Separate independent body/geometry/documentation evidence from heading-dependent final closure, and retain valid source-bound exports/checks while rerunning checks whose inputs change.
- Meaning preservation: PASS — the Original Request, R1–R6, limits, input exceptions, Q1 uncertainty, explicit Save, physical deferrals, logging and ownership constraints remain intact. New cases make existing R4/R5 acceptance concrete without adding a feature or choosing a policy.
