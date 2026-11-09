# Implementation Plan: Everyday usability improvements

Branch: `feature/usability-improvements`
Created: 2026-11-09
Mode: full
Status: Complete (21/21 tasks verified; deferred physical acceptance remains pending)
Base: fetched `origin/master` at `d3c45880e3962b0a00659da57c38f7d4f08517eb` (includes Planning page scrolling and wheel inertia).

## Original Request

please Please implement your improvements

## Settings

- Scope: the eight improvements in the preceding recommendation table. User confirmed: “The eight listed improvements (Recommended)”. New timer/schedule activity history and daily/weekly statistics are excluded.
- Testing: yes; meaningful pure/controller tests, real browser journeys, compact/localized/theme coverage, and all required checks. Register new Node tests immediately in package.json.
- Logging: minimal; warnings/errors only at actual file/transfer failures, with bounded error codes. No scroll/tick/success logs, new logging framework, file contents, session payloads, or saved names in logs.
- Docs: yes; mandatory `$aif-docs` completion checkpoint for README and a scoped backup guide. Preserve current branding, six languages, and existing notification guidance.
- Planning: detailed full plan; implementation runs sequentially. The user explicitly requested implementation as well as invoking planning, so continue through `$aif-implement` after this artifact is ready instead of requesting authorization again. No commit, push, PR, EAS build, APK installation, or phone changes are included.
- Native acceptance: retain the user's device-test deferral. Native file pick/share, Android/iOS gesture feel, enlarged native text and TalkBack/VoiceOver remain pending until device testing resumes. Compilation and browser evidence must be described separately.
- Optional roadmap, research, top-level RULES and skill-context files are absent. Do not create replacement context artifacts or modify older feature plans.

## Accepted Product Scope

1. Compact Timer setup with 1/5/10/25-minute presets; large active countdown.
2. Localized end time and +1 minute while running/paused.
3. Planning cards with one emphasized Start action, sequence preview, and secondary actions in a menu.
4. Grouped Settings with current selections and clear return navigation.
5. More readable helper/action text and consistent spacing without fixed-height truncation.
6. Unsaved schedule templates, duplication and bounded repeated sequences.
7. Compact cross-tab controls for active Timer and Planning, including concurrent/paused owners.
8. Portable file backup/import of saved schedules, preferences and existing stopwatch history.

## Requirements Reconciliation

Authority: the request and confirmed eight-item scope define new behavior. `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` constrain platform, persistence, accessibility and owner boundaries. Existing pure validators, caller guards and native protocol bounds remain authoritative compatibility contracts. The recommendations are refined below into explicit behavior; no speculative physical result is treated as verified.

| ID | Decision and source | Verification obligation |
|---|---|---|
| R1 | Timer layout/presets; accepted items 1–2; `src/app/timer.tsx`, `TimerFace.tsx`, `durationPicker.ts` | Presets select without starting, only while idle/completed and settled. Keep numeric wheels/inertia, bounds and zero validation. Running/paused views hide editing wheels and show large countdown. |
| R2 | Timer extension; `core/timer.ts`, `hooks/timerCompletion.ts` | A full 60,000 ms addition updates duration and remaining budget atomically, shifts a running deadline exactly once, preserves run ID and exact paused milliseconds. Reject total overflow and overdue/completed/idle additions without mutation or playback cancellation. Reset/Restart subsequently use the adjusted total. |
| R3 | Planning enhancement; `core/planning.ts`, `core/notifications.ts`, `core/completionAlerts.ts`, native completion protocol | Keep 20 templates, 50 actions and unique IDs. Repeated cycles materialize into a draft of at most 50 ordinary actions, preserving storage/protocol shape and occurrence-index event identities. No resetting stepIndex to repeat. |
| R4 | Saved-state boundary; `ScheduleEditorSheet.tsx`, `planning.tsx` | Templates and Duplicate open unsaved fresh-ID drafts. Repeat edits the draft only; Apply duration remains local and Save persists. Preserve names, calendars, confirmations, focus/viewport and protected active sources. |
| R5 | Settings/readability; `SettingsSheet.tsx`, `Sheet.tsx`, `theme.ts`, `i18n/types.ts` | Use one existing Sheet with internal group panels, Back/Close semantics and shared notices. Save preferences immediately through update. Leaving Sounds cancels preview only. All new copy covers six catalogs; Romanian remains default. |
| R6 | Activity controls; `_layout.tsx`, `PlanningRunCard.tsx`, `CronoContext.tsx` | Display each active running/paused owner only off its own tab; support both concurrently. Route through Expo Router and existing controls/permission policy. Tick locally in foreground, never persist display updates or announce every tick. |
| R7 | Portable data; `useStopwatch.ts`, `core/stopwatch.ts`, `core/planning.ts` | Independent strict backup envelope; do not use permissive restoreData as a successful import parser. Exclude all active clocks/run snapshots/OS permissions/native ledgers. Validate size, versions, records and limits before mutation. |
| R8 | Accepted updates; `useStopwatch.ts`, `notificationCoordinator.ts`, existing hydration contract | Import is additive, all-or-nothing for capacity, fresh IDs, with optional application of preferences (off initially). Preview and confirm, then recheck loaded hydration/capacity in one functional update. Preserve latest live timing state and run snapshot exactly. No permission prompt merely from restoring preferences; no second store/coordinator. |

