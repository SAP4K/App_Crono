# Implementation Plan: White/Blue Light Theme and Matching Dark Theme

Branch: `feature/white-blue-theme`
Configured integration branch: `master`
Source branch: `feature/sound-settings-schedules`
Base commit: `64c39117292b0ff3275d4a90774bc3e052ab9d47`
Created: 2026-11-05 (Europe/Bucharest)
Mode: full
Status: implemented; physical-device validation pending
Current task: none (4/4 completed)

This branch starts from the completed, committed sound/planning feature so the color refresh includes the current application. Local `master` is still at `258582c`; do not reset onto it and lose those features. No merge, commit, or push is part of this planning invocation.

## Original Request

poti te rog sa schimbai tema, sa fie alb/albastru si deja dark team

## Settings

- Testing: yes; reuse the user's existing preference for regression tests.
- Logging: minimal; preserve existing WARN/ERROR reporting at appearance/storage/audio boundaries. No routine palette, render, selection, or success logs.
- Docs: yes; update existing documentation through `$aif-docs` during implementation completion.
- Planning depth: full, retaining the user's earlier full-plan preference.
- Communication and generated artifacts: English. Application interface: Romanian.
- Design interpretation: a white/blue light appearance paired with a navy/blue dark appearance. Exact shades below are proposed implementation choices, not user-supplied hex values.
- Scope assumption: application screens, the in-app CRONO mark, controls, dials, notices, and sheets. Launcher icons, favicon, splash artwork, and their static native configuration are separate branding work and remain outside this refresh.
- Keep the saved manual `Mod întunecat` switch, light default, existing routes/layout/fonts, sound settings, timer/planning behavior, and version-1 persistence contract.
- No roadmap or research artifact exists; this plan creates neither. No new dependency is required.

## Requirements Reconciliation

Authority: the current user request supersedes the earlier lime/green visual direction in `feature-dark-mode-preference.md`. Existing functional requirements, current `AGENTS.md`, architecture, and base rules continue to apply. Reusing the existing toggle does not introduce a third appearance mode or automatic system-theme selection.

Sources:

- **R1:** Original Request above — white/blue theme and dark theme.
- **P1:** User's earlier decisions and `.ai-factory/plans/feature-dark-mode-preference.md`, Settings/Outcome — saved manual light/dark selection, light default, independent activities, tests/docs/minimal logging. The previous lime accent is replaced by R1.
- **A1:** `AGENTS.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/rules/base.md` — shared tokens, Romanian copy, pure core, functional shared updates, Expo workflow, lint/typecheck, and device evidence boundaries.
- **E1:** `src/theme.ts`, `src/context/ThemeContext.tsx`, `tests/theme.test.ts`, `tests/e2e/theme.spec.ts`, `tests/e2e/helpers.ts` — actual palette roles, appearance projection, existing contrast tests, and obsolete RGB expectations.
- **E2:** `tests/fixtures/app-v1-before-planning.json` and `tests/e2e/planning.spec.ts` — representative legacy data and simultaneous activities across navigation/theme changes.

| Case / source | Supported input/state | Expected transition and invariants | Evidence |
|---|---|---|---|
| C1 — R1/P1/E1 | Missing/invalid theme, or stored `light` | First interactive screen is white/blue; default remains `light`; valid data and false preferences survive | Existing legacy/default restoration plus browser appearance/reload |
| C2 — R1/P1/E1 | Stored `dark`, toggle in either direction, rapid changes, opposite OS appearance | Navy/blue dark mode or white/blue light mode applies immediately and persists; manual preference continues to win | Both palettes, repeated toggles, reload, and emulated OS appearance |
| C3 — P1/E2 | Running/paused stopwatch, timer, or schedule; pending/playing alert | Recolor without resetting clocks, changing run IDs, losing drafts/history, or canceling/replaying audio | Existing simultaneous-activity scenarios plus a focused theme change during a live alert |
| C4 — R1/A1/E1 | Both palettes at 320/390/430/1024px; four tabs and open sheets | Readable blue accents, selected/disabled/danger states, dials, input selection, and notifications; layout stays usable | Browser color assertions, overflow checks, screenshots, and available device checks |
| C5 — P1/E2 | Literal pre-planning version-1 fixture with saved dark theme and false booleans | Restore its real clocks/history/preferences, apply navy/blue, switch/reload safely; retain `@crono/app-v1` and schema version 1 | Exercise the existing fixture through Settings, Timer/Planificare navigation, persistence, and reload |

