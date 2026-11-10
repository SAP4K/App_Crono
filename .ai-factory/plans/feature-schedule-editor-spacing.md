# Implementation Plan: Separate Scheduling and Repeat sequence controls

Branch: `feature/schedule-editor-spacing`
Created: 2026-11-10
Mode: full
Status: Complete (3/3 tasks; physical native acceptance remains pending)
Base: local `master` / `origin/master` / current HEAD at `38f73469a5c768b8ec8e14954ca8204222ee02c3`.

## Original Request

poti te rog sa faci dispartitura normala intre scheduling si repeat sequence

## Settings

- Testing: reuse existing relevant browser scenarios and inspect the actual compact editor. This is a reversible spacing correction; introduce no new test file, implementation-mirroring style assertion, core test or snapshot baseline solely for this margin.
- Logging: minimal; no new runtime logging for layout or successful interaction. Retain existing scoped warning/error handling.
- Docs: yes; retain the established mandatory `$aif-docs` review checkpoint. Existing guides already describe both controls, so a public documentation change is not expected unless that review identifies a factual need.
- Reuse the user's established full-plan, testing, documentation and minimal-logging preferences without asking again. Artifacts are English; preserve the raw request above.
- Plan-only operation: implementation begins with `$aif-implement`. Commit/push/PR are separate operations.

## Requirements Reconciliation

Authority: the request and attached screenshot define the visual problem. `AGENTS.md` — Project Workflow and Expo requirements; `.ai-factory/rules/base.md` — Mobile UI and Validation; and `.ai-factory/ARCHITECTURE.md` — Display and Device Behavior constrain the implementation. Existing controlled editor and panel flows define retained behavior.

- **R1 — Visible separation:** provide a normal, consistent space between the two existing editor buttons. Use 12 layout units beneath Scheduling as the concrete implementation choice; the user did not prescribe a numeric spacing value or a new divider component.
- **R2 — Local scope:** preserve separate rounded button surfaces, current semantic colors, readable wrapping, labels, roles, minimum touch targets and pressed feedback. Change the local calendar-button spacing rather than the shared secondary-button style.
- **R3 — Retained interaction:** preserve Scheduling/Repeat panel entry, cancellation, focus restoration, local draft changes, Save/discard, list virtualization and the fixed editor shell. This layout correction does not change calendar/repetition rules, translations or saved data.

| Supported combination | Input, state and invariant | Verification |
|---|---|---|
| New template draft / existing saved schedule, Light / Dark | Both button surfaces remain visibly distinct; no layout-driven persistence or execution | Open the real Meditation built-in shown in the screenshot and an existing saved schedule; inspect both palettes, then close without saving |
| Compact 320px / regular 390px, English / Romanian / representative long Russian labels | Text can wrap, controls do not overlap, and the action list and Save remain reachable | Inspect compact editor screenshots/bounds, including representative enlarged web text, using current catalogs |
| Scheduling / Repeat sequence panel entry and cancellation | Existing local draft, focus return and explicit Save boundary remain intact | Run the existing calendar, repetition and light/dark editor feedback scenarios below |

Meaning preservation: PASS. The plan turns the screenshot/request into a local spacing correction; 12 units is a stated design choice. Existing functionality and the unrelated template-library work retain their scope.

## Technical Evidence and Approach

- In `src/components/ScheduleEditorSheet.tsx`, the Scheduling and Repeat sequence `Pressable` controls are consecutive children of `EditorBody` after the name field. Both use `styles.secondary`; Scheduling also uses `styles.calendarButton`.
- `calendarButton` currently sets `marginTop: 8`, `marginBottom: 0`, and `alignItems: 'flex-start'`. Its zero bottom margin overrides the shared secondary margin and leaves no space before Repeat sequence. Change only this local bottom margin to 12.
- Keep `styles.secondary`, `EditorBody.tsx` / `.web.tsx`, panel components, handlers and `FlatList` ownership unchanged. Avoid a wrapper or new scroll container for this correction. The list consumes the remaining editor height, so confirm the modest extra space does not hide required controls.
- Existing catalogs and the Meditation built-in reproduce the screenshot through the real application path. Existing browser fixtures exercise saved/calendar/repeated drafts; no new schema, dependency or native configuration is required.
- Before implementation touches React Native style code, follow the Expo preflight from `AGENTS.md`: the current manifest is Expo `~57.0.32`; read `https://docs.expo.dev/versions/v57.0.0/` and use `https://docs.expo.dev/llms.txt` for any additional API documentation needed.

