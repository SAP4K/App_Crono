# Implementation Plan: Saved App Language

Branch: `feature/multilingual-support`
Created: 2026-11-06
Mode: full
Status: ready for implementation; all tasks below are pending.

## Original Request

poti te rog sa adaugi mai multe limbi, engleza, rusa, romana....

## Settings

- Testing: yes — core, catalog/formatting, browser integration, and relevant native checks.
- Logging: minimal — existing WARN/ERROR paths; no routine translation, render, preference, or timing logs.
- Docs: yes — mandatory `$aif-docs` checkpoint during implementation; documentation stays in English.
- Language selection: manual in Settings, saved immediately; Romanian is the default.
- Initial languages: Romanian (`ro`), English (`en`), Russian (`ru`); adding another catalog must not require changing timing logic.
- Dependencies: use bundled TypeScript catalogs and standard `Intl`; no additional package or native module is planned.
- Execution: sequential tasks and three proposed commit checkpoints. This plan does not authorize automatically implementing, committing, pushing, merging, or publishing.

## Requirements Reconciliation

Authority: the explicit request and the user's two language answers define feature behavior. Repository instructions constrain architecture and verification. Previously selected full planning, tests, documentation, and WARN/ERROR-only logging remain applicable. The localization request activates the exception in `.ai-factory/rules/base.md` — Mobile UI; Romanian remains the default, rather than the only permitted interface language.

| Decision | Source | Implementation and verification |
|---|---|---|
| Manual, saved selection; Romanian default | User answer: “Manual selection in Settings; Romanian remains the default” | Settings radios; valid stored choice wins over device/browser language; reload in each language, and legacy/default restoration tests. |
| Exactly Romanian, English, Russian initially; extensible structure | User answer: “Romanian, English and Russian, with a structure for adding more later” | Central language registry and complete typed catalogs; parity and plural tests; documented addition procedure. The request's ellipsis does not select other languages. |
| Preserve one state/storage owner and pure core | `AGENTS.md` — Project Workflow; `.ai-factory/ARCHITECTURE.md` — Dependency Rules / User Actions and Persistence | Preference changes use `useCrono().update`; schema/key stay version 1 / `@crono/app-v1`; no storage in the translation hook, no core imports from presentation. |
| Preserve active timing, audio, and existing modal interactions | `.ai-factory/ARCHITECTURE.md` — Display and Device Behavior; `src/components/Sheet.tsx`, `ScheduleEditorSheet.tsx` | Locale changes do not remount timing owners. Settings is reached through the existing modal flows; save/discard remains explicit. Test timing identities and saved names across selection, plus drafts/confirmations within each language. |
| Keep feedback tied to event/run identity, not rendered words | `src/hooks/alertPlayback.ts`, `timerCompletion.ts`; `CronoContext.tsx`; `_layout.tsx` | Semantic notice/error codes; translate at rendering/announcement boundaries; remove the Romanian `startsWith` sentinel. |
| Retain real browser timer regression coverage | `.ai-factory/patches/2026-11-05-19.04.md` — Prevention; `tests/e2e/realTimers.spec.ts` | Preserve the three arrow-wrapper cancellation adapters; cover language changes with native browser timers and actual media behavior as well as deterministic-clock tests. |
| Include tests/docs and minimal logging | Earlier explicit user answers, reaffirmed in the current question | Add meaningful boundary/integration tests; register every new Node test immediately; mandatory documentation checkpoint. |

Applicable combinations are intentionally bounded to supported behavior. “Unchanged” below means no change to the existing domain value or side-effect contract.