Meaning preservation: PASS — the color request is applied to both appearances while retaining earlier functional decisions. Scope assumptions and exact color choices are identified as proposals; native validation is not inferred from browser evidence.

## Visual Contract

Use the existing `Palette` keys to keep this a focused visual change. The internal legacy names `lime`, `limeSoft`, and `green` become blue roles; renaming all consumers is unnecessary for this request. Keep foreground roles distinct from background accents.

| Palette key | Light | Dark |
|---|---|---|
| `background` | `#FFFFFF` | `#0F172A` |
| `surface` | `#F8FAFC` | `#1E293B` |
| `ink` | `#0F172A` | `#F8FAFC` |
| `muted` | `#475569` | `#CBD5E1` |
| `subtle` | `#64748B` | `#94A3B8` |
| `border` | `#CBD5E1` | `#475569` |
| `lime` (accent) | `#2563EB` | `#60A5FA` |
| `limeSoft` | `#EFF6FF` | `#172554` |
| `green` (accent text/ring) | `#1D4ED8` | `#93C5FD` |
| `danger` | `#B91C1C` | `#FCA5A5` |
| `dangerSoft` | `#FEF2F2` | `#450A0A` |
| `desktop` | `#E2E8F0` | `#020617` |
| `secondary` | `#F1F5F9` | `#1E293B` |
| `disabled` | `#E2E8F0` | `#334155` |
| `selected` | `#DBEAFE` | `#1E3A8A` |
| `iconSurface` | `#EFF6FF` | `#172554` |
| `empty` | `#F8FAFC` | `#111C32` |
| `summary` | `#EFF6FF` | `#172554` |
| `badge` | `#DBEAFE` | `#1E3A8A` |
| `badgeText` | `#1E40AF` | `#DBEAFE` |
| `action` | `#2563EB` | `#60A5FA` |
| `actionText`, `actionIcon` | `#FFFFFF` | `#0F172A` |
| `featured` | `#EFF6FF` | `#172554` |
| `featuredMuted` | `#475569` | `#CBD5E1` |
| `onAccent` | `#FFFFFF` | `#0F172A` |
| `toast` | `#EFF6FF` | `#1E293B` |
| `toastText` | `#0F172A` | `#F8FAFC` |
| `tickMajor` | `#64748B` | `#94A3B8` |
| `tickMinor` | `#CBD5E1` | `#334155` |
| `handle` | `#94A3B8` | `#64748B` |
| `overlay` | `rgba(15,23,42,0.45)` | `rgba(2,6,23,0.70)` |
| `shadow` | `0 6px 20px rgba(15,23,42,0.18)` | `0 6px 20px rgba(0,0,0,0.45)` |

