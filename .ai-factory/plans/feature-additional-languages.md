# Implementation Plan: Spanish, French and German

Branch: `feature/additional-languages`
Created: 2026-11-07
Mode: full
Status: software implementation and available verification complete; 8/9 tasks complete. Task 8 remains pending for native device acceptance.

## Original Request

poti te rog sa mai adaugi limbi spaniola, si care sunt mai populare inca doua

## Settings

- Testing: yes — registered catalog/locale/persistence/notification tests, browser integration and compact-layout coverage, plus separately recorded native acceptance.
- Logging: minimal — retain WARN/ERROR at unexpected storage/platform failures; no routine language-selection, rendering, success, or saved user-text logs.
- Docs: yes — mandatory `$aif-docs` checkpoint after implementation; preserve the existing English documentation structure and historical verification records.
- Planning depth: full, reusing the user's earlier explicit detailed-plan, tests, documentation and minimal-logging preferences.
- Add exactly three interface languages to the existing Romanian/English/Russian support: Spanish (`es`, `Español`, `es-ES`), French (`fr`, `Français`, `fr-FR`) and German (`de`, `Deutsch`, `de-DE`). Append them in that order, retaining existing IDs, autonyms and locales.
- Selection rationale/status: Spanish is explicitly requested. The user delegated the other two choices without defining a popularity metric. French/German are the disclosed recommendation for European reach, not a claim that they are the world's two largest languages or a recorded user answer. An optional question offered this pair versus Mandarin/Hindi; no response had been received when drafting. Revise the pair, locales and affected tasks if the user chooses differently before implementation.
- Evidence for that recommendation: the European Commission's [2024 Eurobarometer article](https://luxembourg.representation.ec.europa.eu/actualites-et-evenements/actualites/new-eurobarometer-shows-europeans-positive-attitude-towards-language-learning-2024-05-21_en), published 21 May 2024 and checked 7 November 2026, identifies French and German as the most spoken foreign languages in the EU after English. This is European survey evidence, not app-market analytics or a global ranking.
- Keep manual selection in Settings, Romanian as the default/fallback, immediate application and saved preference. Translate built-in copy completely; preserve user-written names, numeric durations, timestamps, semantic IDs and selected sound IDs.
- Reuse the current typed catalogs, `Intl` helpers, shared update/persistence boundary, semantic themes and bundled Inter fonts. No new dependency, schema version, storage key or separate language store is indicated.
- This invocation creates the plan and local feature branch only. Implementation, dependency installation, commits, push, merge, PR creation and native/cloud build submission are not included.

## Requirements Reconciliation

Authority: the current request expands the supported languages. Earlier accepted manual-selection/Romanian-default behavior and the current AGENTS/base/architecture contracts remain authoritative for persistence, localization boundaries and side effects. Existing three-language lists describe the baseline being extended; they are not a restriction on this request. French/German are an explicitly disclosed planning recommendation under the user's delegated choice.

| Decision | Source and relationship | Verification |
|---|---|---|
| Add Spanish and two additional popular languages | Original Request; selection rationale in Settings | Six complete selectable catalogs; no untranslated runtime fallback for a registered new ID |
| Preserve manual Romanian default and registered-ID validation | Earlier user answers; `src/core/language.ts`; AGENTS — Adding a Language | Missing/invalid values remain Romanian even under a new browser/device locale; all six exact IDs restore |
| Extend the existing translation contract | `src/i18n/types.ts`, `index.ts`, `plurals.ts`, `formatters.ts` | Top-level and nested copy parity, parameter preservation, exact new-language plural/date/share expectations |
| Preserve clocks, drafts and saved user text | AGENTS — Project Workflow; architecture — User Actions and Persistence / Display and Device Behavior; `useI18n.ts`, `useStopwatch.ts` | Accepted language updates change only the preference; unchanged selection is a no-op; running clocks and open editor text retain identity |
| Translate future OS content without changing timing or audio policy | `src/i18n/notificationContent.ts`, `useSystemNotifications.ts`, `notificationCoordinator.ts`, `audio/notificationSounds.ts` | New content/fingerprints use the latest language; semantic event IDs, deadlines, stable channels and independent owners retain their contracts |
| Retain real saved-data compatibility | `tests/fixtures/app-v1-before-planning.json`; `restoreData` and existing localization journeys | Literal fixture through hydration, selection, unrelated save and reload; exact legacy clocks/history/false preferences preserved |
| Retain mobile usability and honest platform evidence | AGENTS — Adding a Language; Settings wrapping radios; bundled Inter in `_layout.tsx` | Six reachable choices, compact translated screens in both themes, final-catalog glyph checks; native speech/font/accessibility results recorded separately |