| ID / accepted input and validation | Persisted state | Output / transition | Side effects and invariants | Verification |
|---|---|---|---|---|
| C1: fresh data, missing language, unsupported string, wrong type | `language: 'ro'`; other fields independently restored | Romanian interface after the existing hydration gate | No device-language detection; valid false preferences, history, timer, and planning survive | `tests/language.test.ts`; literal legacy fixture through browser hydration |
| C2: valid `ro`, `en`, or `ru`, in either light or dark theme | Only the selected language changes; selected theme retained | Visible Settings, shell, and route labels update immediately; subsequently opened sheets use the selection | Routes stay mounted; no full-page reload or platform restart | Browser language/theme matrix and reload |
| C3: same language selected again, or rapid `ro → en → ru` | No-op for same language; last accepted choice wins through ordered writes | Current catalog matches saved selection | No duplicate feedback/audio; no second persistence owner | State/reference unit assertion; rapid-choice browser reload |
| C4: stopwatch, timer, and schedule running or paused, separately and concurrently | Clocks, run IDs, deadlines, elapsed/remaining values, templates, and laps unchanged except normal elapsed time | Labels change; existing timing transitions continue | No cancellation/replay/new completion caused by language selection; background return stays silent | Deterministic lifecycle tests plus real-timer integration |
| C5: completion notice, preview, or audio failure already visible; sound pending or playing | Locale preference only; feedback remains transient | Existing visible feedback uses the selected language | Original event/run match and 3.5-second feedback lifetime retained; 4-second startup and 5/15/30-second playback limits retained | Semantic coordinator tests; browser notice and audio tests |
| C6: saved user text across language selection; editor/history flows in each selected language | Existing saved names retained exactly; drafts follow existing save/discard behavior | Localized editor/details UI; newly created default action names use the current language | Existing `Etapa 1` or other saved text is user data and is not renamed; sharing uses the language at the share action | Save mixed Cyrillic/Romanian names, change language through Settings, reopen and compare; test draft/discard and sharing in every language |
| C7: dates and integer counts in all three languages | Timestamps and numeric durations unchanged | Locale-aware dates, 24-hour history times, correct plural phrases | Fixed stopwatch/countdown numeric notation and duration parsing unchanged; device time zone retained | Plural boundary tables; fixed timestamp/time-zone formatter tests; history/share browser case |
| C8: legacy `tests/fixtures/app-v1-before-planning.json` loaded, then language changed and app reloaded | Same fixture data plus independently defaulted current fields and selected language | Session/details/completed timer render in each selected language | Fixture bytes unchanged; false booleans and dark theme preserved; no historical completion sound replay | One end-to-end path per language using the literal repository fixture |

Meaning preservation: PASS — both user answers are retained, Romanian stays the default, and additional language choices, automatic detection, or translation of user data are not inferred.

## Implementation Decisions