Supported combinations:

| Input/state | Accepted transition and persisted result | Side effects and scenario |
|---|---|---|
| Idle/completed Timer × preset/wheels × motion/zero | Presets configure a valid duration without starting; reject preset input during motion. Existing no-op selection preserves completion/audio. | Real preset-to-Start and no-op completion tests; unchanged legacy fixture and no per-frame writes. |
| Running/paused Timer × +1 minute × valid/overflow/overdue | Add exactly 60 seconds only when total remains <=23:59:59 and running deadline is still future; paused deadline stays null. Preserve run ID. | Core boundaries, fractional pause, old-deadline callback/native request replacement races; unaffected Planning owner. |
| Timer end today/across midnight × language | Use localized deadline clock, including a date across midnight; paused display states Paused, with no fabricated end clock. | Deterministic Intl/date cases and UI after extension/reload in six languages. |
| New/template/duplicate schedule × available/full capacity | Open fresh unsaved draft, preserving source text/calendar and IDs on the source. Save rechecks total count; full capacity cannot silently replace another schedule. | Draft Cancel/Save, active-source clone and full-capacity UI tests. |
| Draft repeat × 2/3/4 cycles × <=50/>50 actions | Preserve the original first-cycle IDs, generate unique later-copy IDs; reject overflow/collisions without truncation. Show resulting step count/total before applying. | Pure repeat/collision cases; edit, repeat, discard, Save/reload; one final notification and cumulative repeated boundaries. |
| Timer/Planning running/paused × current tab × concurrent owners | Show only other-tab active owners, each with time/status and Pause/Resume; navigation opens the owner without resetting clocks/drafts. | Real two-owner tab journeys, no added writes from ticking, compact layouts and modal accessibility isolation. |
| Settings group × Back/Close/OS Back × live sound | Back returns to groups, Close leaves Settings, leaving Sounds cancels preview without cancelling a real timer/planning alert. | Group navigation, focus return, immediate saved selection, notices and real-media checks. |
| Backup export × loaded/failed hydration × idle/live clocks | Export a bounded portable file of saved schedules/history/preferences only. Failed hydration disables transfer. | Round-trip projection, literal legacy data and downloaded-file assertions; native adapter failure paths. |
| Import valid/invalid/cancelled/oversized/newer version × preview/confirm | Parse strictly before preview; cancellation and errors cause no mutation. Unknown versions, duplicate source IDs, bad calendars/laps and any invalid preference reject the entire file. | Pure invalid corpus, size boundaries, file-picker cancel/read failures and no-op write counts. |
| Import confirm × latest capacity/timing/preference-choice | Fresh-ID additive import in one accepted update; reject capacity overflow with existing data intact. Apply preferences only if chosen; never import OS authorization. | State changes while preview is open, repeated imports/fresh IDs, active protected source/run preservation, failure/hydration guard. |

Representative artifact: retain `tests/fixtures/app-v1-before-planning.json` unchanged. Hydrate it, perform no-op wheel/settings navigation, export/import a portable file, change a translated draft, Save and reload. Assert old clocks/history/preferences/user names survive and imported records are independent fresh-ID copies. Existing malformed-history findings remain follow-up work; strict file validation does not assert that permissive startup fallback has been redesigned.

Meaning preservation: PASS — all eight accepted improvements are covered; later activity statistics and physical-device operations are excluded. The 50-action repeated sequence and explicit additive import refine previously unspecified behavior while preserving existing owners and user data.

## Versioned API and Dependency Evidence

