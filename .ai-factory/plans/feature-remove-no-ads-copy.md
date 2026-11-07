# Implementation Plan: Remove the advertising claim from Settings

Branch: `feature/remove-no-ads-copy`
Created: 2026-11-07
Mode: full
Status: planned; application changes have not started

## Original Request

elimina te rog de aici Fara reclama in toate limbile

## Settings

- Testing: yes — reuse existing catalog and browser checks; this small copy change does not need new test files or implementation-mirroring assertions.
- Logging: minimal — keep existing WARN/ERROR handling; introduce no logs for static text or rendering.
- Docs: yes — mandatory documentation checkpoint through `$aif-docs`; change product documentation only if it quotes the removed claim. The current README does not quote it.
- Languages: all six registered catalogs, `ro`, `en`, `ru`, `es`, `fr`, `de`; Romanian remains the default.
- Commit: one cohesive commit after implementation and checks, suggested message `fix(i18n): remove no-ads claim from settings`.

## Scope and Codebase Evidence

The screenshot shows the About text in `SettingsSheet`. `src/components/SettingsSheet.tsx:117` renders `m.privacy`, followed by the separate `m.historyLimit` text. The typed `privacy` field is defined in `src/i18n/types.ts`; each of the six registered catalogs supplies the complete two-line message. Editing those values updates the shared Android, iOS and web presentation.

Remove the advertising sentence from the first line. Preserve the account sentence, the single newline, the local-storage sentence and the separate 50-session history message. Expected first lines are:

| Catalog | Remove | Expected first line |
|---|---|---|
| `src/i18n/ro.ts` | `Fără reclame.` | `Fără cont.` |
| `src/i18n/en.ts` | `No ads.` | `No account.` |
| `src/i18n/ru.ts` | `Без рекламы.` | `Без аккаунта.` |
| `src/i18n/es.ts` | `Sin anuncios.` | `Sin cuenta.` |
| `src/i18n/fr.ts` | `Sans publicité.` | `Sans compte.` |
| `src/i18n/de.ts` | `Keine Werbung.` | `Kein Konto.` |

For example, the Romanian value becomes `Fără cont.\nSesiunile tale sunt salvate pe acest dispozitiv.`. The English value becomes `No account.\nYour sessions are saved on this device.`.

Keep the existing `privacy` key and Settings layout. This request changes displayed copy; it does not request advertising integration, new dependencies, native APIs, account behavior, persistence, language selection or timing changes.

## Requirements Reconciliation

Authority: the current user request and screenshot define the copy change. `AGENTS.md`, `.ai-factory/ARCHITECTURE.md` and `.ai-factory/rules/base.md` define localization boundaries and verification. Earlier session choices supply testing, documentation and minimal-logging preferences.

| Decision / supported combination | Source | Verification evidence required |
|---|---|---|
| Remove the advertising claim in all six languages. | Original Request; screenshot; `src/core/language.ts` registry | Review all six `privacy` diffs against the table above; no localized advertising clause remains in those values. |
| Preserve the account and local-storage messages and history limit. | Screenshot and existing catalog values; `SettingsSheet.tsx` About block | Confirm only the advertising sentence and its joining space are deleted; `historyLimit` and all other catalog values stay unchanged. |
| Render the updated message in every language in both themes. | Shared Settings renderer; existing `tests/e2e/localization.spec.ts` layout cases | Run the twelve existing 390px layout scenarios and inspect the Settings About text. Both themes use the same catalog values. |
| Keep Romanian as default and the saved language contract. | `AGENTS.md` — Project Workflow; `src/core/language.ts`; `tests/language.test.ts` | Existing catalog/fallback and saved-language tests pass; no state/schema/registry change. |

Meaning preservation: PASS — the requested phrase is removed from the pictured location in every supported language; the remaining messages retain their meaning.

## Baseline and Branch Dependency

- Planning starts from commit `07bd447c8472b519f04d507510373dc3b8edfb98`, the current six-language implementation.
- The new branch was created from `feature/additional-languages` because Spanish, French and German are present there and are not yet in fetched `origin/master` (`e77476ae07b996d9d4bc68ee3a210c445aa220e8`). PR #7 contains that dependency. Do not drop or duplicate its catalogs; any later PR into `master` must account for that dependency.
- The working tree was clean before creating this plan. Planning owns this file only; do not alter the previous language plan, architecture, description or rules as part of planning.
- No roadmap or research artifact is present; neither contributes additional requirements.

