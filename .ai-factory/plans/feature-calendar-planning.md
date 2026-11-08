# Implementation Plan: Calendar Planning for Saved Schedules

Branch: `feature/calendar-planning`
Base: `master` at `c7cb98d01323792fba553884599d4c7412a6d526`
Created: 2026-11-07
Mode: full
Status: complete

## Original Request

poți te rog la planificare mai adaugi  încă o chestie, să poți să faci planinc pe zile ale săptămânii care se repede sau și pe o anumită dată

## Settings

- Testing: yes — extend the registered planning, localization, and browser checks.
- Logging: minimal — use localized validation feedback and the existing error paths.
- Docs: yes — update the Planning guide through `$aif-docs` after verification.

## Scope

Add **Programare** to each saved schedule. Choose **Manual**, **Săptămânal** with one or more weekdays, or **Dată fixă** with one calendar date. For example, a study schedule can appear every Monday and Thursday, and an appointment schedule can appear only on 20 November 2026.

Add a date filter to **Planificare** alongside **Toate**. The user can select a date or use **Astăzi** to fill the device's current local date. Display the selected date and the matching schedules. Show a short date or weekday summary on each scheduled card.

Planning assumption. A saved schedule has one calendar rule. Its date or weekdays determine where it appears in Planning, and the user starts the sequence with the existing **Pornește** control. Calendar dates are interpreted in the device's local calendar. The **Astăzi** shortcut selects a concrete date at the time of the tap.

## Requirements Reconciliation

The Original Request extends the date-free Planning interface described in `README.md` under Planning Example. The existing duration, editing, execution, and persistence contracts govern the scheduled action sequences. Calendar rules belong to saved templates. Run snapshots represent the action sequence that the user starts.

| Case | Expected behavior | Source and verification |
|---|---|---|
| Manual, legacy, or invalid saved calendar metadata | A valid action template without a usable calendar rule appears in **Toate**. Its ID and actions survive restoration. | `src/core/planning.ts` read/save/restore, `src/core/stopwatch.ts` v1 restoration. Exercise the real pre-planning fixture and a v1 snapshot containing an existing manual template. |
| Weekly | At least one weekday is required. A rule matches its selected weekdays in each week, using ISO weekdays 1–7 in Monday-to-Sunday order. | Original Request. Test multiple weekdays, a nonmatching day, and a match in a later week. |
| Specific date | The rule matches exactly one valid civil date. A past date stays available when that date is selected. | Original Request. Test leap years, invalid dates, the selected date, the adjacent dates, and the same weekday a week later. |
| Draft versus saved schedule | Apply updates the editor draft. Cancel or Back closes the calendar panel. Save persists the rule with the action template, and discarding the editor restores the stored schedule. | `src/components/ScheduleEditorSheet.tsx` draft/apply/save and `src/app/planning.tsx` accepted updates. Exercise both calendar modes, switching to Manual, reopening, and reloading. |
| Date selection with idle, running, or paused plans | Date filtering projects templates for the chosen day. The active run card stays available, and the existing Start or replacement confirmation controls execution. | `src/app/planning.tsx`, `src/core/planning.ts` run protection, and `src/core/notifications.ts` run projection. Check an empty filtered list during a run and compare notification projections before and after a calendar-only edit. |

Meaning preservation: PASS — the plan supports repeating selected weekdays and one specific date. Manual launch and one rule per template are explicit scope choices.

## Tasks

### Phase 1 — Calendar model and compatibility

- [x] **Task 1 — Add civil dates and calendar rules to saved templates.** Introduce pure validation and matching in `src/core/planningCalendar.ts` and wire the rule into `src/core/planning.ts`.
  - Store `calendar?: { kind: 'weekly'; weekdays: Weekday[] } | { kind: 'once'; date: string }` on `Schedule`. Absence represents Manual. Normalize valid weekdays to a unique, ascending ISO list. Validate a canonical `YYYY-MM-DD` against Gregorian month lengths and leap years.
  - Reject invalid new rules in `readSchedule` and `saveSchedule`. At the `restorePlanning` boundary, recover a valid legacy template as Manual when optional calendar metadata is absent or malformed. Preserve the v1 storage key, template count limit, canonical no-op saves, protected-template checks, and separate run restoration.
  - Match a date through civil date fields, with UTC arithmetic for its weekday if needed. Derive the local **Astăzi** key from the device's local year, month, and day. Cover timezone boundaries without treating a civil date as an instant or advancing it by fixed 24-hour intervals.
  - Extend `tests/planning.test.ts` for normalization, invalid and leap dates, legacy fallback, mode changes, weekly and one-time matches, and run identity. Verify that an unrelated template's calendar edit preserves the active run and its notification projection. Keep diagnostics in the existing test and validation paths.

### Phase 2 — Editor and date view