Supported combinations are bounded to the language extension. A language change updates presentation and future notification content; it does not start, stop, reset or translate a user's existing activity.

| ID / accepted input | Persisted state | Output / next transition | Side effects and invariants | Verification scenario |
|---|---|---|---|---|
| L1: missing/invalid language, including unsupported regional codes or different case | Restore `ro` independently of other valid data | Romanian UI regardless of device/browser locale | No automatic OS-language detection, data loss or permission prompt | Use a new browser locale plus missing/invalid saved choice; restore the actual legacy fixture |
| L2: select any registered ID, repeat it, then reload | Save exact `ro/en/ru/es/fr/de`; repeated selection retains the no-op boundary | Immediate catalog, checked autonym and web document language; selection survives reload | Preserve ordered writes and false preferences; no second store | Rapid `es → fr → de` and reverse switching; repeat the final choice and reload |
| L3: new language with counts, dates and shared history | Saved timestamps, lap totals and user text unchanged | Correct phrases, locale month/date and existing 24-hour time | No translation import in timing cores or numeric timing changes | Counts 0/1/2/21 and representative larger values; fixed UTC date/time and actual session sharing |
| L4: new language while a timer/schedule is running or paused, an editor is unsaved, or audio is pending/playing | Only the language preference changes, apart from ordinary timing transitions | Existing controls/notices relabel; existing drafts remain editable | Stable run IDs/deadlines, exact paused remainder, audio ownership and notice lifetime; no duplicate completion | Switch during independent clocks and a mixed-script draft; observe one boundary sound, Stop and silent background catch-up |
| L5: native future requests with new language, opt-in/mute/authorization states | Timing snapshots, sound IDs and saved booleans unchanged | Localized future title/body/channel display names when supported | Content fingerprint and physical request IDs may change; semantic event IDs/due times/channel IDs stay stable. No permission request from language selection | Inject native adapter; change language during delayed registration; retain only current-language future requests and no retrospective backlog |
| L6: all six choices and new translations in both themes at compact sizes | Language/theme selections retained | Visible labels, reachable radio controls and usable sheets | Existing safe areas, text scaling and keyboard behavior; no route remount | New languages at 320/390px, representative 430/1024px, enlarged web text and inspected screenshots; native checks separately |
| L7: actual version-1 legacy data with new language and unrelated save/reload | Retain normalized baseline plus the explicit preference change | Existing history/clocks/names remain usable in selected language | Fixture bytes unchanged; no migration or no-op completion/audio churn | Hydrate literal fixture, select each new ID, save via a normal UI action and reload |

Meaning preservation: PASS — the plan adds three interface languages while retaining the accepted selection, data and timing contracts. Its popularity criterion and recommended pair are qualified rather than presented as user-confirmed or globally ranked facts.

## Codebase Evidence and Implementation Decisions