## Commands and Source Identity

Run from the repository root using npm and Node.js 24 or later. Command discovery used `ai-factory commands --json`; catalog revision is `33a77fae797fdd1d3fbb758a78a5ef4c738195f015d7cd42902baaab8ccfc2a1`.

| Command ID | Implementation verification command | CWD |
|---|---|---|
| `package.json#/scripts/lint` | `npm run lint` | `.` |
| `package.json#/scripts/typecheck` | `npm run typecheck` | `.` |
| `package.json#/scripts/test` | `npm test` | `.` |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/localization.spec.ts --grep "layout .* 390px keeps"` | `.` |

Manifest SHA256: `d6b4865f8a782ba86ca9ad270688d7e21fb7db6f5d02c20b7b9b51edea252983` (`package.json`). Lockfile SHA256: `c7122d40b85602c1165cfb4468a9ab0749ec6324f503d2ba871d68dc7f5183d1` (`package-lock.json`). Refresh discovery if these sources or the catalog revision change. Discovery labels `declared` / `not_run` are not execution evidence for this change.

This WSL workspace uses Windows-installed Node/npm and Windows Git. Invoke the established Windows commands from `D:\app_crono`; use Windows Git when checking changes to avoid false CRLF differences. Keep existing Playwright configuration, Chrome selection, timeouts and retry policy.

## Tasks

- [ ] Task 1: Remove the advertising sentence from all six Settings catalog messages.
  - **Files:** `src/i18n/ro.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts`, `src/i18n/es.ts`, `src/i18n/fr.ts`, `src/i18n/de.ts`.
  - **Deliverable:** change only each `privacy` value to match the expected first-line table; retain the existing newline and entire second line. Preserve punctuation in the remaining account sentence and avoid a trailing space before the newline.
  - **Integration:** continue rendering through the existing `m.privacy`; no component, type, registry or state changes are needed.
  - **Logging:** none for catalog changes; retain existing WARN/ERROR behavior.
  - **Dependencies:** the six-language baseline above; no unresolved product decision.
  - **Acceptance:** six scoped value changes, no advertising clause in the displayed About text, and unchanged local-saving and history-limit copy.

- [ ] Task 2: Verify the localized Settings text and complete the documentation checkpoint (depends on Task 1).
  - **Files inspected:** the six catalogs; `src/components/SettingsSheet.tsx`; existing `tests/i18n.test.ts`, `tests/language.test.ts`, `tests/e2e/localization.spec.ts`; `README.md`; this plan's task status.
  - **Deliverable:** review the six changed values against the explicit expected text, run the four verification commands above, and confirm the existing twelve 390px language/theme layout scenarios render the updated About message with the history limit still present. Reuse the existing registered tests; add no tests for this reversible copy edit.
  - **Verification detail:** the browser layout scenarios already select every language, open Settings, scroll to `historyLimit`, and assert visibility of `m.privacy`. Compare the actual catalog diffs to the expected table as well, since that browser assertion intentionally reads its expected wording from the catalog.
  - **Documentation:** use `$aif-docs` for the mandatory checkpoint. If documentation does not quote the advertising claim, record that no documentation edit is needed; do not invent unrelated README or context changes.
  - **Platform scope:** the message uses the existing shared renderer. If a native device is available, inspect Settings there; otherwise record native inspection as unavailable without claiming device verification. No new native configuration or export is required for a static copy deletion.
  - **Logging:** use command failures for diagnostics; introduce no routine application logs or saved-data output.
  - **Acceptance:** lint, typecheck, existing Node suite and targeted browser cases pass; only the six intended message values plus warranted plan/documentation changes differ from the baseline.

## Completion Criteria

- The Settings About text contains no advertising claim in any of the six supported languages.
- The account message, local-storage sentence, line break and 50-session history-limit message remain intact.
- Existing language selection, persistence and both themes remain compatible.
- Required checks and the documentation checkpoint have recorded outcomes; unavailable device inspection is reported accurately.

## Planning Validation

- The consumer, all six catalog entries and existing verification paths were inspected directly.
- Earlier full-plan/testing/documentation/minimal-logging preferences were reused; the user was not asked to repeat them.
- No external research or Expo API change is needed for this text-only plan.
- Only this plan was created. Application implementation and browser verification of the new wording remain pending.