- [x] **Task 2 — Add the localized calendar editor.** After Task 1, update `src/components/ScheduleEditorSheet.tsx` and add a shared date field component under `src/components/` for the editor and date filter.
  - Put a compact **Programare** control near the schedule name. Use a panel in the existing Sheet with **Manual**, **Săptămânal**, and **Dată fixă**. Show wrapped weekday checkboxes with full accessible names. Use explicitly labeled numeric day, month, and year fields for a specific date and present the saved date in the current app language.
  - Keep edits in panel state until Apply. Include the normalized rule in the schedule draft, dirty check, and validated save candidate. Keep calendar, duration, and discard views mutually exclusive. Use the existing covered-editor layout and restore the initiating control's focus on return.
  - Add the mode, field, validation, filter, and empty-state copy to `src/i18n/types.ts` and all six catalogs. Reuse the existing locale and date formatting helpers in `src/i18n/formatters.ts`. Format date-only labels from validated civil fields in a fixed formatting zone so the displayed day matches the stored day. Show validation through the localized panel.

- [x] **Task 3 — Show scheduled templates by date in Planning.** After Tasks 1 and 2, update `src/app/planning.tsx` with **Toate** and a date selection control using the shared day/month/year fields.
  - The default **Toate** view shows the saved list and all existing controls. In the date picker, **Astăzi** fills the device-local date at tap time and Apply selects that date. Display the selected date, show matching weekly and one-time cards, and use a localized empty state for a day with no matches. Keep the selection as view state.
  - Add short localized rule summaries to scheduled cards. Keep `PlanningRunCard` in the list header, calculate the schedule limit from all saved templates, and route Start/Edit/Delete through the existing handlers and protections. Calendar selection is a pure list projection. Keep diagnostics on the existing action/error paths.

### Phase 3 — Verification and documentation

- [x] **Task 4 — Verify the complete Planning flow and document it.** After Task 3, extend `tests/e2e/planning.spec.ts` to create, edit, cancel, save, and reload both kinds of rule. Verify repeated matches across weeks, a one-time match on its exact date, the **Astăzi** shortcut near a local/UTC date boundary, a manual legacy template, and Start/replacement from the date view.
  - Exercise the committed `tests/fixtures/app-v1-before-planning.json` through hydration and separately seed v1 data with a valid manual template and active or paused run. Verify date-filter navigation and an empty day with an active run. Cover narrow layout, date field keyboard interaction, and 50-action editor focus using the existing browser suite. Retain assertions for both themes and all six catalogs where the shared UI is exercised.
  - Run the commands below and record their outcomes. For React Native or Expo APIs used in the change, follow `AGENTS.md` by reading the installed SDK's versioned docs before editing. Check date entry, weekday accessibility, and back/focus behavior on available Android/iOS devices and record which platform was exercised.
  - Use `$aif-docs` to update the Planning Example and persistence guidance in `README.md`. Update the project context only where calendar metadata or new source files change documented facts. Use command output for diagnostics and capture verification evidence in this plan.

## Verification Commands

Run these from the repository root. `ai-factory commands --json` resolved the scripts in `package.json` at catalog revision `11820b73ef8a288db0148b485d1f39786cb6753d6095d11892be82f66f952e80`. `package.json` SHA-256 is `c44656181b2c5fb704bf6948d5259007f43aa8efe2faa118736039827244a770`. `package-lock.json` SHA-256 is `c7122d40b85602c1165cfb4468a9ab0749ec6324f503d2ba871d68dc7f5183d1`. Refresh command provenance when those inputs change.

- `package.json#/scripts/lint` — `npm run lint`
- `package.json#/scripts/typecheck` — `npm run typecheck`
- `package.json#/scripts/test` — `npm test`
- `package.json#/scripts/test:e2e` — the targeted Planning and duration-editor scenarios below.
- `package.json#/scripts/export` — `npm run export` for Android, iOS, and web bundles.

```sh
npm run test:e2e -- tests/e2e/planning.spec.ts tests/e2e/planningButtons.spec.ts
npm run test:e2e -- tests/e2e/durationPicker.spec.ts --grep "fifty-action editing|Planning cancels moving"
```

## Implementation Evidence

- `npm test` passed all 137 Node tests, including calendar validation, legacy restoration, localized labels, and notification projection.
- Chrome passed all 25 Planning and Planning button scenarios plus both targeted duration editor scenarios. Coverage includes both rule types after reload, the device-local date boundary, an existing paused run, six catalogs at 320 px, and focus and list position with 50 actions.
- `npm run lint`, `npm run typecheck`, and whitespace checks passed.
- Expo export produced Android, iOS, and web bundles in a temporary output directory. The UI uses the SDK 57 and React Native 0.86 control contracts. [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) · [React Native TextInput](https://reactnative.dev/docs/0.86/textinput) · [React Native accessibility](https://reactnative.dev/docs/0.86/accessibility)
- The `$aif-docs` checkpoint updated the Planning guide and project map. Meaning preservation: PASS.
- New schedules opened from a date view start with that date in their draft. Physical Android and iOS interaction checks are pending.
