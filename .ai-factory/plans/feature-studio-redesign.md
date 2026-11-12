# Implementation Plan: Studio Visual Redesign

Branch: `feature/studio-redesign`
Created: 2026-11-12 (Europe/Bucharest)
Mode: full
Status: complete — all 9 implementation tasks verified; physical native acceptance remains deferred.
Base: `d4e0ea04d401855793b0c9a67a9100f070fdb93d` from fetched `origin/master`. [PR #25](https://github.com/SAP4K/App_Crono/pull/25) is merged; the base tree equals the preceding `2d00709c5eff5b5ef4f0d6ecbca6800718b539c8` feature tree. Configured integration base: `master`. Local `master` was not switched or updated.

## Original Request

hai sa continuam cu c/Studio

## Settings

- Testing: yes — retain the user's full planning and meaningful regression-coverage preferences.
- Logging: minimal — existing WARN/ERROR only; no routine interaction, font, render, per-frame or saved-data logs.
- Docs: yes — mandatory completion checkpoint through `$aif-docs`.
- Selected direction: C / Studio from the preceding three-option comparison. Apply warm cream/charcoal/terracotta, editorial serif headings, readable Inter body/numerals, restrained geometric surfaces and coherent navigation/sheets across the application.
- Scope: all four routes, shared shell, duration pickers, Planning editor/subpanels, Settings, history details, backup review and notices. This is one new visual system, not an additional saved design selector.
- Preserve System / Light / Dark and all saved preferences, the six interface languages with Romanian default, existing timing/save/notification/audio behavior, whole-window scrolling and interaction-motion policies.
- No dependency, native module, persistence migration, second timing/motion owner, new feature, app-icon/splash-artwork redesign or store asset is required. Use existing icons and bundled Inter; system serif headings are a presentation choice with platform-dependent metrics.
- Planning creates only this plan and its design-reference assets. Implementation, preview restarts, builds/installations, commits, pushes and PR publication require the corresponding later user request.
- Physical Android/iOS appearance, font scaling, screen-reader, wheel-feel and prior background/lock acceptance remain deferred under the user's existing decision. Do not resume device tests automatically.

## Accepted Design Reference

The user selected **Studio**, refining the preceding request to analyze the current design, propose alternatives and choose before implementation. The mockups establish appearance and hierarchy; their sample data, simplified controls and simulated actions do not replace the production functional contract.

| Area | Durable reference |
|---|---|
| Timer setup | [Light](feature-studio-redesign-assets/studio-timer-light.png), [dark](feature-studio-redesign-assets/studio-timer-dark.png) |
| Saved schedules | [Light](feature-studio-redesign-assets/studio-planning-light.png), [dark](feature-studio-redesign-assets/studio-planning-dark.png) |
| Schedule editor | [Light](feature-studio-redesign-assets/studio-editor-light.png) |
| Grouped Settings | [Dark](feature-studio-redesign-assets/studio-settings-dark.png) |
| Stopwatch readout | [Dark](feature-studio-redesign-assets/studio-stopwatch-dark.png) |
| History rows | [Light](feature-studio-redesign-assets/studio-history-light.png) |
| Complete proposed semantic colors | [studio-palettes.json](feature-studio-redesign-assets/studio-palettes.json) |

These eight phone-sized images were captured from the selected HTML prototype on 2026-11-12, not from a Studio implementation. The temporary comparison remains at `http://localhost:8107`; that server and `.expo/design-review/` are optional local aids, not runtime dependencies. Preserve these committed references if the ignored preview is later removed.

Reference image-set SHA256: `fbfced4cea30dfee70d7ef3d2a42ef89a66cc717812f4287895182da31f6af69` (compact UTF-8 JSON array of filename/raw-byte-SHA256 records, filenames and object keys sorted). Palette-file SHA256: `8a2252b9ee8fd30d21ac3750fa33ed16e155ad2062746386b9c470cbbba4a3fe`.

### Visual Contract

| Role | Light | Dark |
|---|---|---|
| Background | `#F8F4EB` cream | `#201C19` warm charcoal |
| Surface / secondary | `#EEE8DC` | `#302A25` |
| Primary text | `#332E29` | `#F4ECDF` |
| Secondary text | `#6E6257` | `#BDB0A0` |
| Accent / primary action | `#A4452C` terracotta | `#EFB296` soft terracotta |
| Action text / icon | `#FFF8F1` | `#281C15` |
| Selected surface | `#F1DDD0` | `#51382B` |
| Interactive boundary | `#8F7E6B` | `#8A7866` |
| Decorative separator | `#E2D9CB` | `#463D33` |

Use the complete JSON snapshot for the remaining existing roles, including danger, badges, featured summaries, notices and desktop surround. Preserve existing palette keys such as `lime`/`green` as legacy semantic names mapped to the Studio accent; do not perform a repository-wide rename. Add only `separator` for decorative lines so interactive boundaries need not become illegibly faint. Do not import plan JSON into runtime code.

- Use one small presentation-only `src/typography.ts` adapter for heading family: iOS `Georgia`, Android `serif`, web `Georgia, "Times New Roman", serif`. Apply regular serif only to route and shared sheet titles. Keep `src/theme.ts` pure; retain existing Inter families for names, body text, controls, numerals, wordmark and section labels. Do not add a font dependency or change startup font loading.
- Target 28–30 px serif route headings and 26–28 px sheet headings with flexible wrapping and adequate line height. Use readable body/control text around 14–16 px and captions around 12–13 px; do not copy the small prototype labels or suppress font scaling globally. Keep tabular numerals and existing long-duration fitting behavior.
- Prefer a spacing scale of 4/8/12/16/24/32 px. Use 20–24 px screen margins, adapting at 320 px. Retain the 480 px desktop app-width cap. Primary buttons/cards use restrained 6–10 px corners; sheet top corners can be 14–20 px. Native switches, touch targets and wheel mechanics do not need geometric redesign.
- Keep all four bottom tabs and their labels. Use an accent line plus font/icon emphasis for the selected tab, rather than four large competing colored blocks; retain selected semantics, badges, live dots and measured bar height.
- Timer setup has one integrated hours/minutes/seconds selector, quick presets, one prominent Start/Restart and a quieter Reset. Do not show a duplicate decorative time dial during setup. Running/paused views use a rectangular readout and subtle linear progress with existing localized status/deadline information and controls. Completed state retains visible expiry feedback and Restart.
- Studio Stopwatch uses a restrained rectangular readout rather than an ornamental circular dial. Preserve total time, fractions, current lap, running/paused status and all lap/save controls. Decorative progress may use the existing computed fraction; it must not create another timer.
- Planning cards use a clear name, stage count/total, bounded stage preview/proportional track, compact accessible Start and the existing secondary action menu. Metadata and arbitrary user text wrap. Every stage remains accessible in the editor; the preview cannot hide edit/duplicate/delete/start capabilities.
- Keep one vertical scroll owner per visible screen/sheet/panel, and the editor's virtualized whole-body scrolling. The selected editor mockup omits some production controls for illustration; editable name fields, stage names/durations, reorder/remove, repeat, calendar, limits, validation and save/discard are all required.
- Require 4.5:1 for normal text on actual surfaces, 3:1 for meaningful interactive boundaries/focus, visible non-color-only selection, and at least 44 px interactive targets. Decorative separators may be lower contrast. Preserve warnings, completion and Stop reachability, focus/isolation and reduced-motion handling.

## Requirements Reconciliation

Authority: the selected Studio direction refines the prior design exploration. `AGENTS.md` and `.ai-factory/rules/base.md` govern mobile workflow, localization, accessibility, state and verification; `.ai-factory/ARCHITECTURE.md` / `DESCRIPTION.md` describe existing ownership and data contracts. Mockup simplifications cannot remove production features. No roadmap or research source applies; optional `ROADMAP.md` and top-level `RULES.md` are absent.

| Decision / supported combination | Source path and section | Verification evidence |
|---|---|---|
| Studio Light/Dark and System resolving either mode; manual saved choices remain manual | Selected reference and `src/core/themePreference.ts`; `ThemeContext.tsx` / `themeAppearance.ts` | Contrast tests; real theme switches/foreground recovery; selected preference survives reload and portable export/import. |
| Romanian/English/Russian/Spanish/French/German, compact 320/390 px, enlarged headings/body/wheels | `AGENTS.md` — Adding a Language; typed catalogs; Visual Contract | Actual serif diacritics/Cyrillic and long labels; both-theme screenshots; explicit enlarged 320 px checks rather than relying on a partial existing matrix. |
| Timer idle/completed with valid/nonzero or transient zero draft; running/paused with controls | `src/app/timer.tsx`, `core/timer.ts`, selected Timer references | Setup contains wheels, active view does not; Start/Restart validity/manual-busy guards, presets, +1 minute, reset confirmation, expiry/deadline and reload remain intact. |
| Timer and Planning duration selection: native adjustable, web spinbutton; manual versus preset motion | `DurationPicker.tsx`, both `DurationWheel` adapters, `durationWheel` / `wheelPresentation` / `wheelDeceleration` | Real input, centering, columns, takeover and explicit choices; unchanged six-row 607.5 ms controller endpoint, 940 ms deadline and native rates Android 0.99575 / iOS 0.99915. |
| Saved schedules/manual/weekly/fixed date; run controls; editor duration → Apply → Save | `planning.tsx`, `core/planning.ts`, `planningCalendar.ts`, `ScheduleEditorSheet.tsx` | CRUD/duplicate/templates/run replacement; Calendar/Repeat/Discard, scroll/focus return, 50-step save/reorder/removal; Cancel cannot persist a draft. |
| Open/closing/covered sheets, route slides, reduced motion, inactive lifecycle and live resize | `Sheet.tsx`, `EditorBody`, `NavigationScene`, `MotionContext`, transition controllers | Existing ready/exit isolation, stale callback, Escape/Back/focus-return and route tests. Restyling cannot remount an active editor or introduce new animation ownership. |
| Timer/Planning completion and audio/notification/storage errors in shell or a sheet | `TimingNotices.tsx`, `CronoContext.tsx`, notification/audio owners | Completion and Stop remain visible/reachable through an unsaved panel; existing sounds/notification/denied/degraded feedback tests retain assertions. |
| Paused/running clocks, history, literal legacy values and portable backup preferences | `DESCRIPTION.md` — Data Model; `tests/fixtures/app-v1-before-planning.json` | Literal file → actual preset/edit/navigation → real backup download → reviewed additive import → reload; clocks, preferences, history and user text preserved. |

Meaning preservation: PASS — choosing Studio authorizes the proposed visual system; it does not authorize altered timing physics, data semantics, simplified feature behavior or resumption of deferred physical tests. Font metrics and native appearance are explicitly uncertain until checked on device.

## Commit Plan

- **Commit 1** (after tasks 1–3): `feat(ui): introduce Studio themes and timing screens`
- **Commit 2** (after tasks 4–7): `feat(ui): extend Studio across planning and preferences`
- **Commit 3** (after tasks 8–9): `test(ui): verify and document the Studio redesign`

These are suggested implementation checkpoints, not permission to commit during planning or implementation. Shared-file hunks must be grouped by actual task ownership; a later explicitly requested single final commit may replace these checkpoints.

## Tasks

### Phase 1: Foundation and timing screens

- [x] **Task 1: Establish the Studio semantic palettes and visual tokens.**
  - Files: `src/theme.ts`, `tests/theme.test.ts`.
  - Apply the complete proposed palettes to existing keys, add `separator`, and introduce only reusable spacing/radius/type-size constants needed by actual consumers. Preserve the existing motion-token values and Inter font names. Do not import React Native or persistence into this pure module.
  - Keep the existing 31 actual foreground/surface contrast pairs in both modes; add meaningful boundary/focus checks and any new actual role pairs. Interactive borders must reach 3:1 on background and surface; decorative separator assertions must not weaken those checks. Use six-digit hex for opaque colors because the current luminance helper expects it.
  - Evidence: Light/Dark, notices/danger/selected/summary states in Requirements Reconciliation. The proposed JSON passes all existing text pairs in a planning calculation; implementation must run the real tests again.
  - Logging: none for token changes; preserve existing guarded WARN/ERROR boundaries. Depends on: none.

- [x] **Task 2: Apply Studio typography, shell/navigation and shared sheet primitives.**
  - Files: new `src/typography.ts`; `src/app/_layout.tsx`, `src/components/Sheet.tsx`; review `src/context/ThemeContext.tsx` without changing preference/appearance ownership.
  - Add the small platform heading-family adapter described above. Retain pure palette exports and current font readiness. Use serif route/sheet headings and Inter for body, wordmark, controls and numbers; no context injection or general component library is needed.
  - Restyle the in-app logo container, header/settings action, four-tab bar, active indicator, badges, storage warning and toast. Preserve the 480 px cap, safe areas, measured navigation height and input/accessibility gates around horizontal route transitions.
  - Restyle `Sheet` title, top corners, handle, Back/Close and confirmation controls while preserving modal presence, backdrop, refs, focus return, safe-area/keyboard behavior, static-versus-scrollable modes, shared notices and existing motion/isolation lifecycle. Long titles wrap around fixed minimum-44 px Back/Close targets.
  - Update intentional helper/theme assertions during this task as needed to retain useful local validation; do not strip behavior assertions merely because colors changed. Production theme changes still flow through existing selected preference and system appearance paths.
  - Logging: retain existing appearance/motion warnings; no font/render/navigation telemetry. Depends on: Task 1.

- [x] **Task 3: Redesign Stopwatch/Timer readouts, actions and shared duration wheels.**
  - Files: `src/app/index.tsx`, `src/app/timer.tsx`, `src/components/StopwatchFace.tsx`, `TimerFace.tsx`, `DurationPicker.tsx`, `DurationWheel.tsx`, `DurationWheel.web.tsx`; nearest timing/picker browser assertions.
  - Use Studio headings, rectangular readouts, tabular Inter digits and restrained progress presentation. Retain local foreground display ticks, elapsed/remaining calculations, long-hour/fraction formatting, status, current lap and end-time labels. Do not move display ticks into context or persistence.
  - Remove the duplicate setup dial while retaining idle/completed state feedback, presets and existing controls. Render the large readout for running/paused state. Use one prominent Start/Restart/Resume/Pause with a quieter still-accessible Reset; retain +1 minute, confirmation, zero-draft validation, fresh refs and permission-request gestures.
  - Give `DurationPicker` one shared geometric frame and an uninterrupted selection band across its three independent columns. Remove competing per-column borders/selection backgrounds; keep a pointer-transparent band behind transparent column viewports. Labels remain readable and each native adjustable/web spinbutton retains its own role, label, keyboard/focus and increment/decrement actions.
  - Keep `rowHeight = max(44, ceil(40 * fontScale))`, three-row viewport, row padding and snap offsets coherent. Target approximately 28 px normal-scale wheel digits only if they fit unchanged row geometry in both adapters; scale to fit rather than changing physics. Parent-band offset follows measured row geometry and any wrapper padding. No extra scroll writer, busy owner or preset selection delay.
  - Preserve all gentler-wheel tuning and tests: 607.5 ms six-row endpoint, 940 ms missing-frame deadline, native Android 0.99575/iOS 0.99915, immediate explicit choices, reduced motion and takeover. Update fixed gesture geometry only from measured rows where needed, never by loosening deadlines or blanket timeouts.
  - Logging: existing bounded failure warnings only. Depends on: Tasks 1–2. Evidence: timing/selection and lifecycle combinations above.

### Phase 2: Planning and the remaining application surfaces

- [x] **Task 4: Apply Studio to the Planning overview, active runs and cross-tab activities.**
  - Files: `src/app/planning.tsx`, `src/components/ScheduleCard.tsx`, `PlanningRunCard.tsx`, `ActiveActivities.tsx`.
  - Restyle the heading/New action, date filters, templates, schedule limits, empty states and cards. Use a compact minimum-44 px Start action with its existing schedule-specific accessible name; retain the secondary options disclosure and edit/duplicate/delete handlers. Do not add fabricated categories or hide valid controls shown outside the mockup.
  - Use the actual schedule steps for a bounded preview/track without deriving a second run model. Long user names and translated metadata wrap; weekly/fixed-date rules remain represented. Preserve virtualization and the single scroll owner for the entire Planning screen.
  - Restyle active-run progress, current/next stage and controls, replacement confirmation, completed state and activity rail. Retain timestamp-based local display and accepted-update actions; Start/Stop/Reset for one owner cannot affect another owner's clock or sound.
  - Logging: no successful-action/data logs; retain existing failure feedback. Depends on: Tasks 1–3. Evidence: schedule/calendar/run combinations and live activity/notice coexistence.

- [x] **Task 5: Apply Studio to schedule editing and every editor subpanel.**
  - Files: `src/components/ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx`, `ScheduleCalendarPanel.tsx`, `ScheduleRepeatPanel.tsx`, `CalendarDateFields.tsx`; date chooser styles in `src/app/planning.tsx`. Preserve `EditorBody.tsx` / `.web.tsx` behavior.
  - Restyle editable schedule/stage names, duration summaries, stage numbering, reorder/remove and Add controls, limits/total/validation, and Save. Keep Programare and Repeat visually separate; allow wrapping or vertical stacking on narrow/enlarged layouts instead of squeezing both into the prototype's horizontal row.
  - Keep all editor metadata, steps and Save in the existing virtualized whole-body scroll owner, including 16/50-stage cases. Duration/calendar/repeat/discard views keep their own one active scroll surface. Do not place an independently scrolling steps area inside a fixed editor frame.
  - Use the shared Studio picker in the duration panel, retaining temporary selection, manual busy guard and explicit Apply. Preserve Calendar weekly/date validation and Repeat preview/application. Cancel/Back/Discard restore list offset and focus without saving, remounting the covered editor or losing edits.
  - Logging: preserve validation/error feedback and bounded driver warnings; no draft or per-keystroke logs. Depends on: Tasks 2–4. Evidence: editor combinations, whole-window scrolling and covered-modal lifecycle.

- [x] **Task 6: Apply Studio to Settings, backup review and every feedback surface.**
  - Files: `src/components/SettingsSheet.tsx`, `BackupSettings.tsx`, `BackgroundNotificationHelp.tsx`, `TimingNotices.tsx`, `TimerCompletionNotice.tsx`, `PlanningNotice.tsx`, `SystemNotificationNotice.tsx`; switch adapters only for necessary palette/geometry styles.
  - Preserve all seven Settings groups and subpanels: appearance, language, sounds, notifications, device, data and about. Apply consistent rows/dividers, selected states, summary/value hierarchy and primary/secondary actions. System/Light/Dark, all languages/sounds/durations, haptics/wake settings and their persisted semantics remain unchanged.
  - Retain sound preview cancellation on Back/Close, notices when a live alert owns playback, notification readiness distinctions and OS-settings actions. Restyle success/completion, warning/danger, unsupported/degraded and recovery states with visible text/icons, not color alone.
  - Restyle export/import, preview counts, optional preference application, review/confirm/cancel and errors. Preserve stale-operation/hydration guards and one accepted additive import. No prototype placeholder actions may enter the app.
  - Completion/Stop, audio errors and system/storage errors must remain reachable both in shell and inside open/covered/transitioning sheets. Do not change live-region or event-scoped error ownership while restyling.
  - Logging: existing WARN/ERROR only; never log backup payloads or saved user text. Depends on: Tasks 1–2 and 5 for integrated panel checks. Evidence: preferences/backup/theme and feedback combinations.

- [x] **Task 7: Apply Studio to History, lap presentation and session details.**
  - Files: `src/app/history.tsx`, `src/components/LapList.tsx`.
  - Restyle the overview, statistics, session rows, empty state/actions, totals, dates, detail readout, lap rows, share and deletion confirmation. Use serif only for route/shared sheet titles, leaving user content and data tables in Inter.
  - Preserve all counts, bounded history/laps, current session behavior, localized dates, content fitting, share/clipboard semantics and delete/reset confirmations. Detailed history with up to 1000 lap rows still scrolls as one visible sheet body; overflow or enlarged text cannot hide final actions.
  - Logging: preserve existing share/storage failure feedback; no session payload or successful-view logs. Depends on: Tasks 1–3 and shared sheet work in Task 2. Evidence: representative legacy/session records and compact/long-value layouts.

### Phase 3: Regression coverage, documentation and delivery evidence

- [x] **Task 8: Reconcile intentional appearance assertions and close meaningful Studio layout gaps.**
  - Primary files: `tests/e2e/helpers.ts`, `theme.spec.ts`, `usability.spec.ts`, `usabilityLayout.spec.ts`, `durationPicker.spec.ts`, `timerPresetMotion.spec.ts`, `localization.spec.ts`. Extend relevant existing tests rather than creating a parallel suite for the same flows.
  - Replace obsolete blue/slate RGB expectations with positive Studio palette and selected-indicator assertions; preserve theme semantics, lifecycle, pending/playing audio, contrast, focus, scroll and stored-data assertions. Do not delete assertions or make selectors vague to get green results.
  - Cover each of six languages in both themes at 320 px with enlarged serif headings and enlarged wheels; retain 390 px layouts and existing desktop behavior. Current `usabilityLayout` skips wheel/heading enlargement, `durationPicker` assigns width by locale, and preset motion couples enlarged text to 390 px: these do not prove the new narrow/enlarged combination.
  - Assert readable wrapping/no horizontal clipping, centered rows, reachable Start/Apply/Save/Back/Close, minimum touch targets and actual heading-family/line-height application on representative screens. Review screenshots for Romanian diacritics, Cyrillic and long German/French labels; browser font fallback is not native glyph acceptance.
  - Retain all existing wheel timing, touch/wheel/keyboard, preset, failure, takeover, multi-column and lifecycle cases. Preserve all scroll/transition suites and live notices inside unsaved panels.
  - Use literal `tests/fixtures/app-v1-before-planning.json` unchanged through the existing real preset → navigation → backup download → reviewed additive import → reload journey. Retain separate selected System/Light/Dark backup and theme-during-playback checks. Do not replace fixtures with a reconstructed approximation or save resolved System appearance.
  - Logging: assertion-local measurements/screenshots are acceptable; no product telemetry or stored-data dumps. Depends on: Tasks 1–7. Evidence: all supported browser combinations above.

- [x] **Task 9: Complete the documentation checkpoint and verify the combined Studio implementation.**
  - Files: `README.md`, factual current-behavior passages in `.ai-factory/DESCRIPTION.md` and `ARCHITECTURE.md`, `AGENTS.md` only where the new typography entry/map warrants it; progress/evidence in this plan. Route documentation through `$aif-docs` and preserve historical results/plans.
  - Document the Studio Light/Dark appearance, unchanged saved theme semantics, shared selectors and the small platform heading adapter. Record system-font/platform differences and outstanding physical acceptance without claiming that export/browser evidence establishes native behavior.
  - Run lint, typecheck, core tests, one final complete browser suite and fresh Android/iOS/web exports on the combined final application. A complete browser run is justified because the shell, shared typography/colors, sheets and all routes change; current discovery declares 506 cases in 22 files, and new coverage may change that count.
  - During development use the nearest affected tests; do not repeatedly rerun the full suite once final checks pass without a source change or new concern. Keep all driver timing and meaningful guard assertions; investigate any real failure before considering timing/geometry updates.
  - Use an isolated ignored export/runner (for example `.expo/studio-export`, port 8108) rather than replacing the user's preview on 8091 or design comparison on 8107. Record exact commands, Chrome/runtime, test counts/skips/retries, all source/config/test/asset inputs and source/export/runner fingerprints. Distinguish source-equivalent outputs from byte-identical bundles; recheck inputs after the final run.
  - Inspect representative Studio setup/running/paused/completed views, populated/empty Planning and History, long editor, Settings and notices in both themes. Record only actual validation results. No signed build, APK install, device-test resumption, report file or automatic publication is part of this task.
  - Logging: preserve the existing minimal policy; evidence stays in ignored execution logs and the plan. Depends on: Tasks 1–8.

## Verification Commands and Source Identity

Discovered with `ai-factory commands --json` on 2026-11-12, cwd `.`. Catalog revision SHA256: `d0fae3c8f850ec2b6e4ce09ea58102b4cb46ea8d7e134d6a0a006a0dbe8bc8ee`. Source `package.json` SHA256: `b69e16c481b7f82de9491307d476a747764d1915782d291216a6a9d50c23ef9a`; `package-lock.json` SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. Refresh discovery if command sources change. Catalog `declared` / `not_run` is not implementation evidence.

| Command ID, cwd `.` | Planned use |
|---|---|
| `package.json#/scripts/lint` | `npm run lint` |
| `package.json#/scripts/typecheck` | `npm run typecheck` |
| `package.json#/scripts/test` | `npm test` |
| `package.json#/scripts/test:e2e` | Nearest affected files during development; final `npm run test:e2e -- --config .expo/studio.config.ts` with the complete existing test directory and isolated immutable web export. Preserve shared options/thresholds. |
| `package.json#/scripts/export` | `npm run export -- --output-dir .expo/studio-export` for all three platforms |

Use Windows Node.js 24+, npm and Git in this checkout. Manifest versions remain Expo `~57.0.32`, RN `0.86.3`; matching [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo index](https://docs.expo.dev/llms.txt), [Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/) and [RN 0.86 text-style](https://reactnative.dev/docs/0.86/text-style-props#fontfamily) documentation were checked during planning. Recheck the relevant versioned documentation before changing any native API usage. Font-family names are presentation candidates; mobile glyphs/metrics require physical evidence.

## Completion Criteria

- Studio's selected warm palettes, serif titles, geometric controls/readouts and calmer hierarchy appear consistently across all four routes and every sheet/panel, including populated/empty/error/completed states.
- Every existing user action, saved preference/data format, timing owner, motion/cancellation rule, whole-window scroll behavior and accessible interaction remains intact. The preceding gentler-wheel tuning is preserved.
- Both themes and all six languages work in compact/enlarged layouts; meaningful semantic contrast and control visibility pass. Actual phone font/accessibility/gesture acceptance is still identified as pending if unavailable.
- Final checks and documentation describe the same tested source. All task boxes require actual implementation evidence, not prototype/planning passes.

## Planning Baseline and Limits

- On 2026-11-12, `npm test` passed 292/292 on Node v24.15.0 without skips/cancellations. Playwright declaration listing identified 506 existing tests in 22 files; the browser suite was not executed for Studio during planning.
- `npm run lint` and `npm run typecheck` passed, exit 0, on unchanged application source after branch creation. Logs: `.expo/studio-plan-lint.log`, `.expo/studio-plan-types.log`; command inventory: `.expo/studio-plan-commands.json`.
- A planning-only calculation of the proposed JSON passes all 31 current text/surface pairs in both themes at 4.5:1, and interactive border contrast is at least 3.21:1 light / 3.34:1 dark on background/surface. This is a proposed-color check, not a completed theme implementation or full accessibility audit.
- Eight Studio mockup screenshots were captured and inspected; source mockup controls/data are illustrative. No source, test, dependency, native configuration, description, architecture or rules artifact was modified during planning.
- This invocation creates the new branch, this plan and its reference assets only. No Studio implementation, signed/native build, physical test, installation, preview restart, commit, push or PR has been performed.

Meaning preservation: PASS — the plan retains the user's selection of C / Studio, the earlier compare-then-choose intent, the established functional/data/accessibility constraints, and explicit uncertainty about physical platform acceptance.

## Implementation Progress

- Task 1: Studio palettes and reusable radii applied; pure theme tests pass 8/8, including all current text-role pairs and new boundary/focus checks. No runtime logs, preference or motion changes. Log: `.expo/studio-task1-theme.log`.

- Task 2: system-serif adapter, Studio header/tab indicator and shared Sheet/Confirm styles applied. Typecheck and real Chrome shell checks pass; 44px Close, live palette and serif title checked. Existing lifecycle/context owners retained. Logs: `.expo/studio-task2-{types,browser}.log`.

- Task 3: rectangular Stopwatch/active Timer and integrated picker implemented without physics changes. Typecheck/lint pass; real Chrome checks pass in both themes (band geometry, presets, Start/Pause). Both progressive-wheel profiles and literal legacy edit/reload pass 3/3. Logs: `.expo/studio-task3-{types,lint,browser,inertia}.log`.

- Task 4: Studio overview/cards/active runs and activity rail applied; compact labeled Start and New actions, bounded decorative step track and existing disclosure preserved. Added Plus to the existing SVG registry. Planning button regressions pass 8/8; typecheck passes. Logs: `.expo/studio-task4-{types,browser}.log`.

- Task 5: editor/step/date/calendar/repeat styles aligned to Studio with readable outlined inputs and separated actions; covered layouts, draft handlers and virtualization retained. Whole-editor scroll, short panels, real touch, focus/position returns and legacy Save/reload pass 6/6; typecheck passes. Logs: `.expo/studio-task5-{types,browser}.log`.

- Task 6: grouped Settings, backup controls and all completion/playback/system-help feedback use Studio spacing, surfaces and readable text. An intermediate duplicate import was corrected before the final check. Typecheck and all 17 shared-window cases pass (2.1m), including six locales/both themes, real reviewed backup, thousand-lap details and short panels. Logs: `.expo/studio-task6-{types,browser}.log`.

- Task 7: History overview/rows/details and lap/empty/statistic presentation restyled with preserved share/delete/data handlers. The real stopwatch → laps → reload → history/preferences/reset journey and three viewport cases pass 4/4. Lint/typecheck pass. Logs: `.expo/studio-task7-{types,lint,browser}.log`.

- Task 8: Studio color/selected-tab assertions now use the approved semantic roles; idle Reset checks the preserved numeric setup instead of the intentionally removed duplicate dial. Added 320px enlarged wheel combinations and serif-heading/line-height checks across six locales/both themes; discovery is 522 cases in 22 files. All 48 narrow-screen cases pass (7.2m), including an enlarged Russian Resume regression reproduced before widening its activity action. Font measurements now await actual Inter readiness: diagnostic evidence showed the same unpressed element change from 78px to 88px during font loading. The initial six press-layout failures were font-readiness races, not press geometry changes. A 124-case development run was stopped after 48 passing cases to apply the separately observed Resume correction; it is not claimed as a complete run. Prior theme checks passed 38/38. Logs: `.expo/studio-task8-{browser,narrow,regressions}.log`, `.expo/studio-press-font-ready.log`, `.expo/studio-resume-{red,green}.log`.

- Task 9: the `$aif-docs` checkpoint updates existing README/context/maps only, preserving historical verification and all behavioral requirements. There are 62 valid relative links across the four changed documents. The existing long README is retained to preserve historical evidence rather than restructuring unrelated documentation. Final-candidate lint/typecheck, 294/294 Node tests and fresh Android/iOS/web exports pass; all 522 browser scenarios pass in one complete 20.7-minute run on immutable port 8108, with zero skipped/unexpected/flaky cases and zero retries. The restarted Studio server reads the post-Resume-fix export. The user's 8091 preview and 8107 comparison remain intact. All 66 final-candidate visual captures completed without page errors or horizontal document overflow; representative Romanian, Russian and German views were inspected in both themes, including the corrected narrow Resume label. Logs: `.expo/studio-final-{lint,types,node}.log`, `.expo/studio-export-final.log`, `.expo/studio-visual-final.log`, `.expo/studio-browser-final.log`; inventory: `.expo/studio-inventory.json`.

### Final tested input identity

- Source SHA256: `17ebbfca64937705ff4dc25a34e6d2fe023e32f61d6bbc085a6e446e0955310d` (221 application/test/configuration/asset files).
- Export SHA256: `4e99175a9840d222716c548252bb10ceef1ac4ff502d98ef8663ba8f20308e9b` (76 files, including Android/iOS/web bundles).
- Runner SHA256: `32a48e82ef289ce514f8745e2a6de5c528a0cea36797839a98c08732508dccc7` (`.expo/studio.config.ts` and `.expo/serve-studio.cjs`; shared Playwright configuration remains in the source inventory).
- Algorithm: SHA256 of compact UTF-8 JSON file arrays with paths/object keys sorted; each record contains its path and raw-byte SHA256. Documentation/plans, installed dependencies and generated exports are outside the source array. All source/export/runner inputs were rechecked after the full run and remain byte-identical; the actual browser-result JSON is bound separately in the inventory. No byte identity with preceding builds is claimed.


### Final verification and documentation checkpoint

- Actual invocation: `npm run test:e2e -- --config .expo/studio.config.ts`, cwd `D:\App_Crono`, complete `tests/e2e` directory; one Chrome worker, existing 45-second default timeout and no retries. The 522 declared cases in 22 files all passed; no selection filter, omission or retry was used. Playwright reported the existing localization file as slow (5.2m); thresholds/workers were preserved.
- Browser result start: `2026-11-12T12:43:36.813Z`; duration: `1241081.034 ms` (20.7m). Final result JSON SHA256: `e67d41258a395cba0fe8ece6b98b49b263df7f94ac3b4deab85bf631d6c4d3cd`. Runtime: Windows Node.js v24.15.0 and Chrome 157.0.8103.51 (Chrome channel); the final visual probe records the browser version.
- Other final commands: `npm run lint`, `npm run typecheck`, `npm test` (294/294; zero skips/cancellations), `npm run export -- --output-dir .expo/studio-export` (Android/iOS/web), all exit 0. The final export was regenerated after the Resume correction and the isolated server restarted before the complete run. Source/configuration/assets/tests did not change afterward; only documentation/progress edits followed.
- All 34 runtime palette roles in both modes exactly match the approved JSON reference (`.expo/studio-palette-reference.log`). Three QA galleries render the unmodified final application screenshots for comparison; setup/running/paused/completed Timer, Stopwatch, populated/empty Planning and History, long editor and Settings/appearance were reviewed in both modes. Separate 320px Russian/German and enlarged Cyrillic captures were inspected. The 66-capture script checks page errors and document overflow; interaction suites establish Save/Apply/Back/Close reachability rather than treating a screenshot as that proof.
- Documentation checkpoint through `$aif-docs`: existing README, factual description/architecture and AGENTS maps updated; 62 relative links resolve. Meaning preservation: PASS — saved-theme semantics, pure-module boundaries, existing behavioral obligations and native uncertainty were compared with their prior/authoritative wording and retained. Readability: new explanatory paragraphs are split; the existing long README/history remains preserved under this scoped task. No documentation relocation or new feature page was needed.
- Physical Android/iOS appearance, font glyphs/scaling, screen readers, safe areas, keyboard/Back, wheel feel and earlier locked/background minute acceptance remain deferred under the user's existing decision. Export/browser checks do not establish those results. No signed build, install, device-test resumption, commit, push or PR was performed for this implementation.