The current 13 text-role pairings were checked numerically against these proposed values: minimum approximately 4.75:1 in light and 5.78:1 in dark. Retain the unrounded 4.5:1 threshold in tests, consistent with [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This calculation covers those pairings; inspect actual composite surfaces and opacity separately. Permit a narrowly documented adjustment to a supporting shade when rendered contrast requires it, keeping white/blue and navy/blue as the design anchors.

In particular, History's summary text currently uses `lime` on `featured`: replacing only the accent with blue while retaining the old dark light-theme card would reduce readability. The table changes that card to a pale blue surface. The toast icon also uses `lime`, so its background must be reviewed with the new accent.

## Code Evidence and File Scope

- `src/theme.ts`: all application palette hex values are centralized; `Palette` enforces matching roles.
- `src/context/ThemeContext.tsx`: already projects palettes into Expo Router, browser body, native Appearance/SystemUI, and saved preferences. Retain provider identity and lifecycle behavior.
- `_layout.tsx`, all four routes, dials, lap/history rows, schedule editor/run card, notices, and Settings consume these tokens. Change component styling only for an observed mapping/contrast problem; do not redesign their structure.
- `tests/e2e/helpers.ts:expectTheme` hardcodes the current green desktop RGB colors. `tests/e2e/theme.spec.ts` hardcodes the old dialog background; both must change with the palette. Keep independent checks of the requested white/blue appearance so assertions do not merely compare the palette module with itself.
- `app.json` and bitmap assets contain the existing native launcher/splash branding. They are outside the interface scope and are not runtime theme preferences. No native configuration or asset generation is required.
- `src/core/`, persistence hooks, coordinators, and audio transports require no behavior changes.

## Verification Commands

Discovery: installed `ai-factory commands --json` from repository root on 2026-11-05. Entries are declared/not_run; their presence does not establish success.

- Catalog `revision_sha256`: `a2bfcc72b13c0813af89dc3a119b9375d36375a75ffd025d472969d65604c6ba`.
- Source `package.json` SHA256: `a85c779b5e417bdbe98dc06f75ee9869dcd62f593ce69d399327a35dba785d21`.
- Lockfile `package-lock.json` SHA256: `9faa54bacbf3c0741e5d586438bd147df17dc598e460c03cf78bf64029609766`.

| Command ID | CWD | Planned command |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` |
| `package.json#/scripts/test` | `.` | `npm test` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e` (theme spec while iterating; full suite for final UI regression) |
| `package.json#/scripts/export` | `.` | `npm run export` |

Use Node.js 24+ and the existing Windows Node/npm/Chrome setup on this WSL host. Keep Chrome and port 8091 on the same host, avoid overlapping Playwright runners, and report genuine failures/timeouts without weakening assertions. Refresh command discovery after any manifest/lockfile edit; none is planned.

Expo SDK 57 is installed. [Version-matching documentation](https://docs.expo.dev/versions/v57.0.0/) was consulted during planning. If implementation needs to change an Expo/React Native API, follow `AGENTS.md` and reread the matching API documentation before editing it; the intended palette update needs no new API.

## Tasks

### Phase 1: Shared Appearance

- [x] **Task 1 — Apply and validate both blue palettes.** Update all existing roles in `src/theme.ts` using the Visual Contract, retaining the current palette API and fonts. Extend `tests/theme.test.ts` with actual foreground/background pairings used by blue action buttons, accent marks, notices, selected choices, history summaries, badges, and toasts; retain all existing checks. Inspect the relevant consumers in `src/app/_layout.tsx`, `src/app/history.tsx`, `src/components/SettingsSheet.tsx`, `StopwatchFace.tsx`, `TimerFace.tsx`, `PlanningRunCard.tsx`, `PlanningNotice.tsx`, `TimerCompletionNotice.tsx`, `TimingNotices.tsx`, and `LapList.tsx`. If a contrast problem requires a local token mapping adjustment, keep it narrowly scoped and test it. Keep error/destructive states red and distinguish selected/disabled controls. Sources: R1/A1/E1; C1–C4. Verification: Node contrast tests, lint, typecheck, and a renderer spot-check before broad browser coverage. Logging: no pure-palette/render logs; preserve existing recoverable WARN/ERROR handling. Dependencies: none.

### Phase 2: Appearance and State Regressions

- [x] **Task 2 — Update browser expectations and cover saved appearance without state loss.** Update `tests/e2e/helpers.ts:expectTheme` and obsolete RGB assertions in `tests/e2e/theme.spec.ts` for the new body/sheet colors. Assert the visible white light surface and blue primary action, plus the navy dark surface and lighter blue action, independently of merely importing the same palette values. Preserve existing default/manual/OS-override/rapid-toggle/reload cases. Exercise the existing literal `tests/fixtures/app-v1-before-planning.json` through Settings, theme switch, Timer/Planificare navigation, and reload; retain its valid clocks/history and false preferences. Keep or extend the simultaneous-activity scenario in `tests/e2e/planning.spec.ts`; add a focused case showing that changing theme during a live alert neither stops nor replays it, using existing audio observations. Capture page errors/unhandled rejections with the shared helpers. Sources: R1/P1/A1/E1/E2; C1–C5. Verification: affected browser scenarios, lint, and typecheck. Logging: test diagnostics only; no routine runtime theme logs. Dependencies: 1.

### Phase 3: Rendering and Validation

- [x] **Task 3 — Verify every screen and sheet in both palettes.** Extend/reuse `tests/e2e/theme.spec.ts` at 320/390/430/1024px for Cronometru, Timer, Planificare, Istoric, Settings, session details, schedule editor/discard, reset/delete/replacement confirmations, and timing notices with Stop. Include long Romanian names, focused inputs, selected sound/duration choices, lap highlights, disabled buttons, and current/completed planning state. Save representative screenshots under ignored `previews/` and inspect them; confirm no horizontal overflow or inaccessible controls. Run lint, typecheck, all registered Node tests, the full browser suite, and all-platform export. On available iOS/Android devices inspect saved-theme startup, status/root appearance, switches, keyboard/sheets, and legibility; explicitly record unavailable checks as pending. The static launch artwork is not expected to follow saved preferences. Correct demonstrated appearance issues within Task 1's scope rather than changing timer/audio/persistence logic. Sources: R1/P1/A1/E1; C2–C5. Logging: investigate actual WARN/ERROR only; no per-render or success logs. Dependencies: 1–2.

### Phase 4: Documentation

- [x] **Task 4 — Document the delivered appearance and actual checks.** Use `$aif-docs` to update the existing `README.md` with the white/blue light appearance, navy/blue dark appearance, retained saved `Mod întunecat` behavior, and actual validation/device status. Keep native launcher/splash branding scope explicit where relevant. Update the AGENTS documentation map only as needed by that workflow; factual DESCRIPTION/ARCHITECTURE maintenance belongs to the implementation owner and is needed only if existing statements become inaccurate. Preserve the earlier completed plans, known storage/audit follow-ups, Romanian interface, and current package/runtime instructions. Do not create a separate report, new docs site, or summary document. Sources: R1/P1/A1; C1–C5. Verification: links, factual comparison against source/test results, lint, and typecheck. Logging: documentation work adds no runtime logs. Dependencies: 3.

## Completion Criteria

- All interactive app screens use the paired white/blue and navy/blue palettes, with readable foreground roles and preserved red destructive/error states.
- The existing manual theme selection persists and keeps its default/legacy behavior; timing state, audio, drafts, settings, history, and navigation survive recoloring.
- Relevant numerical, browser, visual, and export checks pass. Actual physical-device results or pending limitations are reported separately.
- Existing documentation reflects delivery. Four tasks form one coherent visual feature; a single final commit is sufficient when the user requests one.
- This invocation creates only the plan and its feature branch. Implementation starts with `$aif-implement`.

## Implementation Progress

- Task 1 in progress. Selected this pending theme plan from the conversation and switched to its existing branch. The sound/planning branch and PR remain separate. The command catalog was refreshed after Windows checkout converted package.json line endings; command definitions and lockfile are unchanged. User-requested WARN/ERROR-only logging takes precedence over the skill logging default.

- Task 1 complete: both palettes applied without component/API changes; 31 real text/icon pairings per mode pass the 4.5:1 contrast threshold. All 51 Node tests, lint and typecheck pass. Chrome renderer spot-check passed and Settings screenshots were visually inspected in both modes. The first spot-check found the preview server stopped; after starting port 8091 both checks passed. Task 2 in progress.

- Task 2 complete: nine affected browser cases pass across the initial run and one corrected-selector rerun (manual/legacy behavior, simultaneous clocks, and pending/playing timer/planning alerts). The literal legacy fixture retains clocks, history, schema and all false preferences through toggle/navigation/reload. The initial fixture check needed to await modal fade-out before selecting the shell notice; no application defect was found. Lint/typecheck pass; an initial typecheck raced Playwright cleanup of the temporary ignored spot-check script, which was removed before the successful rerun. Task 3 in progress.

- Task 3 progress: both 320px screen/sheet cases and both notice/confirmation cases pass after correcting the expanded history fixture to keep total duration above cumulative laps. No runtime behavior was changed. Representative stopwatch, timer, history, schedule-run/editor and notice screenshots were visually inspected in both modes. The full 56-case browser run is in progress with unchanged timeouts/retries. Android device tooling is absent on both WSL and Windows; physical-device checks remain pending.

- Task 3 progress: the full browser run passed 54/56; the two new 390px notice cases exposed test interaction races (confirmation visibility after a scrolling click; controlled input focus/selection under the paused clock). Added explicit scroll/visibility waits and settled focus before filling. All eight affected theme/viewport notice cases then passed with unchanged 45-second limits and no retries. All 56 unique browser scenarios therefore pass across the full run and affected-case rerun. Final lint/typecheck and all 51 Node tests pass. All-platform export is in progress.

- Task 3 complete: Android/iOS/web export passed. All required automated checks are green across the recorded runs; 320/390/430/1024px coverage and representative screenshot inspection are complete. Physical iOS/Android checks remain pending because no native runtime/device tooling is available. Task 4 in progress via aif-docs for README and its AGENTS documentation entry, with factual DESCRIPTION maintenance by the implementation owner.

- Task 4 complete: aif-docs updated README and its AGENTS documentation entry; the implementation owner maintained DESCRIPTION with the delivered palettes, latest plan and actual verification evidence. Meaning preservation PASS; relative links resolve, README is 144 lines, authoritative Expo/workflow instructions and known findings remain unchanged. Lint/typecheck and diff checks pass. No dependency, persistence, timing/audio logic, native configuration, or branding asset was changed. Physical-device validation remains pending. No commit, push or PR update was performed in this implementation invocation.