Installed Expo `~57.0.32`, React Native `0.86.3`, npm/Node 24+. Read the [SDK 57 index](https://docs.expo.dev/versions/v57.0.0/), [Expo corrections/index](https://docs.expo.dev/llms.txt), [DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/), [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/), and [RN 0.86 accessibility](https://reactnative.dev/docs/0.86/accessibility). FileSystem HTML was fetched directly when the browser fetch failed; inspect exact modern File/Paths signatures before implementing.

Native backup needs `expo-file-system`, `expo-document-picker`, `expo-sharing`; install during implementation only with `npx expo install`. Use dynamic native adapter imports and distinct `.web.ts` upload/download code so old binaries do not crash at startup merely because a backup module is missing. No incoming-share extension, iCloud entitlement, broad storage permission, native project edits or background worker is needed. New native features require a rebuilt binary; do not build/install one under this task.

## Command Evidence

CWD: `/mnt/d/app_crono`; established Windows npm/Node workflow uses `D:/app_crono`. Catalog: `/tmp/crono-usability-commands.json`, final revision `18d88c42c387bd24217dc06ea8af933ad630a35228f5f05941e0ee3d0a19b830`. Initial planning revision was `7acd86fe11947dcae04fb10252e781e83e96c2ae362b1075c170e9f8ae8a9b9b`; the hashes below describe that pre-implementation baseline.

Before planned dependency/test-script changes: package SHA256 `e7a23a389d13f305785ec80ad374d852b816b25c915c1054cb5872c869f681ec`; lock SHA256 `d51c48de69f2dea273e2e56bf0e7af9fdbffdb8e3016b234de479d64c640c38c`. Refresh catalog/hashes immediately after either command source changes. Catalog declarations are not execution results.

| Command ID/source | CWD | Use |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` at meaningful checkpoints and completion. |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` at meaningful checkpoints and completion. |
| `package.json#/scripts/test` | `.` | `npm test`; register backup/planning-tools tests immediately when created. |
| `package.json#/scripts/test:e2e` | `.` | Focused new usability/backup tests first, then affected full browser coverage after Settings helper updates. Keep existing timeouts/retries; use the installed CLI with consistent lowercase paths if the known Windows wrapper issue recurs. |
| `package.json#/scripts/export` | `.` | `npm run export` for Android/iOS/web after all source/dependency changes. This is compilation, not an APK or device test. |

## Commit Plan

Proposed later authorized checkpoints only; this request does not commit or push:

- **Commit 1** (tasks 1–4): `feat(timer): add quick setup and adjustable active countdowns`
- **Commit 2** (tasks 5–8): `feat(planning): add routine shortcuts and clearer controls`
- **Commit 3** (tasks 9–12): `feat(settings): organize preferences and active activity controls`
- **Commit 4** (tasks 13–16): `feat(backup): add validated portable data transfers`
- **Commit 5** (tasks 17–21): `test(usability): verify compatibility and document workflows`

## Tasks

### Phase 1: Timer controls and lifecycle

- [x] Task 1: Add an atomic bounded Timer extension transition and regression coverage.
  Files: `src/core/timer.ts`, `tests/timer.test.ts`.
  Deliverable: add an explicit +60,000 ms transition with injected now; preserve identity for rejected idle/completed/overdue/overflow additions, exact fractional paused budget and valid restoration. Reset/Restart use the adjusted duration. Verify R2 combinations before wiring UI. Logging: none in pure core. Dependencies: none.

- [x] Task 2: Expose extension through the existing completion owner and prove old-deadline isolation.
  Files: `src/hooks/timerCompletion.ts`, `useTimerCompletion.ts`, relevant context types; `tests/timerCompletion.test.ts`, `notifications.test.ts`, `notificationCoordinator.test.ts`, `completionAlerts.test.ts`.
  Deliverable: extend via accepted functional updates, existing reconcile and generation fences. Do not create another timing/alarm owner or cancel audio on rejected updates. Test extended deadline versus queued old callbacks/registrations and concurrent Planning (R2/R8). Logging: existing warnings/errors only. Depends on 1.

- [x] Task 3: Implement compact setup, preset selection and active countdown controls.
  Files: `src/app/timer.tsx`, `src/components/TimerFace.tsx`, `src/i18n/types.ts`, all six catalogs, relevant browser tests.
  Deliverable: 1/5/10/25-minute presets configure without Start while idle/completed/settled; preserve wheel guards and completed no-op identity. Hide wheels while running/paused, show large countdown and +1 minute with bounded disabled state. Update parts and fresh refs together. Verify R1/R2, compact and enlarged layouts. Logging: no input/tick logs. Depends on 2.

- [x] Task 4: Add localized end-time presentation and Timer integration coverage.
  Files: `src/i18n/formatters.ts`, `src/components/TimerFace.tsx` or scoped timing presentation helper, catalogs; `tests/i18n.test.ts`, `tests/e2e/usability.spec.ts`, existing Timer/picker cases.
  Deliverable: local clock from actual running deadline, include date across midnight; paused status has no end clock. Cover extension, paused/resumed/reloaded state and native-policy identity without changing saved data. Register/discover tests immediately. Logging: none for formatting. Depends on 3.

### Phase 2: Planning shortcuts and card hierarchy

- [x] Task 5: Add pure bounded clone/repeat/template helpers and tests.
  Files: new `src/core/planningTools.ts`, template metadata if separate; new `tests/planningTools.test.ts`, `package.json`.
  Deliverable: deterministic validation with injected IDs, clone source preservation, unique step copies and repeat counts 2/3/4 bounded to 50 actions. Preserve first-cycle IDs. Template metadata uses semantic keys/durations, with translated names applied outside core. No new persisted schema or looped event index. Test R3/R4 and immediately register the test. Logging: none in pure core. Depends on 4 for the shared catalog foundation.

- [x] Task 6: Add template and duplicate unsaved entry flows.
  Files: `src/app/planning.tsx`, new `src/components/PlanningTemplatesPanel.tsx` if needed, catalogs; `tests/e2e/usability.spec.ts`.
  Deliverable: Focus and Workout templates and Duplicate open new fresh-ID editor drafts. Preserve source calendars/names/runs, trim localized copy names within 80 characters, retain count limit and recheck on Save. Cancel has no persistence effect. R3/R4. Logging: existing failure notices only. Depends on 5.

- [x] Task 7: Add an explicit repeated-sequence editor panel.
  Files: `src/components/ScheduleEditorSheet.tsx`, optional `ScheduleRepeatPanel.tsx`, catalogs; core/browser planning tests.
  Deliverable: choose 2/3/4 total cycles, preview resulting count/duration, then materialize copies in local draft. Reject >50 without truncation; Back/Cancel retains original draft/focus and Save remains persistence boundary. Keep one sheet and existing duration/calendar editing. Verify ordered Save/reload and cumulative repeated deadlines/final notification. Logging: no saved text logs. Depends on 6.

- [x] Task 8: Refine saved cards and secondary-action menu.
  Files: `src/app/planning.tsx`, new `src/components/ScheduleCard.tsx` and a scoped menu panel if needed; catalogs, planning browser helpers.
  Deliverable: emphasized Start, readable step/duration summary and short sequence preview, 44px labelled menu target for Edit/Duplicate/Delete. Preserve protected active templates, deletion/replacement confirmation and whole-page scrolling. Update tests to use the new actual menu flow rather than bypassing it. R3/R4/R5. Logging: no routine action logs. Depends on 7.

### Phase 3: Settings, readability and cross-tab controls

- [x] Task 9: Group Settings into small accessible panels.
  Files: `src/components/SettingsSheet.tsx`, scoped settings row/group components, catalogs; `tests/e2e/helpers.ts`.
  Deliverable: overview rows with current summaries for Appearance, Language, Sound, Notifications, Device, Data and About; existing one Sheet hosts panels. Keep immediate preference writes and foreground notices. Back returns to overview, Close exits; OS Back returns from panel before closing. R5. Logging: existing warnings/errors only. Depends on 8.

- [x] Task 10: Preserve preview, focus and notification behavior across Settings navigation.
  Files: Settings components and affected sound/language/theme/notification browser helpers/tests.
  Deliverable: cancel preview only when leaving Sounds/closing; preserve real completion audio. Restore overview-row focus, keep active language changes mounted without resetting clocks/drafts, retain explicit permission gestures. Add meaningful lifecycle/navigation tests. R5/R8. Logging: existing playback/permission failures only. Depends on 9.

- [x] Task 11: Apply a readable, consistent text and spacing scale.
  Files: `src/theme.ts`, touched Timer/Planning/Settings/activity components, `src/app/index.tsx`, `history.tsx` and their small captions where needed.
  Deliverable: supporting text generally 12–13, body/action 14–16, clear title hierarchy, wrapping rather than fixed-height clipping. Preserve contrast tokens, numeric geometry, large-text scaling, safe areas, compact tabs and 44px targets. Do not add per-frame motion or disable font scaling. Verify R5 and the six-language/two-theme 320/390px matrix. Logging: none. Depends on 10.

- [x] Task 12: Add compact active-owner rows above navigation.
  Files: new `src/components/ActiveActivities.tsx`, `src/app/_layout.tsx`, catalogs; `tests/e2e/usability.spec.ts`.
  Deliverable: show running/paused Timer and Planning only off their own tab; both can coexist. Show meaningful time/status, navigate through Expo Router, Pause/Resume via existing controllers and permission policy. Display ticks local/foreground only, no persistent writes or per-tick announcements; sheet overlay stays isolated. R6/R8; test simultaneous owners, pause/resume, tab navigation, completion/disappearance and compact layout. Logging: existing failures only. Depends on 11 and 2.

### Phase 4: Portable backup and import

- [x] Task 13: Add strict portable backup projection/validation and merge operations.
  Files: new `src/core/backup.ts`, strict reusable session reader in `core/stopwatch.ts`, new `tests/backup.test.ts`, `package.json`.
  Deliverable: envelope `{format:'crono-backup',version:1,exportedAt,schedules,sessions,preferences}`, max 5 MiB UTF-8, current record bounds and full preference validation; reject malformed/unknown/duplicate/invalid records without fallback, filtering or truncation. Whitelist fields. Project saved records only. Merge additive fresh-ID copies into latest state with all-or-nothing capacity and optional preferences, preserving live clocks/run references. R7/R8; register tests immediately and refresh command evidence. Logging: none in pure core. Depends on 12.

- [x] Task 14: Install SDK-compatible file modules and implement platform adapters.
  Files: `package.json`, `package-lock.json`, new `src/hooks/backupFiles.types.ts`, `backupFiles.ts`, `backupFiles.web.ts`.
  Deliverable: install only through `npx expo install expo-file-system expo-sharing expo-document-picker`; read matching types/docs. Native uses a single cached JSON document, copy-to-cache import and share availability; dynamic imports report missing old-binary capability safely. Web uses real JSON download/upload, original file size validation, cancellation and object-URL cleanup. No broad permission/config/native-project edits. Refresh command catalog/hashes after changes. R7. Logging: bounded warning/error codes only, never file contents. Depends on 13.

- [x] Task 15: Add transfer lifecycle and accepted-update integration.
  Files: new `src/hooks/backupTransfer.ts` injectable owner if needed, `useBackupTransfer.ts`, new `tests/backupTransfer.test.ts`, package registration.
  Deliverable: loaded-hydration gate, one operation at a time, token/disposal guards for late file reads, parse before preview, Cancel no mutation. Confirm rechecks current capacities/hydration and imports in one functional update; default preference application off. Catch file errors separately from persistence warnings; do not claim update acceptance means durable write. R7/R8; test concurrent clocks/capacity, close/reopen, errors and repeated fresh-ID imports. Logging: bounded file-boundary failures only. Depends on 14.

- [x] Task 16: Expose Data backup/import review inside Settings.
  Files: new `src/components/BackupSettings.tsx`, Settings Data panel, catalogs; new `tests/e2e/backup.spec.ts`.
  Deliverable: export/import controls, portable-file explanation, preview schedule/session counts and explicit preferences checkbox, confirm/cancel and actionable size/version/capacity feedback. File-selected data never auto-applies. Download/upload actual JSON in browser tests; verify live run protection and restart/reload. R7/R8. Logging: existing transfer failures only. Depends on 15 and 9.

### Phase 5: Compatibility, documentation and completion

- [x] Task 17: Verify cross-feature deadline, draft and data invariants.
  Files: relevant registered Node/core/coordinator tests and `tests/e2e/usability.spec.ts`, `backup.spec.ts`, existing picker/timer/planning/sound/notification suites.
  Deliverable: unchanged literal legacy fixture through real export/import and editing/reload; extension invalidates old callbacks/native requests; repeated actions retain unique cumulative identities; import during active clocks preserves latest timing and protected source; no-op focus/settings navigation preserves completion/audio. Avoid redundant mirrored tests. All R1–R8. Logging: test diagnostics only. Depends on 16.

- [x] Task 18: Complete browser navigation/accessibility/layout regression coverage.
  Files: shared browser helpers and impacted existing suites; source fixes only for demonstrated failures.
  Deliverable: migrate tests to grouped Settings, menu actions and compact active Timer. Retain real touch inertia/held-touch cases, wheel focus/keyboard, 50-action editor and whole-page Planning checks. Verify all six languages/two themes, compact/enlarged text, two active rows, overlays and reduced motion without weakening assertions/retries/timeouts. Record pending native acceptance. R1–R8. Logging: bounded test diagnostics only. Depends on 17.

- [x] Task 19: Complete the scoped documentation checkpoint.
  Files: `README.md`, new `docs/backups.md`, `AGENTS.md` documentation map only if needed.
  Deliverable: use `$aif-docs` to explain presets/+1 minute/end times, repeated draft steps/templates/menu, grouped preferences/activity rows, additive backup scope/limits/preferences and native rebuild requirement. Preserve six-language/theme/notification meaning and separate browser/build evidence from pending device acceptance. Validate internal links and avoid implementation detail in product flows. Logging: none. Drafting depends on 17 and may overlap read-only browser checks; final review waits for 18.

- [x] Task 20: Run final authorized checks and finish the plan ledger.
  Files: feature source/tests only for demonstrated failures; this plan for actual evidence/checklists.
  Deliverable: refreshed command catalog; lint, typecheck, all registered Node tests, affected complete browser coverage and Android/iOS/web exports. Inspect representative compact light/dark screenshots after animations settle. Preserve normal test retry/timeout policy and existing user server ownership. Record actual results, unresolved material issues and pending physical checks; no separate summary-report artifact, commit/push or phone action. All R1–R8. Logging: concise verification outcomes. Depends on 19.

- [x] Task 21: Synchronize project description with the completed usability and backup feature.
  Files: `.ai-factory/DESCRIPTION.md`; this plan for implementation progress/evidence only.
  Deliverable: add a concise factual summary and relevant entry points for the implemented Timer presets/end time/extension, Planning shortcuts, grouped Settings, readability/activity rows and portable backup/import. Correct the preference contract to `alertDurationSeconds: 5 | 15 | 30 | 60` from `src/core/sounds.ts` / `src/core/stopwatch.ts`. Point the active-plan reference to `plans/feature-usability-improvements.md`, retaining earlier plan references and their deferred acceptance status. Add current usability evidence from Task 20: 227 registered Node tests, all 282 distinct browser cases passing across runs, and Android/iOS/web bundle exports, tied to the recorded source fingerprint. Retain historical results as historical; do not imply new native tests, physical acceptance or signed builds. Preserve known storage/security follow-ups, storage schema/key and all device-test deferrals. Validate documentation links and contracts against source; run required lint/typecheck before closing the task. No new runtime code, dependency, roadmap, rules artifact or regression test is needed for this factual documentation update. R5/R7/R8. Logging: none. Depends on 20.

## Completion Criteria

All eight accepted improvements are usable through actual UI flows, translated into all six languages, with exact timing/data ownership preserved. New imports are strictly validated and explicitly confirmed without overwriting live clocks or silently evicting saved records. Automated checks pass and docs explain the final behavior. Physical-device acceptance remains explicitly pending under the user's existing deferral, never inferred from exports or browser gestures.

## Execution Evidence

Planning: clean `master` matched fetched `origin/master` at the base above; new feature branch created without unrelated edits. Two read-only focused code investigations confirmed timer generation fences, existing strict/permissive validation boundaries, 50-action/native protocol limits and platform file needs. No implementation, dependency installation, commit, push, PR, APK build/install or phone operation occurred during planning. Implementation evidence will be appended task by task below.

- Task 1: all six Timer core tests passed, including exact fractional extension, reset/restart, restoration, expiry, overflow and invalid-time no-ops.

- Task 2: focused Timer/completion/notification/native-policy tests passed, including old-deadline callback and delayed registration replacement; no rejected extension stops completion audio.

- Task 3: lint/typecheck and both real browser preset/extension/pause/reload journeys passed. Active wheels are hidden; setup inertia and invalid-zero recovery remain available.

- Task 4: all 11 i18n tests passed, including timezone/day-boundary formatting in all six languages; real midnight/pause/resume end-clock browser case passed. Proposed commit checkpoint retained for later explicit commit authorization; continuing implementation.

- Task 5: pure duplicate/template/repeat and existing Planning runner tests passed. Shared strict step reader exported for reuse; no stored schema/protocol change. New test registered immediately. Refreshed catalog `da44dd560a58f4dc1b30028036c267b65b90b47fce3e9a023f0eb448e4d8d993`; package SHA256 `a6f13ad961fabeff7631f12158a6a6b1780b1dbc0d7f70dded6377dce9d40a54`.

- Task 6: typecheck and the real template/duplicate Cancel/Save journey passed; imported copies use independent IDs and the source remains unchanged. Shared card/disclosure component introduced to host Duplicate and prepare Task 8 hierarchy.

- Task 7: typecheck and both real repeat-preview/Cancel/Save/reload and over-limit rejection cases passed. Original first-cycle IDs and source state are preserved; repeated copies remain local until Save.

- Task 8: lint and both card disclosure/keyboard/protected-source-copy browser cases passed. Primary Start and bounded sequence previews are visible; Edit/Delete remain protected on an active source. A Windows grep-pipe command failed before test collection; the corrected common-name selection passed with unchanged assertions.

- Task 9: typecheck and the real grouped-Settings/theme/language/Back-focus/Close/reload journey passed. One Sheet hosts all panels; Data transfer controls remain assigned to Task 16.

- Task 10: all three grouped-Settings/lifecycle browser cases passed. Initial Escape check ran before the web modal became active; readiness now follows the labelled active modal. Web Sheet has one dialog role, native Sheet keeps its own semantics. Preview stops on leaving Sounds; real completion ownership remains intact.

- Task 11: all 24 compact/enlarged-body layout cases passed (six languages × two themes × 320/390px); long modal headings now wrap with a reserved 44px Close target. Typecheck passed. Native large-text/accessibility acceptance remains pending.

- Task 12: two-owner browser journeys passed (2/2), including pause/resume, off-tab navigation, completion disappearance, zero storage writes during display ticks and covered-control isolation. Initial test fixture used reversed startSchedule arguments; corrected to its existing API. A real web-modal isolation gap was reproduced and fixed with reference-counted inert/aria-hidden background handling.

- Task 13: 23 backup/stopwatch checks passed and typecheck passed. Strict UTF-8 size/version/record/preference validation, fresh-ID additive merge, capacity/orphan-run fencing and literal legacy roundtrip covered. Corrected unsupported Node strip-only parameter-property syntax before passing. Catalog refreshed: `abeac16d0959166218e8beef62b2ad041c410e6f8e3bd5f3d501422046808698`; package SHA `d2f0a5c3c851c404b07d85b8f4a2450a08b6f2d353591477cc3b4b84672275a7`.

- Task 14: Expo installed three SDK 57-compatible file modules; native dynamic imports and modern File/Directory APIs typecheck. Web upload/download remains a separate adapter. Removed Expo install’s unused default incoming-sharing plugin (both incoming handlers default false); app config stays unchanged. Native cache retains shared exports for receiving apps, removes only old exports/cached import copies. Physical picker/share checks pending. Catalog `f2b132ab1640d15da38cef47f364b2f97cc7304cad521f9e16e932b037b56b7a`; package `6ac2a98dfb4bb35807b47e402e2746c69cc8583610d06d43538825b50ed7cdb7`; lock `a5ab4a855dcd37a2bf7c1524b73cfeccbd77eee3610bc8c5ef807741edb79a47`.

- Task 15: 10 backup/transfer checks passed and typecheck passed. Loaded hydration, overlap suppression, late read/error fencing, cancel, explicit preview/confirm, latest-clock preservation, optional preferences and capacity races covered. Accepted import does not claim persistence durability. Catalog `18d88c42c387bd24217dc06ea8af933ad630a35228f5f05941e0ee3d0a19b830`; package `f14181472cb9d230aedbaa2b6daefc708812c7b95f1acbb8ddf86c8637cc1aaa`.

- Task 16: all seven actual download/upload browser journeys passed (1.6m), including unchanged literal legacy export/import/edit/reload, current clock completion during preview, independent repeated imports, optional preferences, cancel and size/version/invalid/capacity errors. Lint passed. Native picker/share acceptance remains pending. Initial legacy assertion compared raw missing preferences with hydrated defaults; corrected expected hydration contract.

- Task 17: all 226 registered Node tests passed. Maximum populated history/schedule backup case first reproduced pretty-JSON size overhead; compact serialization passes without dropping records. Browser storage-failure case passed: accepted data stays in memory and the existing storage warning remains visible inside Data settings; no durable-save claim. Earlier native deadline/repetition/legacy/browser evidence continues to cover cross-feature contracts.

- Task 18 in progress: migrated grouped Settings, visible primary/secondary schedule flows and active Timer wheel assertions. Interrupted the first 70-case batch after reproducing closing-modal ghost controls so source could be fixed without mixing a validation run with source edits; no full-batch pass claimed. Closing sheet content now becomes inaccessible immediately while its fade completes.

- Task 18: eight migrated smoke cases passed, including real preview cancellation/restart, theme persistence, manual language no-op choices and wheel settling. Compact two-owner regression first reproduced hidden remaining time behind an 80-character action name and toast overlap; separate status/time layout and measured navigation height pass the unchanged check. Typecheck passed.

- Task 18: keyboard disclosure regression reproduced missing web expanded state; explicit aria-expanded on new More/Templates controls passes. Preserved startup history’s existing filter/cap allocation policy while sharing its validator with strict portable reads. A fresh-ID regression reproduced a 100-character imported session ID that startup would discard; import now enforces the existing strict session length bound. Broad browser run restarted after focused fixes, without changing retries or timeouts.

- Task 18: unchanged coast-tap and reverse-flick checks reproduced two Timer synchronization regressions. Hidden-editor synchronization now applies only during active runs, preserving editable transient/rapid choices; all three focused Timer/Planning inertia cases passed (40.2s). Failed-download cleanup case reproduced a leftover link; link removal now runs in finally alongside independent object-URL cleanup.

- Execution adjustment: documentation drafting overlaps read-only browser verification after core/focused UI checks passed. This changes task scheduling only; Task 19 final review and Task 20 completion still wait for Task 18 evidence. No product requirement or acceptance gate changed.

- Task 19 draft review: Meaning preservation: PASS — retained timing bounds, explicit import choice/capacity, owner boundaries and native uncertainty; corrected README’s stale 15-second fallback to the verified 60-second contract. Technical/link review: 38 local links/anchors checked, zero broken. Readability: focused backup guide and grouped workflows added; existing long README/historical evidence retained rather than restructuring unrelated documentation. Final review waits for browser results.

- Browser batch evidence: the current-source broad run passed all 48 backup/stopwatch/inertia/duration-picker cases plus three localization cases, then stopped at three legacy-localization selector ambiguities (51 passed / 3 failed / 228 not run). getByLabel included both page and fading-sheet notices; scoped the intended page assertion to the app surface. Continue complete coverage by file batches; do not claim a single clean full run. SDK compatibility check passed (“Dependencies are up to date”).

- Localization batch reproduced early background reactivation while RN Web’s closing focus trap was still active: keyboard Home could be intercepted. Verified RN 0.86 Modal docs and installed RN Web onDismiss/focus-trap source. Sheet now retains web app isolation through actual onDismiss (and cleans up on unmount); native remains the native Modal’s responsibility. Language helper waits for the returned Settings trigger as dismissal readiness. Root isolation change requires affected prior browser cases to be rerun.

- Current-source focused verification: 25/25 passed (5.0m), comprising all six localized timing/editor flows, four background catch-up cases, and all 15 new usability journeys. Lint/typecheck passed after the web dismissal lifecycle fix. Remaining coverage reruns all other browser files against this final candidate; no single clean full-run claim.

- Current JS/config candidate fingerprint (src, package/lock/app config): `461fd2ce42e87271e8053326cf8bc50386a6054d5f702ff5cb676efc5c3731a1`. After the final dismissal fix, the remaining-suite run has passed its first 104 cases, including the full initial 48 and all 320px localization layouts. Native source/assets are unchanged; this is not an APK identity or device result.

- Task 18 continuation: remaining browser batch reached real-media cases, including a passing full-minute playback/cleanup check. Two whole-page scroll layout cases reproduced a two-pixel discrepancy between separately sampled element positions. Preserve the strict movement assertion; inspect/read all compared geometry in one layout frame after fonts/screenshots are ready, then rerun the affected matrix after the current batch ends. No production source is being changed during this run. Windows Git diff checks pass; native modules, assets, literal legacy fixture, app configuration and base rules have no content changes.

- Remaining browser batch finished: 265 passed / 2 failed in 50.9m, with both failures limited to the reproduced scrolling measurements. All 24 enlarged-text/two-owner cases passed. After the batch ended, the scroll test was changed to capture comparison geometry atomically after fonts/screenshots are ready; its original movement precision, all navigation checks, retries and timeouts are retained. The complete 15-case affected matrix is rerunning. Lint and typecheck passed again; production source remains unchanged. Final documentation checks cover 44 local links/anchors with zero broken and parse the published JSON example through the real backup parser.

- Task 18 complete: all 15 scrolling matrix cases passed (2.6m), including the two reproduced failures. Together with the 265 remaining-batch passes and the 15 current-source usability journeys, all 282 distinct browser cases have passing results across these runs, with no retry/timeout changes. This is combined coverage, not a single clean 282-case invocation. Core validation remains 227/227 passing; lint/typecheck passed after the final test-only change. Native gesture/large-text/screen-reader/file-transfer and existing lock-screen/audio acceptance remain pending under the user's deferral.

- Task 19 complete through `$aif-docs`: updated README and background notification navigation, created `docs/backups.md`, and maintained factual dependency/architecture/AGENTS maps. Final meaning, technical and scoped readability reviews pass against the verified UI and strict parser. All 44 local links/anchors resolve and the published JSON example parses successfully. Native uncertainty and accepted-update versus durable-write distinctions remain explicit; no unrelated README/history restructuring or rules edits were introduced.

- Task 20 complete: refreshed command catalog revision `18d88c42c387bd24217dc06ea8af933ad630a35228f5f05941e0ee3d0a19b830`; package SHA256 `f14181472cb9d230aedbaa2b6daefc708812c7b95f1acbb8ddf86c8637cc1aaa`, lock SHA256 `a5ab4a855dcd37a2bf7c1524b73cfeccbd77eee3610bc8c5ef807741edb79a47`. Final lint/typecheck passed; 227 registered Node tests and all 282 distinct browser cases have passing evidence as detailed above. SDK dependency compatibility passed. `package.json#/scripts/export` (`npm run export`, CWD `.`) exited 0 and produced web, iOS and Android bundles in ignored `dist/`; this is bundle compilation, not a signed APK or device result. Logs: `D:/crono-android/usability-final-lint.log`, `usability-final-typecheck.log`, `usability-core-all.log`, `usability-modal-focus.log`, `usability-remaining-browser.log`, `usability-scroll-frame.log`, and `usability-exports.log`.

- Final visual/working-tree review: inspected compact Timer/Settings and settled light/dark Planning screenshots, including the last card and primary/secondary action hierarchy; all text remains visible with wrapping on compact navigation. Windows Git diff checks pass; no content changes to native modules, assets, literal legacy fixture, app configuration or base rules. Stopped only the owned test Metro on 8094 (verified PID 35812); the existing user server on 8091/PID 19880 remains running and returned HTTP 200. Kept this named full plan and all authorized source work uncommitted on `feature/usability-improvements`. No push/PR, signed build, APK installation or phone action was performed. Deferred physical acceptance remains explicitly pending and is not a remaining authorized task in this plan.

- Refinement execution note: Task 21 adds a factual project-context documentation checkpoint after the verified implementation. The 20 completed tasks, original request, approved eight-feature scope and deferred physical acceptance remain unchanged.

- Task 21 complete: synchronized `.ai-factory/DESCRIPTION.md` with all eight implemented usability improvements, relevant entry points, the 5/15/30/60-second preference contract, portable backup boundaries and the current branch-plan reference. Recorded the actual 227-Node/282-browser combined-run/export evidence and its unchanged source/configuration fingerprint; kept earlier native/APK results historical and physical acceptance deferred. Known Follow-up Work is byte-for-byte unchanged. All 15 newly mapped entry-point files exist; 48 local links/anchors resolve. Meaning preservation: PASS — original request, the 20 earlier task blocks, saved-data contracts, historical uncertainty and device-test deferrals are preserved. Required lint/typecheck passed (logs: `D:/crono-android/task21-lint.log`, `task21-typecheck.log`), and Windows Git diff checks pass. Only project-description/progress documentation changed in this task; runtime, dependencies, native configuration and prior regression results remain unchanged, so no additional Node/browser/build run or new regression test was needed.