1. `src/core/language.ts` derives `AppLanguage` from `LANGUAGES`; `Preferences.language` already uses that type. `src/i18n/index.ts` currently fixes its catalog map to `ro/en/ru`. Register the new IDs and complete catalogs atomically so lookup and `countPhrase(AppLanguage, ...)` remain type-correct; do not leave an intermediate registered-but-missing catalog.
2. Add `src/i18n/es.ts`, `fr.ts` and `de.ts` as complete `Messages` objects. Include system-notification and accessibility copy, four count functions, all three time-unit labels, stable `classic/bell/digital/gong` labels and share interpolation. Use consistent friendly UI terminology and natural concise wording. Do not satisfy completeness by spreading an English catalog. Independent native-speaker review, if unavailable, remains a disclosed quality limitation.
3. `plurals.ts` builds `Intl.PluralRules` from registry locales; `formatters.ts` caches locale dates/times and keeps `hourCycle: 'h23'`. Reuse these paths; add explicit Spanish/French/German expectations, including French zero and relevant large-count forms, instead of adding speculative language-specific branches. Preserve 24-hour time, core duration formatting and user-name interpolation.
4. `SettingsSheet.tsx` already maps the registry into wrapping 44px-minimum radio choices inside a scrolling Sheet. Validate six choices and long copy first; adjust existing semantic styles only for a reproduced fit/reachability problem. Preserve stable keys, accessible checked state and `useI18n().setLanguage`.
5. Existing Inter 400/500/600/700/800 assets were inspected read-only and report Spanish/French/German language coverage. This is preliminary evidence: inspect final catalog characters, accents/punctuation, function outputs and rendered screenshots; it does not prove native font scaling or screen-reader behavior. No new font is currently justified.
6. `tests/language.test.ts` currently rejects `de` and hard-codes old restoration loops. Replace that unsupported example with an ID that remains unsupported, cover the registry, and retain invalid case/region tests. `timeUnits.length === 3` in `i18n.test.ts` is the hours/minutes/seconds contract and must remain three.
7. Existing localization loops cover all registered languages at 390px, but extra compact/wide layouts are Russian-only. Other fixed loops remain in `notifications.test.ts`, `notificationCoordinator.test.ts` and `tests/e2e/notifications.spec.ts`. Extend real behavior coverage, including nested sound/unit label values; empty or copied placeholders must not be hidden by structural parity alone.
8. Language changes already refresh future notification content through accepted updates. Physical registration identity is intentionally different from semantic event/deadline identity. Extend injected tests for translated content and delayed work; keep permission, delivery, sound priority, channel IDs and scheduling precision policy unchanged in this feature.
9. Use the literal legacy fixture, not a replacement made from current `initialData()`. Compare against its existing normalized baseline so absent optional defaults are handled honestly while clocks/history/false preferences and user text remain exact.
10. Current `master` contains notification work but not the duration-wheel implementation. Plan against the actual controls on this branch. If upstream UI changes before implementation, reconcile helper/selector changes against that source without merging another feature as part of localization or dropping existing assertions.

## Baseline, Commands and Ownership