1. Add pure `src/core/language.ts`: a registry for `ro`, `en`, `ru`, stable autonyms `Română`, `English`, `Русский`, locale tags `ro-RO`, `en-GB`, `ru-RU`, `AppLanguage`, a validator, and `restoreLanguage(unknown)` returning Romanian for invalid/missing input. Add `Preferences.language` and restore it independently without changing storage key/version or resetting any other field.
2. Add framework-free `src/i18n/types.ts`, `ro.ts`, `en.ts`, `ru.ts`, `index.ts`, and `formatters.ts`. Define an explicit `Messages` shape: static strings plus typed functions for dynamic phrases and parameters. Every catalog must satisfy the same widened shape; do not infer English/Russian values as Romanian string literals. `getMessages(language)` returns stable module-level catalogs and falls back to Romanian for an unsupported runtime language. Missing catalog keys fail typechecking/tests instead of reaching users as keys or `undefined`.
3. Use typed catalog functions for names/counts and cached `Intl.PluralRules` / `Intl.DateTimeFormat` helpers for the selected locale. Translate complete count phrases, including Romanian forms needing “de”, rather than appending an English plural suffix. Test Russian one/few/many, Romanian one/few/other, and English one/other. Keep elapsed/countdown `formatTime`, input normalization, rounding, deadlines, and WAV assets unchanged.
4. Add `src/hooks/useI18n.ts`, deriving `{ language, messages, setLanguage }` from the existing context. Its setter performs a functional update, returns the previous object for a repeated selection, and does not write storage directly. Do not add another language provider, local persisted copy, or locale-based React `key`.
5. Convert transient toasts, timer completion notifications, and playback errors from Romanian strings to small semantic descriptors/codes with typed parameters. Existing schedule boundary events already carry semantic kind/name/index data and should retain that model. Render messages from the current catalog. At native announcement boundaries, read the latest saved language with a stable `getSnapshot()`-based callback; do not capture the first locale or add language/catalog objects to controller creation dependencies.
6. Move localized session-sharing presentation out of `src/core/stopwatch.ts` into `src/i18n/formatters.ts`. Migrate its only current consumers, `src/app/history.tsx` and `tests/stopwatch.test.ts`, in the same task. Preserve the Romanian total/lap content contract and fixed numeric times; add language-aware date/title/lap output. The pure core must not import the translation layer.
7. Replace sound display labels with catalog entries keyed by existing sound IDs. Keep `SOUND_CHOICES` entries' stable `id` fields, `SoundId`, ordering, defaults, duration choices, asset mapping, and validation semantics; remove its Romanian `label` field once its sole UI consumer is migrated. Translate newly generated schedule action names only when actions are created.
8. All three languages are LTR. Reuse shared theme tokens and existing Inter fonts. A direct inspection of all five bundled TTF cmap tables found glyphs for the 76 required Romanian/Russian code points; this is glyph-availability evidence, not a phone rendering or screen-reader result. Set the web document language to the selected language using a platform-guarded presentation effect; translate native accessibility labels and existing announcements. Do not promise that changing app language changes a device's installed speech voice.
9. Language selection lives in Settings. The existing modal editor/details/confirmation flows cover the shell's Settings trigger, so browser scenarios choose a language between those flows. Do not introduce extra language controls, bypass save/discard, or expose a production state-mutation hook merely to simulate a language change inside another modal. Avoid locale-based component keys or draft-reset effects; verify controlled drafts and confirmations in each selected language.

Scope includes all four routes, shell/navigation, loading/storage warnings, settings, sheets/confirmations, timing notices, editor placeholders/validation, accessible labels/hints, sound labels, generated action defaults, date/count phrases, and shared results. Keep `CRONO` branding and user-entered text intact. Native app metadata/system permission dialogs, OS per-app language selectors, RTL, automatic OS detection, remote translation services, extra languages, and timing/background-audio behavior are outside this release.

## Baseline and Ownership