## Tasks

### Phase 1: Local editor spacing

- [x] Task 1: Add a consistent gap between the two existing controls.
  File: `src/components/ScheduleEditorSheet.tsx`, `createStyles().calendarButton`.
  Deliverable: change the local bottom margin from 0 to 12 after the documented SDK preflight. Preserve top spacing, shared button styling, rounded backgrounds, labels, accessibility, feedback, panel handlers and editor/list structure. Retain all pre-existing template-library edits. Logging: none; preserve existing failure handling. Dependencies: none. Sources: R1/R2/R3 and the attached screenshot.

### Phase 2: Visual and interaction verification

- [x] Task 2: Inspect the actual editor and run the existing affected browser journeys.
  Files read/exercised: `tests/e2e/planning.spec.ts`, `tests/e2e/usability.spec.ts`, `tests/e2e/planningButtons.spec.ts`; existing catalogs and `ScheduleEditorSheet.tsx`.
  Deliverable: inspect an English Dark Meditation draft matching the screenshot, plus representative Romanian/Russian compact layouts in both palettes at 320/390px and enlarged web text. Confirm the visible 12-unit separation, natural wrapping, retained touch targets, reachable action rows/Save, independent panel entry and cancellation, and unchanged storage after an unsaved close. Reuse the existing calendar, repetition and light/dark editor feedback tests listed below; add no tests solely for the margin. Record the actual selection/results here. Screenshots may use ignored output paths. Physical native large-text/gesture/accessibility checks remain pending unless actually performed. Logging: existing browser error/warning observers and concise failure diagnostics only. Depends on 1. Sources: R1–R3 and the supported-combination table.

### Phase 3: Documentation review and completion

- [x] Task 3: Complete the documentation checkpoint and required quality checks.
  Files: this plan's progress/evidence; read `README.md` and relevant project context through `$aif-docs`.
  Deliverable: review existing Scheduling/Repeat documentation using `$aif-docs`; record that no public wording changes are needed if behavior remains accurately documented. Run lint and typecheck on the final source. Preserve all unrelated changes and the running local preview, check the scoped diff, and mark tasks from actual evidence. No core/full-suite/export/device build is required for this margin alone; broaden checks only if implementation changes or failures create a concrete need. Logging: concise check outcomes/errors; no runtime logs or separate report artifact. Depends on 2. Sources: project validation rules and retained documentation preference.

## Commands and Verification Contract

Read-only discovery: `ai-factory commands --json`, CWD `.`; catalog revision `52324bc8a91c2e8775d91c90b203373ad59663b1b090a37fd304440c24ad958e`. Source `package.json`, SHA256 `3b1b385ddd341785da0d090e3ca64f970cf2112236e9b33002a01e3de1378155`; lock SHA256 `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`. No ambiguities. Refresh discovery if these sources/scripts change.

| Exact command ID | CWD | Planned verification |
|---|---|---|
| `package.json#/scripts/lint` | `.` | `npm run lint` |
| `package.json#/scripts/typecheck` | `.` | `npm run typecheck` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e -- tests/e2e/planning.spec.ts -g "calendar editor stages weekly and fixed dates and saves them alongside legacy data"` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e -- tests/e2e/usability.spec.ts -g "repetition previews can be discarded and only Save persists the repeated sequence"` |
| `package.json#/scripts/test:e2e` | `.` | `npm run test:e2e -- tests/e2e/planningButtons.spec.ts -g "editor effects preserve the literal legacy data and controlled draft"` |

Use the established Windows Node/npm runtime for this mounted checkout. Keep one Playwright worker, 45-second scenario limits and no retries. Preserve the user's running preview on `http://localhost:8091`; if an isolated owned server is needed, use a temporary external configuration/port such as 8094 and stop only owned test processes. These commands are planned implementation checks, not claims of passing results for the future change.

## Acceptance Conditions