- Started from clean native Windows Git `master` at `e77476a` (merged notification PR #5). `git pull --ff-only origin master` reported already up to date; created `feature/additional-languages` from that base. Existing feature branches and the separate notification checkout were left intact.
- Protect the existing application/config/tests/context files; this command owns only the new plan. DESCRIPTION/ARCHITECTURE/AGENTS/README changes are future implementation/documentation tasks, not planning edits. No roadmap, top-level RULES, research artifact or skill-context override exists; no milestone or research snapshot is invented.
- Direct source inspection plus two read-only focused exploration agents supplied module/test evidence. Task-management tools are unavailable, so this file is the durable task ledger.
- Read-only discovery: installed `ai-factory commands --json`, CWD `.`. Catalog `revision_sha256: 33a77fae797fdd1d3fbb758a78a5ef4c738195f015d7cd42902baaab8ccfc2a1`; source `package.json` SHA-256 `d6b4865f8a782ba86ca9ad270688d7e21fb7db6f5d02c20b7b9b51edea252983`; lock SHA-256 `c7122d40b85602c1165cfb4468a9ab0749ec6324f503d2ba871d68dc7f5183d1`. No command ambiguities. Refresh these identities after any manifest/lock change.
- Planned command IDs, all CWD `.`: `package.json#/scripts/lint` → `npm run lint`; `/scripts/typecheck` → `npm run typecheck`; `/scripts/test` → `npm test`; `/scripts/test:e2e` → `npm run test:e2e`; `/scripts/export` → `npm run export`. Use working Windows Node/npm from WSL (`D:\app_crono`); direct TypeScript tests require Node 24+.
- Focused browser invocations use the existing `test:e2e` script with actual spec paths, particularly `tests/e2e/localization.spec.ts`, `notifications.spec.ts`, `realTimers.spec.ts` and relevant timer/planning/history/theme journeys. Retain existing Chrome/device/timeout/retry/transport settings and verify the server serves the intended checkout. A declared catalog command is not a result; record actual exit codes and source identity when executed.
- Planning lint/typecheck results are recorded below. Previous three-language browser/export results are historical evidence only; this plan has not added or verified the three new languages.
- No dependency install or native-config change is planned. Before any later change touches an Expo/EAS/React Native API, read the actual Expo major and matching versioned docs/index required by AGENTS. Any justified dependency change must use `npx expo install` and refresh command/source evidence.

## Commit Plan

- **Commit 1, after tasks 1–3:** `feat(i18n): add Spanish French and German interface catalogs`
- **Commit 2, after tasks 4–6:** `test(i18n): cover six-language persistence and timing integration`
- **Commit 3, after tasks 7–9:** `docs(i18n): document expanded languages and verified support`

These are proposed checkpoints, not authorization to commit/push. Keep each checkpoint type-correct and covered by its registered checks. Missing native devices remain pending rather than being marked complete for a commit group.

## Tasks

### Phase 1: Complete catalogs and shared language selection

- [x] Task 1: Register three complete typed catalogs without breaking existing language selection.
  - **Files:** `src/core/language.ts`, `src/i18n/index.ts`; new `src/i18n/es.ts`, `fr.ts`, `de.ts`; the directly affected assertions in `tests/language.test.ts`.
  - **Depends on:** none.
  - **Deliverable:** add exact ID/autonym/locale triples from Settings and complete `Messages` catalogs in one type-correct change. Retain Romanian default, old IDs, all interpolation/function signatures, sound keys and existing manual setter. Update the `de`-is-invalid assertion in the same task; use an actually unsupported ID instead. Do not add a second store or schema migration.
  - **Verify:** immediate registered language/catalog tests and typecheck; all six lookups are stable, keys/types agree, nested labels and dynamic messages are populated, unknown values still use Romanian. If new test files become necessary, register them immediately and refresh command discovery.
  - **Logging:** catalogs, registry and normal selection remain silent; existing WARN/ERROR boundaries only.
  - **Source:** Original Request and recommended pair; L1/L2/L3; AGENTS — Adding a Language; codebase decisions 1/2/6.

- [x] Task 2: Add explicit locale, plural, sharing and restoration regression expectations.
  - **Files:** `tests/language.test.ts`, `tests/i18n.test.ts`; `src/i18n/plurals.ts` or `formatters.ts` only for a demonstrated incompatibility with the existing generic path.
  - **Depends on:** 1.
  - **Deliverable:** cover every registered language in legacy and running/paused restoration. Add exact expected new-language phrases for all four count functions at 0/1/2/21 and representative larger values; cover French zero and any relevant plural category using the chosen actual locales. Add new month/date and localized share expectations with the existing UTC timestamp; retain `23:07`, numeric lap totals, parameter text and old-language assertions. Check nested sound/unit strings as well as top-level parity.
  - **Verify:** `npm test`; accepted exact IDs versus unsupported/case/region inputs, six-language restore/serialize round trips, real fixture invariants, meaningful phrase expectations, no placeholder or missing nested value. Keep the three time units unchanged.
  - **Logging:** named assertion diagnostics only; no runtime plural/date/translation logs.
  - **Source:** L1/L3/L7; `language.test.ts`, `i18n.test.ts`, `plurals.ts`, `formatters.ts`; decisions 3/6/7/9.

- [x] Task 3: Verify six-language Settings, final font glyphs and compact translated layouts.
  - **Files:** `tests/e2e/localization.spec.ts`; existing `src/components/SettingsSheet.tsx` or shared styles only if actual six-language screenshots expose a defect; final catalogs for corrected wording.
  - **Depends on:** 1, 2.
  - **Deliverable:** retain the existing wrapping selector and prove all six autonyms are reachable and selected correctly. Extend new-language compact cases in both themes at 320/390px, with representative 430/1024px coverage. Check Settings, timing controls, history/detail, confirmations and schedule editor copy, including long German labels, French punctuation and Spanish accents. Inspect final-catalog static/function-output glyph coverage against all five loaded Inter weights and inspect screenshots. Keep numeric bounds and touch targets.
  - **Verify:** relevant browser cases with no page errors, horizontal overflow or hidden/unreachable controls; selected language survives theme/size changes. Check larger web text/reduced motion separately from native OS text scaling. If current layouts already fit, retain production styles rather than redesigning the selector.
  - **Logging:** browser/assertion failure diagnostics only; no layout, selected-value or user-name logs.
  - **Source:** L2/L6; Settings/Sheet/font loading source; AGENTS mobile and language rules; decisions 4/5/7.

<!-- Commit checkpoint 1: tasks 1–3 -->

### Phase 2: Persistence, native-content projection and live behavior

- [x] Task 4: Extend notification content and reconciliation coverage to the new languages.
  - **Files:** `tests/notifications.test.ts`, `tests/notificationCoordinator.test.ts`, `tests/e2e/notifications.spec.ts`; `src/i18n/notificationContent.ts` only for a reproduced generic integration gap, with copy corrections in the new catalogs.
  - **Depends on:** 1, 2.
  - **Deliverable:** replace closed three-ID loops with registry-aware coverage where appropriate. Assert new timer/action/final title/body and sound labels preserve user text. Exercise a rapid sequence containing `es/fr/de` while a native registration result is delayed; only current-language future requests remain accepted. Retain semantic event/run IDs, due times, stable sound/channel IDs, opt-in/mute booleans and independent owner behavior. Extend the unsupported web Settings explanation to all six languages without requesting browser permission.
  - **Verify:** registered notification/coordinator tests and the browser notification spec. Assert changed content/fingerprints without falsely requiring equal physical request IDs; language selection does not request OS permission or create elapsed/duplicate alerts. Cover representative enabled, muted, denied/unsupported states through existing adapters, without changing permission or precision policy.
  - **Logging:** retain existing failed-native-operation WARN/ERROR only; no routine schedule, language, names or payload logging.
  - **Source:** L2/L5; `notificationContent.ts`, `useSystemNotifications.ts`, coordinator and stable channel contract; decisions 7/8.

- [x] Task 5: Exercise new saved selections and the literal legacy fixture through the application.
  - **Files:** `tests/e2e/localization.spec.ts`, relevant `tests/e2e/helpers.ts` localized selectors; `tests/fixtures/app-v1-before-planning.json` remains read-only.
  - **Depends on:** 1, 2, 3.
  - **Deliverable:** expand rapid selection/reload to the new IDs, including a final new-language choice. Verify repeated selection does not create an effective update or write. Load the existing legacy fixture through real hydration, select each new language, perform an unrelated normal save and reload; retain exact normalized clocks/history/false preferences and user-entered text. Add a non-Romanian browser locale to missing/invalid-choice cases to prove the manual default. Use actual localized UI controls in helpers, preserving the duration widget currently present on the branch.
  - **Verify:** browser persistence/history/share journeys; default/fallback, checked radio/document language, unchanged completed timer identity/audio and legacy values, expected saved language, and independent Settings choices. Do not rewrite the fixture or seed a replacement after reload to make persistence pass.
  - **Logging:** test failure/storage assertions only; no routine application storage writes or saved payload logs.
  - **Source:** L1/L2/L7; literal fixture and existing `seed`/`stored` helpers, `useI18n` no-op boundary; decisions 9/10.

- [x] Task 6: Verify new-language switching during live clocks, drafts, notices and playback.
  - **Files:** `tests/e2e/localization.spec.ts`, `tests/e2e/realTimers.spec.ts`; relevant sound/timer/planning cases and helpers only where needed for reusable localized interactions.
  - **Depends on:** 1, 2, 4, 5.
  - **Deliverable:** include each new language in supported live-flow coverage: independent running/paused clocks, unsaved mixed-script action names, protected templates and discard/continue/reorder behavior. Relabel existing timer/planning/failure/session notices without extending their lifetime. Observe unchanged pending/playing audio through a real-browser-timer language change, one playback per actual boundary, working Stop, and silent overdue catch-up. Saved action names remain unchanged; newly created default names use the current catalog.
  - **Verify:** existing domain snapshots/run IDs/deadlines and paused remainder remain exact apart from ordinary accepted timing transitions; no remount or duplicate alerts. Retain deterministic timing cases and at least one real-timer path. Do not raise timeouts/add retries or drop reload/audio assertions to hide a failure.
  - **Logging:** existing page-error/media-failure diagnostics only; no routine selection, timing or audio-success logs.
  - **Source:** L3/L4/L5; current localization and real-timer regressions; architecture — Display and Device Behavior; decisions 8/10.

<!-- Commit checkpoint 2: tasks 4–6 -->

### Phase 3: Final verification, native acceptance and documentation

- [x] Task 7: Run registered verification and all-platform exports on an identified final source.
  - **Files:** source/tests only for reproduced scoped failures; manifest only if meaningful new test registration was needed; evidence in this plan.
  - **Depends on:** 1–6.
  - **Deliverable:** refresh command/catalog identities as needed; run lint, typecheck, full registered Node tests, full browser suite and Android/iOS/web exports from the intended checkout. Bind results to the actual revision plus uncommitted-source fingerprint. Distinguish a clean full run from failed cases plus isolated reruns; investigate failures before fixing. Preserve unrelated notification, storage and duration-wheel work.
  - **Verify:** actual exit codes/counts, unchanged deadlines/retries, final six-language coverage, no added dependency/config requirement without evidence, correct current server/project and no source drift. Browser/export results do not pass native speech/delivery checks.
  - **Logging:** command/assertion failure diagnostics; application WARN/ERROR policy unchanged.
  - **Source:** AGENTS/base validation; command catalog above; L1–L7.

- [ ] Task 8: Record native language/accessibility acceptance or explicit unavailable cases.
  - **Files:** this plan and implemented language/UI integration only for verified defects; directly affected registered tests where useful.
  - **Depends on:** 1–6. Native checks may run independently of task 7 when a runtime is available.
  - **Deliverable:** identify the actual Android/iOS device, OS, app binary/profile and loaded source. Check six reachable language choices, saved selection after restart, native larger text and both palettes, translated keyboard/sheets, localized accessibility labels/announcements and retained user text/clocks. For an available notification-capable binary, inspect future localized notification/channel content without treating browser tests as OS delivery evidence. Record native-speaker review availability separately; do not claim verified translation quality or OS speech voice selection from automated parity tests.
  - **Verify:** pass/fail/pending per platform and relevant case. Reproduce any defect before a fix, rerun that same case and affected registered checks, and bind updated evidence to the source actually running. If no appropriate device/binary exists, leave unavailable native cases and this task pending, state that limitation, and continue independent documentation. Record unavailable independent linguistic review as a separate limitation; it does not invalidate observed native cases. No cloud build submission is automatic.
  - **Logging:** actionable platform failure WARN/ERROR only; no saved user text or credentials.
  - **Source:** L4/L5/L6; AGENTS — Adding a Language and mobile validation; task 7 source-bound evidence.

- [x] Task 9: Complete the language-support documentation checkpoint and factual context updates.
  - **Files:** `README.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, and this plan's progress ledger.
  - **Depends on:** 7 and actual available/pending results from 8.
  - **Deliverable:** invoke `$aif-docs` for the existing usage documentation. List all six supported languages/autonyms, manual Settings selection, Romanian default and retained saved-data behavior. Update only factual language unions/catalog maps/latest-plan references after implementation; preserve notification behavior, historical verification records and unrelated technical findings. Record current check results and native/linguistic limitations. Keep the existing README organization; no new report, roadmap or rules artifact is required.
  - **Verify:** labels/IDs/locales match implemented registry/catalogs; internal links resolve; no stale three-language support claim is presented as current. Meaning preservation and readability checks precede completion; only performed tasks are checked off.
  - **Logging:** no new runtime logs; concise documentation note for unavailable native/linguistic validation.
  - **Source:** retained Docs: yes preference; L1–L7; `$aif-docs` ownership and current support statements.

<!-- Commit checkpoint 3: tasks 7–9 -->

## Completion Criteria

- Spanish, French and German are complete selectable languages alongside Romanian, English and Russian, subject to a later user choice changing the recommended pair before implementation.
- Manual Romanian default, exact registered-ID validation, saved selection and all language-dependent presentation/notification content follow the existing boundaries.
- Real version-1 data, user names, clocks, drafts, audio, themes and notification event identities retain their contracts.
- Registered checks and exports have actual final-source evidence; native and independent linguistic checks are either observed or explicitly pending.
- No checkbox, documentation claim or release action treats an unavailable check as passed. Planning alone does not implement or publish the feature.

## Planning Validation

- Fresh `npm run lint` and `npm run typecheck` passed through Windows npm in `D:\app_crono` on the unchanged application source.
- Plan-integrity checks passed: exact Original Request; nine unique unchecked tasks; ordered dependencies; required file/deliverable/verification/logging/source fields; canonical branch-matching plan path; no sibling full/ultra collision; and whitespace. All 331 pre-existing tracked files match their pre-plan SHA-256 baseline. Meaning preservation: PASS. The optional language-pair question has no recorded answer; French/German remain the disclosed draft recommendation under the user's delegated choice.
- Only this plan was added. Context, application code, tests, dependencies, native configuration, existing feature branches and the running preview were not changed by planning. The feature branch was created from up-to-date `master`; no commit, push, merge, PR or cloud build occurred.
- Implementation started after the explicit `$aif-implement` request. Planning results above remain historical; implementation evidence follows below.

## Implementation Evidence

- Task 1 in progress: complete catalogs and atomic registration. Native Windows Git confirms the intended branch and no unrelated source edits; Linux Git's CRLF-only differences are ignored.
- Task 1 complete: three standalone typed catalogs and registry/map entries added atomically; Romanian fallback retained. `npm test`: 92/92 passed; lint and typecheck exit 0. Task 2 in progress.
- Task 2 complete: exact phrases for four counters at 0/1/2/21/101/1000000, UTC dates/time, shared totals, nested labels and all-six legacy/running/paused round trips. `npm test`: 93/93 passed; lint/typecheck exit 0. Task 3 in progress.
- Task 3 complete: 39 layout cases passed (2.7min), plus six focused 320px cases passed after adding Timer/history detail assertions (44.8s). Both themes, 320/390/430/1024px and 130% web text/reduced motion covered. Inspected Spanish Settings/history, German editor and French confirmation screenshots. All 108 printable catalog-source characters (a superset of static and generated copy characters) exist in Inter 400/500/600/700/800. Lint/typecheck exit 0; existing production styles retained. Native font scaling/speech are separate pending cases. Task 4 in progress.
- Task 4 complete: 96/96 Node tests, lint/typecheck and all 15 notification browser cases passed (31.8s). Explicit translated timer/action/final content, stable semantic events/channels, delayed es→fr→de registration, current-language ownership, opt-out/mute/denied and no permission prompts covered. Generic production notification code unchanged. Task 5 in progress.
- Task 5 complete: all 12 focused persistence/default/browser-locale cases passed (41.6s), lint/typecheck exit 0. Rapid new-language choices end in saved German; repeated choice causes no write. Literal fixture survives language selection, unrelated theme saves, sharing and reload with exact clocks/history/false preferences and unchanged fixture bytes. Initial run had six strict-locator failures during the Settings closing animation; explicit dialog-close synchronization fixed the test without changing assertions, timeouts or application code. Task 6 in progress.
- Task 6 complete: 26 focused clock/notice/real-audio cases passed; the additional mounted-draft case initially timed out because modal stacking blocks Settings gestures. The test now dispatches the existing Settings controls programmatically to test accepted context updates while the draft remains mounted; it passed separately (16.1s). This is lifecycle coverage, not a claim that Settings can be opened by touch over an editor. Mixed text, old/new default step names, exact active clocks, paused schedule remainder, protected templates, reordering/discard, single playback per boundary, silent catch-up, 3500ms notice deadlines, real pending/playing playback, natural expiry and Stop are covered for the new languages. Lint/typecheck exit 0; no timeout/retry or application changes. Task 7 will establish a clean full-suite result on final source.
- Task 7 final-source identity: HEAD `e77476ae07b996d9d4bc68ee3a210c445aa220e8` plus uncommitted implementation on `feature/additional-languages`. SHA-256 `5b20da7209622e8c6cf7b872e3af984194cd3bfae79e488e5beea51f4c2733b6` covers sorted compact JSON of `{relative path: raw-file SHA-256}` for all 101 files in `src/`, `tests/`, `assets/` and existing package/lock/app/EAS/TypeScript/ESLint/Playwright configs. Manifest/lock/catalog identities remain those above. Final lint/typecheck and all 96 Node tests passed (exit 0); full browser result and exports follow. No source drift was observed during the browser run.
- Task 7 complete: all **162/162 browser scenarios passed in one clean full run (8.0min)**, exit 0, on the identified source. Fresh `npm run export` passed for Android/iOS/web, exit 0, after the browser suite; source fingerprint is unchanged. Timeouts/retries/transport config, dependencies, storage key/schema, timing/playback owners, native config, assets and unrelated work are unchanged.
- Task 8 remains pending: this WSL/Windows environment has no accessible Android/iOS device/runtime. Linux `adb`, `emulator`, `xcrun` and `simctl` are absent; Windows `where adb`, `where emulator`, `where xcrun` each exited 1. No common per-user Android SDK, USB bridge or root APK/AAB/IPA artifact was found. There is no native binary/profile or loaded native source to identify. Android and iOS six-choice controls, restart persistence, native larger text/themes/keyboard/sheets, accessibility speech/labels, retained clocks/text and localized OS delivery/channel checks are **pending**, not inferred from web/export results. Independent native-speaker review is also unavailable and recorded separately. No native/cloud build was submitted. Proceeding with the independent docs checkpoint as authorized by Task 8.
- Task 9 complete through `$aif-docs`: README lists all six autonyms/IDs/locales and current evidence; AGENTS, DESCRIPTION and ARCHITECTURE match the six catalogs and latest plan. All 15 internal Markdown links/anchors resolve; registry triples match. Meaning preservation: **PASS** — manual Romanian default, local selection, saved user text, timing/audio/notification contracts, historical results, known follow-ups and platform caveats are retained. Readability: current instructions, language table and separate evidence/limitations are clear. The existing long README organization was retained under the explicit plan scope rather than split into new pages. Final lint/typecheck exit 0; all 101 tested source/config/asset files retain the tested fingerprint. All 331 baseline tracked files were audited: only 13 intended existing paths changed; three new catalogs and this plan were added. No unrelated edits, dependencies, schemas, native configuration, commits, push, PR or cloud builds were introduced.
- Final normal verification: tasks 1–7 and 9 pass; task 8 pending as explicitly allowed by its fallback. Requirements reconciliation L1–L7 retains the accepted scope with native portions pending; the literal legacy fixture passes the real application path unchanged. Architecture and base-rules gates pass. `WARN [roadmap]`: no roadmap/milestone artifact exists; no contradictory direction was found. `WARN [native-validation]`: native accessibility/delivery and independent linguistic acceptance are unavailable. No blocking code/plan gap was identified in available verification.