- Source branch: `feature/white-blue-theme`; implementation baseline: `dd576e4e4f586e4a21f0b4882cd37d8741009835` (`feat(theme): add blue palettes and fix timer cleanup`). The theme/timer work is now committed and pushed, with [PR #2](https://github.com/SAP4K/App_Crono/pull/2). The existing local `feature/multilingual-support` branch was advanced by fast-forward from `64c3911` to this baseline and selected for planning. Configured eventual integration base remains `master`; no remote merge is part of this invocation.
- There are no carried uncommitted application changes. This plan is the only untracked work item. Preserve the committed theme palettes, browser cancellation adapters, real-timer regressions, learning patches, documentation, and completed theme plan when implementing localization.
- The latest recorded baseline run is 51 Node tests and 60 browser scenarios, with lint, typecheck, and Android/iOS/web exports passing after the native-timer adapter fix. These are previous-feature evidence, not localization acceptance. DESCRIPTION's older browser count is not a current result.
- Read-only planning inputs: `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/rules/base.md`, config, other existing plans/patches, source, tests, and manifests. This invocation refreshes this existing plan and selects its updated local branch; it does not revise those inputs or publish the multilingual plan.
- No roadmap/research artifact exists for linkage. Missing optional skill-context files are skipped. Task tooling is unavailable; this file is the durable task ledger. No unresolved product question remains.

## Commit Plan

- **Commit 1, after tasks 1–4:** `feat(i18n): add saved language catalogs and settings selector`
- **Commit 2, after tasks 5–8:** `feat(i18n): localize timing planning history and feedback`
- **Commit 3, after tasks 9–12:** `test(i18n): verify language persistence and live timing behavior`

These are implementation checkpoints, not commits executed by planning. Each checkpoint must compile and pass its affected checks; stage only the intended localization work.

## Tasks

### Phase 1: Preference, catalogs, and selection

- [ ] Task 1: Add a backward-compatible language preference and register its tests.
  - **Files:** new `src/core/language.ts`, new `tests/language.test.ts`; modify `src/core/stopwatch.ts` and `package.json`.
  - **Depends on:** none.
  - **Deliverable:** registry/type/validation/default from decision 1; `initialData()` and independent `restoreData()` handling; no schema/key bump or unrelated restoration repair. Register the new test file in the explicit `npm test` script immediately when created.
  - **Verify:** C1/C3/C8 — fresh, absent, all valid values, wrong types, unknown strings; preserve false flags, dark theme, sound selection, history/laps, completed/running/paused timer, and valid planning. Load the unchanged literal legacy fixture. Add a no-op preference update assertion at its eventual hook integration boundary rather than testing an invented core setter.
  - **Logging:** no new logs for valid choices or malformed persisted language; retain existing storage WARN/ERROR behavior.
  - **Source:** user language answers; `restoreData` and `initialData`; architecture persistence contract.

- [ ] Task 2: Establish the typed catalog and locale formatting boundary with registered unit tests.
  - **Files:** new `src/i18n/types.ts`, `index.ts`, `formatters.ts`, `ro.ts`, `en.ts`, `ru.ts`; new `tests/i18n.test.ts`; modify `package.json`.
  - **Depends on:** 1.
  - **Deliverable:** explicit `Messages` contract, stable catalog lookup, typed dynamic phrase parameters, Romanian invalid-language fallback, cached date/time/plural helpers. Start all three catalogs with the same required initial entries; task 3 completes the inventory. Date helpers accept a time-zone override for deterministic tests, while normal callers use the device zone. Avoid an ICU/template parser, `any`, native imports, storage imports, or core-to-i18n dependencies.
  - **Verify:** C7 — key/function-shape parity, nonempty outputs/no unresolved placeholders, fallback, parameter preservation including Cyrillic, and count boundaries 0/1/2/4/5/11/12/14/20/21/22/25/101/111. Test supported locale tags, selected-language date parts, and 24-hour time without depending on platform punctuation. Register tests immediately; refresh command discovery after the package script changes.
  - **Logging:** deterministic helpers and tests remain silent; missing translation keys are compile/test failures, not repeated runtime logs.
  - **Source:** user extensibility answer; `src/core/stopwatch.ts` formatting and current hard-coded history dates; Expo localization guide — Intl API.

- [ ] Task 3: Complete Romanian, English, and Russian catalogs against a source-string inventory.
  - **Files:** `src/i18n/types.ts`, `ro.ts`, `en.ts`, `ru.ts`, `tests/i18n.test.ts`; inspect every file under `src/app/` and `src/components/`, plus context/hook feedback.
  - **Depends on:** 2.
  - **Deliverable:** account for visible strings, accessibility labels/hints, validation/limits, sound names, storage failures, share text, and dynamic phrases. Keep original Romanian meaning; use concise natural English and Russian suited to mobile widths. Include complete count phrases, action default numbering, and the four stable sound IDs. Static branding/numeric notation and user text are explicitly exempt from translation extraction.
  - **Verify:** catalog completeness against the inventory and task 2 parity tests; representative interpolation and plural forms for all three languages. Review Russian/Cyrillic text and Romanian diacritics, with native-speaker review recorded as pending if unavailable.
  - **Logging:** no translation lookup or success logs; test diagnostics identify key/language without dumping saved user data.
  - **Source:** original request and language answers; current route/component copy; C6/C7.

- [ ] Task 4: Add Settings language selection and connect the application shell.
  - **Files:** new `src/hooks/useI18n.ts`; modify `src/components/SettingsSheet.tsx`, `src/app/_layout.tsx`, and catalog entries/tests as needed.
  - **Depends on:** 1, 2, 3.
  - **Deliverable:** accessible language radios using fixed autonyms, selected state, functional updates, immediate saved choice, and at least 44-point touch targets. Translate Settings headings/descriptions, all sound/duration controls, shell tabs/header/loading/storage warning, and web document language. Migrate sound labels and remove the now-unused `SOUND_CHOICES.label` in `src/core/sounds.ts` in the same task. Keep root hydration/font gates and existing layout/theme behavior. Catalog data must not become a controller dependency.
  - **Verify:** C2/C3 — switch all three languages without closing Settings; selected state, translated tabs/labels, document language, repeated selection no-op, rapid changes and persisted final choice. Keep sound IDs/durations and other preference values intact. Broader browser assertions are task 9.
  - **Logging:** retain existing warning/error handling; no preference-success, render, or document-language logs.
  - **Source:** manual Settings answer; existing `SettingsSheet` radio patterns; `useStopwatch.update`; `SOUND_CHOICES` consumers.

<!-- Commit checkpoint 1: tasks 1–4 -->

### Phase 2: Feedback and complete interface integration

- [ ] Task 5: Make transient feedback semantic and localize it without restarting timing/audio owners.
  - **Files:** new `src/core/notices.ts` for framework-free transient notice descriptors; modify `src/context/CronoContext.tsx`, `src/hooks/timerCompletion.ts`, `useTimerCompletion.ts`, `alertPlayback.ts`, `useAlertPlayback.ts`, `usePlanningRunner.ts`, `src/app/_layout.tsx`, route `notify` call sites, and notice/error renderers; update `tests/timerCompletion.test.ts`, `tests/alertPlayback.test.ts`, `tests/planningRunner.test.ts` where their contracts change.
  - **Depends on:** 1–4.
  - **Deliverable:** typed toast descriptors; semantic timer completion/audio-unavailable variants; semantic playback error code instead of stored Romanian copy. Atomically update all callers, test expectations, Settings preview feedback, timer/planning notices, and native accessibility announcements. Replace `_layout.tsx`'s `startsWith('Timpul a expirat.')` logic with explicit semantic handling or remove the obsolete filter after confirming its caller contract. Use stable callbacks reading the latest locale at event time; render existing notices using the current catalog.
  - **Invariants:** keep IDs, deduplication, priorities, completion acceptance, mute/background rules, deadlines, failure scoping, feedback expiration, and controller ownership unchanged. Keep `(handle) => clearTimeout(handle)` wrappers in all three hooks. Language-only updates must not trigger audio preference cancellation effects, recreate memoized runners, refresh a notice's lifetime, or replay an accessibility completion event.
  - **Verify:** C4/C5 — coordinator tests retain all prior races and assert semantic descriptors; fresh-language announcement on the next event; same event/error relabels without another event or play call; stale callbacks/errors stay rejected. Exercise failures while a sheet is open.
  - **Logging:** retain WARN/ERROR at existing audio/runtime failure boundaries with stable technical codes; do not log translations, action names, history, or routine events.
  - **Source:** architecture Display and Device Behavior; current notice/coordinator APIs; November 5 real-timer patch.

- [ ] Task 6: Localize stopwatch, timer, reusable sheets, and timing notices.
  - **Files:** `src/app/index.tsx`, `timer.tsx`; `src/components/StopwatchFace.tsx`, `TimerFace.tsx`, `LapList.tsx`, `Sheet.tsx`, `TimerCompletionNotice.tsx`, `TimingNotices.tsx`; catalogs as required.
  - **Depends on:** 3–5.
  - **Deliverable:** complete screen copy, buttons, input labels/placeholders, reset/cancel confirmations, lap statistics/counts/limits, generic close/cancel accessibility labels, and completion/Stop feedback. Keep timer/stopwatch numeric formats, input behavior, focus handling, confirmation requirements, and existing timing transitions.
  - **Verify:** C2/C4/C5/C7 — all stopwatch/timer states and shared confirmations in three languages; no remaining hard-coded Romanian UI phrases in these modules; exercise lap/count and timer validation boundaries. Existing Romanian behavior/tests retain their default labels.
  - **Logging:** no new logs for routine actions or translation; existing recoverable error feedback remains visible.
  - **Source:** original request; existing screens and generic Sheet; project mobile/UI/state rules.

- [ ] Task 7: Localize planning while preserving controlled drafts and saved names.
  - **Files:** `src/app/planning.tsx`, `src/components/ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx`, `PlanningRunCard.tsx`, `PlanningNotice.tsx`; catalogs/tests as required.
  - **Depends on:** 3–6.
  - **Deliverable:** translate list/empty states, editor titles/placeholders/errors, limits, move/delete controls, time units, run states and counters, start/replacement/discard/reset confirmations, and boundary/final notices. New default action names use the current catalog only at creation. Retain saved names across language changes and preserve controlled draft IDs/order/durations, selection, and editability rules within each editor flow.
  - **Verify:** C4/C6/C7 — in each language, edit an unsaved mixed-script draft, open discard confirmation, continue editing without losing values, then save/discard as before. Change language through Settings after saving and reopen the template; names remain exact. Cover duplicate/delete/reorder, generated next action, active/paused execution, automatic next action, and reload.
  - **Logging:** no routine schedule/name/input logs; keep existing warnings/errors and semantic notices.
  - **Source:** user languages; controlled editor state; pure planning bounds and cumulative transition contract.

- [ ] Task 8: Localize history and sharing, migrating the core presentation helper atomically.
  - **Files:** `src/app/history.tsx`, `src/core/stopwatch.ts`, `src/i18n/formatters.ts`, catalogs, `tests/stopwatch.test.ts`, `tests/i18n.test.ts`.
  - **Depends on:** 2, 3, 5, 6.
  - **Deliverable:** translate list/empty/details/statistics/deletion, recent label, lap counts, date/time, share title and content, copied/failure notices. Move `sessionText` into the translation formatting layer and migrate both imports/tests in the same change. Supply the selected language at sharing time; keep native Share, web Share, clipboard fallback, and AbortError behavior. Do not change saved sessions or introduce a core-to-presentation dependency.
  - **Verify:** C6/C7/C8 — exact duration/lap numbers in every language; date parts and 24-hour time; clipboard/share title/content assertions, dismissed sharing without false failure, and deletion confirmation. Close details, change language through Settings, and reopen the same unchanged session. Preserve the existing Romanian total/lap assertions in their new helper location.
  - **Logging:** retain visible share failure feedback without logging session contents or clipboard payloads.
  - **Source:** `sessionText`, its two consumers, history native/web branches, literal legacy session.

<!-- Commit checkpoint 2: tasks 5–8 -->

### Phase 3: Regression coverage, mobile checks, and documentation

- [ ] Task 9: Add browser language persistence and complete-flow coverage with the real legacy fixture.
  - **Files:** new `tests/e2e/localization.spec.ts`; extend `tests/e2e/helpers.ts` only where reusable; preserve existing Romanian test defaults and `tests/fixtures/app-v1-before-planning.json` bytes.
  - **Depends on:** 4–8.
  - **Deliverable:** parameterized three-language flows for settings/reload, tabs, all four screens, editor/confirmations, notices, history/share, validation, and language/theme independence. Observe page errors before navigation. Reuse the literal fixture through the real hydration path, assert false preferences/dark theme/history/completed timer, switch language, reload, and assert preservation.
  - **Verify:** C1/C2/C3/C6/C7/C8; unsupported/missing language with an English/Russian browser setting still defaults to Romanian; last rapid selection persists; translated accessible names/selected radio state and `document.documentElement.lang` agree. Use seeded data for hard-to-reach count bounds rather than creating hundreds of laps. Avoid arbitrary sleeps and locale-dependent selectors that only work before the switch.
  - **Logging:** Playwright assertions/traces and page-error checks only; no stored payload dumps.
  - **Source:** user manual/default answer; existing e2e helpers and literal fixture; Requirements Reconciliation combinations.

- [ ] Task 10: Prove language changes preserve live timing and pending/playing sound.
  - **Files:** `tests/e2e/localization.spec.ts`, `tests/e2e/realTimers.spec.ts`; coordinator tests only if additional isolated race coverage is necessary.
  - **Depends on:** 5–9.
  - **Deliverable:** deterministic-clock coverage of concurrent stopwatch/timer/planning, pause/resume, locale switch around a deadline, foreground/background catch-up, current notice/error translation and its unchanged expiration. Extend real browser timer scenarios with a language change while preview is pending and while playing; assert actual play count, natural configured expiry, Stop, and no `Illegal invocation` or unhandled rejection. Preserve all four existing real-timer regressions.
  - **Verify:** C4/C5 — run/deadline identities and domain snapshots remain correct; no lost completion, duplicate play/announcement event, reprioritization, restart, or silent-catch-up regression. For actual media tests keep native timer methods and actual Audio play/pause intact; unchanged bundled WAV-byte routing may isolate Metro transfer delay as in the existing fixture. Preserve separate real served-asset decoding tests. Use a 5-second representative preview; retain existing 15/30-second controller coverage without lengthening the suite unnecessarily.
  - **Logging:** page errors fail tests; retain existing event-scoped failure diagnostics. No production timer/translation tracing.
  - **Source:** existing real-timer suite and November 5 patch; one playback owner and coordinator lifecycle contracts.

- [ ] Task 11: Verify compact layouts, both themes, and mobile accessibility for the three languages.
  - **Files:** `tests/e2e/localization.spec.ts`; affected component styles only when evidence shows clipping/overlap; `src/theme.ts` only if necessary to use existing tokens correctly.
  - **Depends on:** 6–10.
  - **Deliverable:** cover all three languages × light/dark at 390px; representative long Russian Settings/editor/notice/confirmation/tab content at 320px and 430px, plus the existing 1024px web preview. Check scrolling, bottom safe area, full button labels, focus, and 44-point targets. Allow wrapping/flexible heights rather than shrinking text to hide overflow; preserve list virtualization and keyboard behavior.
  - **Verify:** C2/C6 — inspect representative screenshots and assert actual control/layout bounds, not only body scroll width. On available iOS/Android runtimes, check Cyrillic/diacritics, large system text, keyboard/editor scrolling, VoiceOver/TalkBack labels, date/plural examples, saved locale after relaunch, and audible timer/schedule completion. Record unavailable native/device/speech review as pending with the exact platform; web/export success is not native verification. Avoid claims that app language forces a particular speech voice.
  - **Logging:** test/manual evidence only; no new production layout logs.
  - **Source:** AGENTS mobile-first/cross-platform instructions; shared palettes/fonts; measured TTF glyph availability.

- [ ] Task 12: Complete the documentation checkpoint and final verification.
  - **Files:** `README.md` and relevant documentation through `$aif-docs`; this plan's task/evidence ledger. Do not silently rewrite architecture/rules/description ownership artifacts; route any needed context/map correction to its owner workflow and preserve prior local edits.
  - **Depends on:** 1–11.
  - **Deliverable:** English usage instructions for Settings language selection, Romanian default, persistence/offline operation, supported languages, preservation of user text, shared results, testing limits, and adding a language (registry, typed catalog, plural/date tests, fonts, mobile layout review). Document any pending device/native-speaker checks precisely. Review the final diff for leftover user-facing hard-coded Romanian strings and translation-based business logic; allow explicit brand/data/numeric/technical-log exemptions.
  - **Verify:** refresh command catalog after manifest changes, then run lint, typecheck, all registered Node tests, targeted localization and real-timer tests, the complete browser suite once against final source, and fresh Android/iOS/web export. Run browser suites sequentially. Keep current 45-second test limits, one worker, no retry/timeout relaxation, and loopback identity-encoding setup. Record actual totals, commands, revision/dirty-state identity, and native limitations. Fix failures before checking tasks complete.
  - **Logging:** warnings/errors only in application code; normal command/test output supplies verification evidence. No raw user-session data in reports.
  - **Source:** user tests/docs/logging preferences; AGENTS mandatory lint/typecheck and relevant UI/core checks; command discovery below.

<!-- Commit checkpoint 3: tasks 9–12 -->

## Command Provenance and Verification

Discovery was run read-only from repository root using the installed AI Factory CLI (`ai-factory commands --json`, through its Windows Node entry point). Catalog revision SHA-256: `a2bfcc72b13c0813af89dc3a119b9375d36375a75ffd025d472969d65604c6ba`.

- Source `package.json` SHA-256: `a85c779b5e417bdbe98dc06f75ee9869dcd62f593ce69d399327a35dba785d21`.
- Lockfile `package-lock.json` SHA-256: `9faa54bacbf3c0741e5d586438bd147df17dc598e460c03cf78bf64029609766`.
- Every selected command has CWD `.`. Discovery status `declared` / `not_run` does not establish feature validation. Refresh these hashes/catalog after adding test files to the explicit test script.

| Command ID | Command | Implementation use |
|---|---|---|
| `package.json#/scripts/lint` | `npm run lint` | Required lint gate and final verification. |
| `package.json#/scripts/typecheck` | `npm run typecheck` | Required type gate, including all catalog signatures. |
| `package.json#/scripts/test` | `npm test` | All explicit Node files, including newly registered language/i18n tests. Node.js 24+ required. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/localization.spec.ts tests/e2e/realTimers.spec.ts` | Focused language/lifecycle verification after implementation. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e` | Complete final browser regression run. |
| `package.json#/scripts/export` | `npm run export` | Fresh Android/iOS/web bundles; not an EAS build or device check. |

In this workspace, use Windows Node/npm via `cmd.exe /d /c "cd /d D:\app_crono && npm run <script>"`; Linux Node is unavailable. Use npm, not Bun. Do not launch overlapping browser runners or write temporary scripts under directories Playwright cleans.

Documentation consulted for this plan: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [Expo localization guide — Intl API](https://docs.expo.dev/guides/localization/#intl-api), and [React Native 0.86 accessibility](https://reactnative.dev/docs/0.86/accessibility). Expo documents `Intl` support on Hermes; this supports the dependency-free formatting choice. During implementation, recheck the installed major and the specific current API page before changing any Expo/React Native integration.

## Completion Evidence

Planning checks on 2026-11-06: all 12 pending tasks have file scopes, prior-task dependencies, deliverables, verification, logging, and source evidence. The exact Original Request is preserved, there is one active plan representation, and command-source hashes still match. The selected planning branch is at `dd576e4e4f586e4a21f0b4882cd37d8741009835`; application files and the Git index are unchanged, with only this plan untracked. `npm run lint` and `npm run typecheck` both passed on that baseline. Meaning preservation: PASS.

Feature implementation, localization tests, new exports, and native checks have not run for this plan. Add dated implementation evidence here as tasks are completed; historical theme/timer results do not establish localization acceptance.