Scheduling and Repeat sequence read as separate buttons with a visible 12-unit gap in the real editor, including compact Light/Dark layouts. Both actions, local drafts, Save/discard, focus restoration and list reachability retain their current behavior. Scoped browser checks, lint and typecheck pass; evidence distinguishes browser inspection from native acceptance.

## Planning Validation

- Full mode and tests/docs/minimal logging reuse earlier explicit user preferences. No unresolved scope decision blocks this small layout correction.
- Read-only source analysis and focused QA reconnaissance confirmed the zero-margin cause, exact file/style target and existing test selections. No application code was changed during planning.
- Created `feature/schedule-editor-spacing` from the current HEAD, which matches local `master` and `origin/master`. Existing uncommitted template-library work was retained in place. No checkout of another base, pull, stash, commit or push was performed; remote freshness was not rechecked.
- Optional roadmap/research/top-level RULES and project skill-context files remain absent. Existing architecture and base rules govern this plan.
- Planning-baseline `npm run lint` and `npm run typecheck` both passed on 2026-11-10 using Windows npm. The planned spacing correction and its browser checks have not been implemented/executed.
- Meaning preservation: PASS. The raw request and prior completed template plan remain unchanged. This operation adds this plan only; the local application preview is retained.

## Implementation Evidence

- Task 1: read the installed Expo 57 manifest, matching SDK reference and Expo documentation index, then React Native 0.86 Layout Props. Changed only `calendarButton.marginBottom` from 0 to 12 in `ScheduleEditorSheet.tsx`. The scoped Git diff is one style-value change; shared styles, handlers, editor/list structure and catalogs retain their existing code. Lint and typecheck passed on this source before browser inspection. Existing command catalog/manifests remain unchanged.
- Task 2: all four existing selected Playwright scenarios passed in one 31.5-second run: calendar editing with literal legacy data, light/dark editor feedback, and repetition preview/cancel/Save. Kept one worker, 45-second limits and no retries. A temporary browser inspection outside the repository covered 12 English/Romanian/Russian × Light/Dark × 320/390px configurations, each with a new real Meditation draft and an existing weekly schedule (24 editor views). All measured gaps were 12px; targets remained at least 46px tall and wrapped Russian/weekly labels reached 64px without horizontal clipping. At 320px, supporting/button text was enlarged to 130%. Action inputs and Save remained reachable; panel cancellation restored focus, unsaved closes preserved exact stored data, and there were no page errors, nested-list warnings or audio plays. Inspected English Dark 390px and Russian Dark 320px enlarged-text screenshots in ignored `previews/schedule-spacing-*.png`. No registered tests or public documentation were changed. Physical native accessibility/gesture checks remain pending.
- Task 3: completed the mandatory `$aif-docs` review against the existing README instructions for Scheduling, Repeat sequence, Apply/Cancel and Save. They still describe the unchanged behavior correctly; no public documentation or context-map edit was necessary. Meaning preservation: N/A — no requirements rewritten. Technical accuracy and readability of the affected instructions are retained; broader README restructuring remains outside this margin correction. Final-source lint/typecheck and `git diff --check` passed. No additional source edits followed these checks, so they were not repeated.
- Final runtime/config SHA256: `ef544d854f6e634f8f6b48fcf3337cd3f8b501c838bf5bf1d19629e4a14405cb` (sorted src TS/TSX paths plus package.json/lock/app.json, each path and content NUL-delimited). Reconstructing the previous margin/source line endings reproduces the prior `44a66c6bf5d28207b64767b6fa41854b7a11a8c013ab847ea7a17f5ccf19ffbc` fingerprint, confirming all other runtime/config bytes remain unchanged. The five previously selected browser-source files retain SHA256 `b045f2c564bd0e5a0f873fd31b51e333b486eb7dd304d051d6a0b30f43f41047`.
- Boundaries: this implementation changes the one component style value and this plan's progress/evidence only. Pre-existing template-library work is retained. The user preview on `http://localhost:8091` remains running and returns HTTP 200; no server restart or shutdown was needed. No dependency, schema, core, native, catalog or registered-test change; no commit/push/PR. Physical native acceptance is not inferred from browser evidence.
