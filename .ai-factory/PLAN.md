# Implementation Plan: Settings Language Order

Branch: `master`
Created: 2026-11-07
Mode: fast
Status: complete

## Original Request

reordoneaza te rog limbile din configurare dupa popularitate, adică prima sa nu fie română, apoi engleză, dar sa fie popularite in ordine descrescătoare

## Settings

- Testing: yes — update the existing registry and Settings tests.
- Logging: minimal — keep existing warning and error handling. A static list has no runtime logging points.
- Docs: yes — run the documentation checkpoint for the existing language table in `README.md`.

## Requirements Reconciliation

The request sets the display order. The language rules in `AGENTS.md` and the language guide in `README.md` establish Romanian as the first-launch and fallback language. `SettingsSheet` renders the registry in order and selects each radio by its saved language ID.

Use the estimated worldwide total of native and second-language speakers as the popularity measure. The resulting Settings order is **English → Español → Français → Русский → Deutsch → Română** (`en`, `es`, `fr`, `ru`, `de`, `ro`). [2026 speaker ranking](https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers#Ethnologue_(2026)) · [Romanian speaker estimate](https://dialogos.rei.ase.ro/42/Art.5-Ciolaneanu.pdf)

| Behavior | Source | Verification |
|---|---|---|
| Settings shows all six language radios in the proposed order. | Original Request, `src/components/SettingsSheet.tsx` and `src/core/language.ts` | Check the ordered registry and the rendered radio list on web. Check wrapping at 320 px. |
| A fresh install or a missing or invalid saved language selects Romanian. | `AGENTS.md` Project Workflow, `README.md` Language, Theme, Timer, and Sound, `DEFAULT_LANGUAGE` and `restoreLanguage` | Run the existing default tests and the browser scenario that loads `tests/fixtures/app-v1-before-planning.json`. |
| A valid saved language selects its own radio by ID after reload. | `src/hooks/useI18n.ts`, `README.md` Language, Theme, Timer, and Sound | Exercise manual selection, verify the saved ID and check the selection after reload. |

Meaning preservation: PASS — the six Settings choices follow descending estimated global reach. Selection and fallback continue to be determined by language ID.

## Tasks

### Phase 1 — Registry

- [x] **Task 1 — Reorder the six existing `LANGUAGES` entries in `src/core/language.ts`.** Put `en`, `es`, `fr`, `ru`, `de`, and `ro` in the specified order. Keep each entry's ID, autonym, and locale paired as before and keep `DEFAULT_LANGUAGE = 'ro'`. The existing Settings mapping applies the order to Android, iOS, and web. Logging is limited to existing error handling.

### Phase 2 — Verification and documentation

- [x] **Task 2 — Verify order and selection after Task 1.** In `tests/language.test.ts`, replace the position-dependent `slice(3)` assertion with an explicit assertion for all six ordered ID, label, and locale triples. In `tests/e2e/localization.spec.ts`, extend the existing manual-selection scenario with a Settings radio order assertion using the expected labels in order. In `tests/notificationCoordinator.test.ts`, rotate the locale sequence around the fixture's starting language ID to preserve the test's return to that language. Run the commands below and record their results in this plan. Use the existing test output for diagnostics.
- [x] **Task 3 — Align the language table in `README.md` after Task 2.** Use the `$aif-docs` checkpoint to reorder the rows to match Settings and describe the basis for their order. Verify the Romanian default description against `DEFAULT_LANGUAGE`. Logging is limited to command output during the checks.

## Verification Commands

Run from the repository root. The AI Factory command catalog was discovered with `ai-factory commands --json`. Catalog SHA-256 `11820b73ef8a288db0148b485d1f39786cb6753d6095d11892be82f66f952e80`. `package.json` SHA-256 `c44656181b2c5fb704bf6948d5259007f43aa8efe2faa118736039827244a770`. `package-lock.json` SHA-256 `c7122d40b85602c1165cfb4468a9ab0749ec6324f503d2ba871d68dc7f5183d1`. Refresh the catalog if either manifest changes.

- `package.json#/scripts/lint` — `npm run lint`
- `package.json#/scripts/typecheck` — `npm run typecheck`
- `package.json#/scripts/test` — `npm test`
- `package.json#/scripts/test:e2e` — run the following targeted browser scenarios.

```sh
npm run test:e2e -- tests/e2e/localization.spec.ts --grep "manual selection updates|defaults to Romanian|ro legacy hydration|layout (es|ru) light 320px"
```

## Implementation Evidence

- `npm test` passed all 130 Node tests.
- The 9 targeted Playwright scenarios passed in Chrome. They covered the Settings radio order, Romanian fallback, saved selection after reload, the legacy fixture, and the layout at 320 px.
- `npm run lint`, `npm run typecheck`, and `git diff --check` passed.
- Documentation checkpoint through `$aif-docs`. Meaning preservation: PASS. The README table matches the registry, and the default and persistence guidance matches the tested behavior.
