# Implementation Plan: Screen and Sheet Transitions

Branch: `feature/screen-sheet-transitions`
Created: 2026-11-10
Mode: full
Status: complete — all 10 implementation tasks verified; physical native acceptance remains deferred.
Base: `master` at `8a27740326fc429a75b3c84ad55b652863a1eafd` (merged PR #18). The starting working tree was clean; `git pull --ff-only origin master` reported already up to date.

## Original Request

poti te rog sa adaugi anamie la trecerea de la o fereastra la alta, plus animatie la subferestrele care apar

## Settings

- User-selected style: **Short fades between screens + slide-up sheets**. Retain this choice; do not replace the four tabs or introduce swipe navigation.
- Full planning, tests, documentation and warnings/errors-only logging reuse the user's explicit preferences. Documentation is a mandatory completion checkpoint through `$aif-docs`.
- Platforms: Android and iOS first, with the existing web preview and keyboard/accessibility behavior retained.
- Reuse the installed Expo Router navigator, React Native Animated and shared `MotionProvider`. No new dependency, OS subscription, permission, saved animation setting or persistence migration is planned.
- Proposed visual defaults, adjustable in `src/theme.ts`: 180 ms route fade; 240 ms sheet entrance and 180 ms exit; 140 ms incoming-panel fade with at most 8 px vertical travel. A sheet travels from below the viewport using its measured surface height, with a separately fading backdrop. These numbers are implementation choices, not user requirements.
- Live Reduce motion or inactive-app policy settles immediately to the current logical destination, with no scaling/sliding/timed fade. Foreground return must not replay a completed entrance.
- Keep the current heading/Close placement and all scroll owners. The earlier unified-window-scrolling plan's unanswered heading decision remains separate and pending.
- This plan authorizes planning only. Do not implement, commit, push, restart the existing preview or install an APK during this command.

## Requirements Reconciliation

Authority: the Original Request and the user's selected transition style define the feature. Earlier user preferences govern tests/docs/logging. `AGENTS.md`, `.ai-factory/rules/base.md` and `.ai-factory/ARCHITECTURE.md` constrain compatibility. Existing source/tests establish current timing, navigation, draft, transfer and focus behavior. No roadmap or selected research artifact exists for this scope.

| ID | Decision and source | Acceptance evidence |
|---|---|---|
| R1 | Fade between Stopwatch, Timer, Planning and History. Source: Original Request and selected style; current Tabs in `src/app/_layout.tsx`. | Sample real intermediate scene opacity, then the selected route's settled visible state. Cover tab, Link, imperative navigation and Back. |
| R2 | Slide shared sheets up on appearance and reverse on close, fading the backdrop separately. Source: selected style; `src/components/Sheet.tsx`. Matching exit behavior is a proposed presentation detail. | Actual surface movement/backdrop fade for opening/closing; latest request wins during interruption. |
| R3 | Animate incoming Settings sections and Planning duration/calendar/repeat/discard/editor returns; include the existing backup-review view. Source: request for appearing subwindows; existing conditional content. | Change a semantic panel identity once per real navigation, without replay on field edits, validation, theme/language changes or notice ticks. |
| R4 | Reuse live reduced-motion/activity policy. Source: `MotionContext.tsx`, `motionPreference.ts` and mobile accessibility rules. | Initial/live reduced motion, mid-transition changes, background suspension and foreground refresh all converge immediately and safely. |
| R5 | Keep navigation and accepted domain actions immediate and exactly once. Source: base state/persistence rules and current action handlers. | Animation callbacks never Save, Apply, Confirm, import, start clocks, request permissions or produce haptics/audio. They may only finish presentation/focus cleanup. |
| R6 | Preserve mounted route state, editor drafts/virtualization, duration-wheel ownership, scroll offsets and confirmations. Source: architecture and existing editor/scroll/wheel tests. | Rapid transitions and return paths retain identities, exact deadlines, draft text and settled numeric values; cancelled wheel work cannot apply a value. |
| R7 | Separate logical close/cancellation from visual exit retention. Source: conditional Planning parents, History children, Settings preview cancellation and backup disposal. | Closing retains only bounded presentation state; preview/file work stops promptly, outgoing controls cannot act, and old completion cannot clear a reopened view. |
| R8 | Preserve focus, background isolation, safe areas and one interactive destination. Source: Sheet/EditorBody/isolation implementations and existing browser focus tests. | Outgoing scenes/panels are inaccessible and cannot accept gestures; portal handoffs do not leak root focus or release another sheet's isolation. |
| R9 | Keep shared clocks, audio, system notifications, catalogs, backups and saved data independent of transition progress. Source: architecture, global provider placement and notification navigation. | Concurrent activities and real media continue; literal legacy data survives navigation and actual export/import/reload. |
| R10 | Keep finite, cancellable animations with cleanup and factual validation. Source: performance rules and prior verification lessons. | No recurring idle RAF, per-frame shared React writes, timer polling or new logging noise; register controller regressions immediately and distinguish browser/export evidence from physical acceptance. |

### Supported combinations

Transition state is transient presentation state, never part of AppData or portable files.

| Supported input / state | Validation, resulting transition and side effects | Verification |
|---|---|---|
| Valid route change through tab, actual Link, ActiveActivities or buffered notification | Accept navigation through its existing owner immediately; fade only scenes. Preserve tabPress prevention, URLs/history and global providers. Same-route activation does not restart a fade. | Real mouse/keyboard paths, same-tab and prevented-tab audit, direct URLs and browser Back; registered notification-response tests. |
| Rapid route changes / interrupted animation | Selected route is authoritative immediately; only it accepts scene input. Final route becomes fully visible; stale transitionEnd cannot run domain work or re-enable an old scene. | Multiple real navigations with an intermediate-opacity sample, final target/input checks and retained scroll/drafts. |
| Sheet opening, close during entry, reopen during exit | Logical request changes immediately. Retain the current presentation until its guarded exit completes, reuse/reverse current progress, and reject stale hide/cleanup callbacks. | Injected driver races plus actual Close/Escape/backdrop/reopen interactions; no duplicate callback or invisible input shield. |
| Closing an editor/date chooser/details whose payload normally clears | Keep one immutable display payload/session identity until dismissal, then release it. A new presentation has a fresh identity; cleanup can clear only its own request. | Close/reopen the same and another schedule/date/session; final content and draft initialization match the latest accepted request. |
| Accepted Save/Confirm/Apply/delete/import during a transition-capable view | Existing validation and handler remain authoritative and execute exactly once, without awaiting motion. Only visual removal/focus return may follow exit. | Domain and persisted-state assertions with independent clocks; explicit confirmation still required. |
| Closing Sound/Data while playback preparation or file read is pending | Cancel preview/transfer work at logical departure, even if outgoing visuals remain. Real completion playback retains its current owner. | Hold real adapter boundaries, close/change section, resolve late work and assert no stale import/preview or wrong success notice. |
| Settings group/Back, backup review/Cancel, editor panel/return | One current semantic panel; animate its incoming content only. Unmount obsolete subpanels promptly; retain the existing covered EditorBody list without remount. | Source focus restoration after destination readiness, correct body scroll and unchanged draft; wheel coast cancellation and temporary selection discard. |
| Normal/reduced motion at startup or live during entry/exit/navigation | Conservative shared policy wins. Reduced/inactive state cancels interpolation and settles at the current requested endpoint; re-enabling motion does not replay a static view. | Existing observer races plus new driver/browser transition checks, including settings changed while backgrounded. |
| Open portaled sheet while its underlying tab changes programmatically | Preserve existing open-sheet/draft behavior and the modal's own focus/isolation owner. Scene DOM gates must not close or inert the portaled sheet or strand its controls through route-scoped motion context. | Notification/imperative navigation with an open editor and Settings; retained draft, usable current sheet, correct route beneath it. |
| Overlapping old exit / new sheet, including History details to delete confirmation | Only the current modal accepts actions/Escape; old cleanup cannot steal focus, dismiss the new modal or release its root isolation. | Real detail-to-confirm handoff, repeated Escape and final focus/root-isolation assertions. |
| Light/dark, all six languages, compact/enlarged layout, keyboard present | Retain readable geometry, safe areas, maxWidth, bounded body scrollers and source offsets. Motion uses opacity/transform rather than animated height/layout. | Representative movement checks and existing table-driven multilingual layouts; native keyboard/font/accessibility checks recorded separately. |
| Background/unmount or unexpected animation-driver failure | Stop obsolete work. Background settles to the current logical endpoint; unmount cleans independently and cannot call presentation callbacks afterward. Failure uses immediate usable presentation and a bounded WARN. | Injected stale/failure/cleanup cases, real visibility changes and static-idle RAF observation. |

Representative existing artifact: use `tests/fixtures/app-v1-before-planning.json` unchanged through actual hydration, navigation, Settings and editor transitions, then real browser backup download, reviewed import and reload. Preserve legacy history, false preferences and user text; independently assert active run IDs/deadlines and audio ownership except for explicit accepted actions.

Meaning preservation: PASS — both requested transition families and the chosen visual style are retained. Proposed timings/reverse exits are identified as implementation choices. Existing domain behavior, the unanswered heading choice and deferred physical checks remain explicit.

## Verified Planning Context

- Installed manifest: Expo `~57.0.32`, Expo Router `~57.0.30`, React Native `0.86.3`, React Native Web `0.21.2`, React `19.2.3`; npm and committed package-lock.
- SDK 57 vendors React Navigation inside `expo-router`. There is no installed standalone `@react-navigation/bottom-tabs` package. Use public `Tabs` from `expo-router/js-tabs` and `useIsFocused` from `expo-router`; do not add external navigation packages or import vendored internals in app code.
- `_layout.tsx` currently specifies `animation: 'none'`. Installed `bottom-tabs/types.d.ts` supports named fade and `transitionSpec`. Its `BottomTabView.js` gives an explicit spec priority even when named animation is none; disabled motion must also use zero duration or remove the custom spec. Its transitionEnd can fire after interruption; focus is authoritative, not that event.
- The logo, header, tabs, ActiveActivities and shared notices live outside scene content. Keep them stable and preserve lazy route retention, route keys, backBehavior and provider placement. A stable scene layout can gate pointer/accessibility immediately without hiding the outgoing visual fade. Web inertness must be applied to scene DOM only; do not propagate an unfocused MotionScope into still-open portaled sheets.
- Sheet currently uses RN Modal fade/none and a single colored overlay. Introduce one custom progress owner with Modal animationType none so opacity/translation are not stacked with a second platform animation. Preserve KeyboardAvoidingView, 480 px max width, 94% tall sheets, insets and one body scroller.
- Native Modal onDismiss is iOS-only in the inspected RN source. Android visual-exit cleanup cannot depend on that callback. RNW Modal maintains an active-modal stack and focus trap; its trap captures an opener and restores it on unmount. Keep background isolation until actual portal dismissal/unmount, with idempotent independent cleanup.
- Planning's editor and date chooser currently unmount when their payload becomes null. History keeps Sheet mounted but clears its details payload immediately; its Delete action opens a separate confirmation. Settings Close resets section immediately and conditionally unmounts BackupSettings on logical hide. These call sites must participate in exit retention/cancellation rather than relying solely on an animated wrapper.
- `useBackupTransfer` currently cancels on unmount; retaining its view requires a logical-active lifecycle bridge. `MotionScope` only suspends press motion; it does not disable transfer actions, TextInputs or duration wheels.
- EditorBody deliberately keeps the draft FlatList laid out and inert while covered. Incoming-only subpanel animation avoids retained outgoing wheel listeners/autofocus; preserve temporary-part cancellation and the stable-ID, deferred source-ref focus/offset restoration.
- Existing interaction, wheel, scrolling, backup, theme/language and notification tests provide behavior coverage, but do not prove the new scene/sheet movement or its interruption lifecycle. Keep their assertions and budgets intact.
- Read-only parallel reconnaissance inspected the navigation and sheet/panel surfaces separately. It made no source edits or runtime claims.

Official references checked: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [SDK 57 Router API](https://docs.expo.dev/versions/v57.0.0/sdk/router/), [JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/), [Animated 0.86](https://reactnative.dev/docs/0.86/animated), [Modal 0.86](https://reactnative.dev/docs/0.86/modal). Generic navigation docs are guidance; installed SDK 57 public exports/types govern integration.

## Commit Plan

Advisory checkpoints only. Do not automatically commit, push or open a PR during implementation.

- After tasks 1–3: `feat(navigation): add accessible screen fade transitions`
- After tasks 4–7: `feat(ui): animate sheet presence and incoming panels`
- After tasks 8–10: `test: verify and document screen and sheet transitions`

## Tasks

### Phase 1: Shared presentation foundation and routes

- [x] Task 1: Add transition tokens and injected finite presentation controllers.
  - Files: `src/theme.ts`, new `src/hooks/transitionMotion.ts`, new `tests/transitionMotion.test.ts`, `package.json`.
  - Deliverable: keep existing press tokens intact; add the proposed route/sheet/panel values. Implement injected visual controllers for sheet presence and incoming-panel entrance, without React/native/storage/core imports. Sheet state distinguishes requested-open, presented, entering/open/exiting/closed and current generation. Panel identity is semantic, not a serialized child tree.
  - Subscribe to no OS source here. Accept committed policy and host-ready/layout signals from the bridge. Supersede stopped callbacks before stopping a driver; reverse from current progress; initial closed state does not emit a dismissal. An initial/reopened view cannot disappear when an older exit finishes.
  - Reduce motion/background settles to the latest requested endpoint; a static foreground return does not restart. Unmount releases work without calling deferred presentation callbacks. Unexpected start/stop failures must leave usable immediate endpoints, and cleanup steps remain independent.
  - Verification: register the new file in npm test immediately. Cover open/close before readiness, rapid reopen, same/new identity, stale completion, policy changes mid-transition, background/return, disposal/reactivation, failure fallback and at-most-once presentation completion. Tests assert observable state/callback ownership, not just constants. Refresh the command catalog after editing package.json.
  - Logging: bounded WARN only for unexpected driver failures; cancellation/settling stays quiet. No session, draft, frame or successful-transition logs.
  - Requirements: R2–R5, R7, R10; presence, policy and interruption combinations. Dependencies: none.

- [x] Task 2: Bind presentation controllers to Animated and provide a stable incoming-panel frame.
  - Files: new `src/hooks/useSheetMotion.ts`, new `src/components/PanelTransition.tsx`; extend `tests/transitionMotion.test.ts` for bridge-contract cases where necessary.
  - Deliverable: stable per-instance Animated.Value/driver and committed-prop lifecycle, reading the existing `useMotionPreference`. Use opacity/translateY only, native driver on mobile, web driver on web and isInteraction false. Do not publish per-frame React/provider state or poll for completion.
  - Sheet bridge exposes rendered presence, current interaction eligibility, progress styles and a generation-scoped after-close notification. Separate logical close from actual visual removal. Measure the existing surface before full-height entrance and coordinate native onShow/layout readiness; a missing/zero measurement cannot strand an invisible modal. Size changes must converge to the current endpoint without changing scroll layout.
  - PanelTransition accepts semantic identity and active/readiness, preserves its children/component identity and layout, and animates incoming content only. It stops under cover, closes, reduced motion or inactivity. Do not put a changing key on drafts, providers, routes, the editor list or this wrapper. Normal input/notice/theme renders do not restart it.
  - Verification: typecheck the real native/web APIs and ref/style composition. Exercise first paint, live policy, zero geometry and stale ready/after-close callbacks through the controller and later browser pilot; never expose a test-only public animation API.
  - Logging: preserve task 1's bounded failures; no per-render/frame or normal focus logs.
  - Requirements: R2–R4, R6–R8, R10; readiness, lifecycle and incoming-panel combinations. Depends on task 1.

- [x] Task 3: Enable navigator-owned route fades and immediate outgoing-scene input isolation.
  - Files: `src/app/_layout.tsx`, new `src/components/NavigationScene.tsx` and `.web.tsx`, new `tests/e2e/navigationTransitions.spec.ts`.
  - Deliverable: import the public SDK 57 Tabs entrypoint, retain the route tree/custom tab bar, and configure named fade with the shared duration. Use live reduced/activity policy for both the animation name and explicit transitionSpec (zero-duration when disabled).
  - Add a stable screenLayout using route focus from expo-router. Keep flex/minHeight and mounted scene/scroll state. Gate pointer and accessibility participation immediately on blur; web uses DOM inertness without immediately hiding the outgoing visual. Keep the header, activity controls, tab bar, notices and global providers outside the fade.
  - Preserve existing tabPress/defaultPrevented, Link href/keyboard behavior, direct URLs, router.navigate from activities/notifications and Back. Do not delay navigation or gate domain work on transitionEnd. Preserve open portaled sheets when an underlying route changes; apply gates to the scene host, not inherited modal policy. Do not add a second route animation owner.
  - Verification: a real normal-motion pilot observes intermediate opacity plus neutral final scene; same-tab and rapid navigation; outgoing input/a11y exclusion; retained route state. Existing Link and cross-tab activity scenarios must still pass.
  - Logging: retain existing recoverable navigation/platform warnings only; no route names/transition logs on routine use.
  - Requirements: R1, R4–R6, R8–R10; navigation and portaled-sheet combinations. Depends on tasks 1–2.

### Phase 2: Shared sheets and current subpanels

- [x] Task 4: Give Sheet one cancellable visual presence owner and separate backdrop/surface motion.
  - Files: `src/components/Sheet.tsx`, `src/hooks/sheetIsolation.ts` and `.web.ts` only if concrete integration requires it; new `tests/e2e/sheetTransitions.spec.ts`.
  - Deliverable: use the bridge with Modal animationType none; animate a separate absolute backdrop and the existing measured surface. Preserve overlay/keyboard avoidance, surface bounds, safe-area padding, heading/Close placement, TimingNotices and scrollable/non-scrolling modes.
  - Keep visible as logical intent and add an explicitly presentational onAfterClose contract for retained callers. Closing surfaces stop accepting pointer/keyboard/backdrop/Escape/confirm actions promptly, while root isolation remains until actual dismissal. Native exit completion works on Android without onDismiss; web release follows actual portal removal and unmount is always an independent fallback.
  - Coordinate focus with platform Modal readiness. Only the current eligible destination may receive initial/return focus; repeated Close/Escape cannot affect an underlying/new modal. Old completion or cleanup cannot release a newer presentation's isolation or focus it away. Preserve existing actual host refs.
  - Verification: common Settings/confirmation pilot, normal/reduced opening and closing, early close/reopen, overlapping sheet handoff and root isolation. Avoid stacking platform/custom animations or relying on arbitrary cleanup timers.
  - Logging: WARN only on unexpected presentation/platform failure, with immediate usable fallback. Routine dismissal/cancellation stays quiet.
  - Requirements: R2, R4–R10; modal readiness, overlapping presence, focus and geometry combinations. Depends on tasks 1–3.

- [x] Task 5: Retain conditional sheet payloads while stopping logical effects immediately.
  - Files: `src/app/planning.tsx`, `src/app/history.tsx`, `src/components/ScheduleEditorSheet.tsx`, `SettingsSheet.tsx`, `BackupSettings.tsx`, `src/hooks/useBackupTransfer.ts`; relevant transition/backup tests.
  - Deliverable: adapt editor/date chooser/details/Settings callers so a logical close can finish its visual exit. Retain at most the current display payload and presentation identity; release it only through matching onAfterClose. Give new editor sessions fresh identities without remounting an active draft on unrelated renders. Guard stale completion when the same or another payload opens.
  - Save, Confirm/delete, Apply, permission requests and imports keep their current validation and execute exactly once at acceptance. Only view removal/reset may follow motion. Preserve History details-to-delete confirmation handoff without stale content or competing focus traps.
  - Settings cancels preview immediately on close/leaving Sound, retaining only the outgoing visual section until exit. Give BackupSettings/useBackupTransfer a logical-active lifecycle so pending reads/export/import work is cancelled/fenced immediately even when presentation stays mounted. A hidden transfer cannot import, open a chooser or publish late success; reactivation initializes the normal usable state. Preserve global real completion audio.
  - Dismiss keyboards and exclude logically closed fields/controls from focus and interaction. MotionScope alone is insufficient for wheels, text fields or operation owners. Keep existing teardown semantics on actual unmount as well.
  - Verification: close/reopen different and same editor/date/session; immediate Save/Confirm counts; held file/native-audio preparation then close and late resolution; real import review cancellation. Use existing controller cancellation coverage and extend it only for the newly retained lifecycle.
  - Logging: existing operation WARN/ERROR behavior; no display payload/transfer content or normal lifecycle logs.
  - Requirements: R5–R10; conditional payload, accepted-action, cancellation and handoff combinations. Depends on task 4.

- [x] Task 6: Animate incoming Settings groups and backup-review content without replaying on updates.
  - Files: `src/components/SettingsSheet.tsx`, `BackupSettings.tsx`, `PanelTransition.tsx`; navigation/sheet transition tests and existing backup/interactions scenarios.
  - Deliverable: enter the seven existing Settings groups and Back through the stable panel frame, driven by group identity. Animate the real backup operations-to-review/Cancel change with a bounded semantic identity; status/error text and busy ticks are not new panel transitions.
  - Preserve current checked/selected updates, opener/group refs, scroll behavior, real file chooser/download activation and immediate preview/Stop. Language/theme changes must update the current content without remounting or restarting its entrance. Avoid retaining obsolete outgoing group components/duplicate transfer owners for a crossfade.
  - Restore Back focus only after the current destination is laid out and ready; fence stale focus completion after close, another group or a new sheet. Keep the existing section reset on a genuinely new Settings opening.
  - Verification: normal/reduced group and Back movement, selected values during entrance, rapid Back/Close, real file-review transitions, current source focus and unchanged clocks/audio. Reuse all-language layout coverage rather than duplicate its full product per control.
  - Logging: no new routine logging; preserve existing failure notices/warnings.
  - Requirements: R3–R10; Settings, transfer, focus and live-copy combinations. Depends on tasks 2, 4–5.

- [x] Task 7: Animate incoming Planning panels while preserving the mounted whole-editor list.
  - Files: `src/components/ScheduleEditorSheet.tsx`, `EditorBody.tsx` and `.web.tsx` only as required for the presentation frame; existing calendar/repeat/duration components; transition/editor/scroll/wheel tests.
  - Deliverable: enter duration, calendar, repeat, discard and the returned editor through semantic active-panel identity. Keep the existing bounded ScrollViews and one stable virtualized FlatList; no changing keys, animated heights or extra vertical ScrollView around it. Preserve draft text, stable IDs, header/footer, count, Save and current heading placement.
  - Outgoing subpanels unmount promptly rather than keeping live wheel/autofocus trees for an exit. Closing duration still cancels pending motion and discards temporary values; Apply retains finite/busy guards. Whole-sheet exit uses task 5's separate logical-active rules.
  - Refine restoreList so layout/offset can restore when the list is laid out, but source focus waits for the current destination readiness. Retain pending stable-ID ref registration for virtualized rows. A stale readiness callback cannot focus or scroll a newly opened panel; preserve opening offset when layout is unchanged.
  - Verification: many-step/50-step editor, typing without entrance replay, coast-then-Cancel/Back, Apply/Save once, invalid/disabled states, discard/continue, calendar/repeat return, source focus and ancestor/list offsets under both motion policies.
  - Logging: preserve operation errors only; no row/frame/offset/draft logs.
  - Requirements: R3–R10; editor, wheel, virtualization and focus combinations. Depends on tasks 2, 4–6.

### Phase 3: Integration evidence and documentation

- [x] Task 8: Complete durable transition, accessibility and continuity regressions.
  - Files: `tests/transitionMotion.test.ts`, `tests/e2e/navigationTransitions.spec.ts`, `sheetTransitions.spec.ts`; targeted extensions to existing interactions/editorScrolling/sheetScrolling/backup/usabilityLayout/notification tests only for actual gaps.
  - Deliverable: cover every material reconciliation row with real pointer/keyboard actions, native browser animation frames and reduced-motion emulation. Observe intermediate opacity/translation under normal motion, then convergence; under reduced motion assert immediate usable endpoints. Do not expose test-only controls or public animation state.
  - Include rapid navigation, same-route activation, close during entrance, reopen during exit, live reduced-motion/background changes, overlapping detail/confirmation, missing opener and unmount, and current modal retained across underlying programmatic navigation. Verify one interactive/a11y destination and no invisible overlay/focus trap left behind.
  - Use the unchanged literal legacy fixture through hydration, unsaved editor/panel changes and actual backup download/review/import/reload. Assert preserved history, false preferences, text, concurrent timing IDs/deadlines and real audio/Stop ownership. Keep gesture-bound APIs in their original accepted event.
  - Include six-language light/dark compact/enlarged layout samples with representative route/sheet/panel motion. Preserve existing wheel inertia, scroll takeover, one-body ownership, focus/offset and disabled-action assertions. Check idle animation work on a static scene after stopping the test observer itself.
  - Use bounded eventual assertions/frame samples, no arbitrary sleeps, timeout inflation, retries or broad assertion removal. Wait for fonts/layout before coordinate holds, retaining genuine cancelled-vs-accepted actions.
  - Logging: failure diagnostics only; screenshots/traces remain ignored and contain no dumped app storage.
  - Requirements: R1–R10 and all supported combinations. Depends on tasks 1–7.

- [x] Task 9: Complete the mandatory documentation checkpoint through `$aif-docs`.
  - Files: `README.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `AGENTS.md`; this plan's progress section.
  - Deliverable: explain actual route fades, slide-up sheets, incoming panel motion and live Reduce motion. Map the navigator, presence/entrance controllers, retained caller lifecycle and new tests without implying a new saved setting or timing owner.
  - Preserve prior interaction/scrolling documentation and the pending heading decision. Distinguish actual browser/Node/export results from pending physical native smoothness, keyboard, Back and screen-reader checks. Record any supported runtime limitation rather than claiming universal physical verification.
  - Localize any necessary new visible copy through all six catalogs; no new copy is currently expected. Keep generated docs English and Original Request verbatim. Validate the modified relative links.
  - Logging: none for documentation; no report artifact or unrelated documentation rewrite.
  - Requirements: R1–R10 and the existing-work boundary. Depends on tasks 1–8.

- [x] Task 10: Run final quality gates against the completed source and record native deferrals.
  - Files: this plan's progress/evidence; only implementation/test files if actual failures require correction. Preserve package-lock, native configuration and existing Playwright budgets.
  - Deliverable: refresh declared-command hashes after final package edits, run npm test/lint/typecheck, both new transition specs and affected existing navigation/sheet/transfer/wheel/layout scenarios, then all-platform export to ignored output. The shared primitive change justifies a full browser coverage pass; use bounded invocations if this host's long-running session limit prevents one uninterrupted command. Track declared case identities and failed/rerun evidence honestly.
  - Bind results to actual source/test/config hashes and command source; a planning baseline or declared command is not implementation evidence. Inspect the scoped diff for stale state, duplicate owners/subscriptions, idle loops, effect cancellation lag, unguarded focus/exit callbacks and changed scroll/heading behavior.
  - Keep physical Android/iOS animation smoothness, native-driver behavior, keyboard avoidance, Android Back, safe areas and TalkBack/VoiceOver pending under the user's device-test deferral. Bundle exports establish bundling only. Do not install an APK or claim a phone result without renewed task scope and an available runtime.
  - Preserve the existing localhost preview. Do not automatically commit/push/merge. Mark only checks actually performed complete and retain pending acceptance explicitly.
  - Logging: concise command/failure evidence; normal runtime logging remains WARN/ERROR-only.
  - Requirements: R1–R10; final cross-platform and continuity acceptance. Depends on tasks 1–9.

## Planned Commands and Evidence Contract

Read-only discovery: `ai-factory commands --json` at repository root. Catalog revision: `ccc8e8ce5ae283e86ff698f09e2ee021c12a8a1d9e4e5d9665e13645210f0780`.

- `package.json` SHA256: `1ce9d18a04797c2b472f85fb54d9b56afe5b53c1050582f428a9a1992570e59d`.
- `package-lock.json` SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`.
- All listed command IDs use CWD `.`. Refresh catalog/source hashes after immediate registration of the new Node file and any later manifest change. No unresolved command ambiguity was found.
- Use the established Windows Node.js 24+/npm toolchain from WSL. Playwright reuses localhost:8091. Outputs below remain ignored.

| Command ID | Planned invocation | Evidence |
|---|---|---|
| `package.json#/scripts/test` | `npm test` | Registered controller/lifecycle and existing deterministic regressions. |
| `package.json#/scripts/lint` | `npm run lint` | Required lint. |
| `package.json#/scripts/typecheck` | `npm run typecheck` | Required strict native/web/router prop/ref compatibility. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/navigationTransitions.spec.ts tests/e2e/sheetTransitions.spec.ts tests/e2e/interactions.spec.ts` | Real route/sheet/panel movement, current input, policy, focus and interruption. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/editorScrolling.spec.ts tests/e2e/sheetScrolling.spec.ts tests/e2e/planningButtons.spec.ts tests/e2e/durationPicker.spec.ts tests/e2e/durationInertia.spec.ts` | Existing gestures, drafts, virtualized return and disabled guards. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/backup.spec.ts tests/e2e/crono.spec.ts tests/e2e/usability.spec.ts tests/e2e/usabilityLayout.spec.ts tests/e2e/notifications.spec.ts` | Real artifact/transfer, sharing, independent activities, layouts and navigation compatibility. |
| `package.json#/scripts/test:e2e` | `npm run test:e2e` | Final declared browser coverage; bounded selections may complete interrupted runs with exact case/source accounting. |
| `package.json#/scripts/export` | `npm run export -- --output-dir .expo/screen-sheet-transitions-export` | Android/iOS/web bundle compatibility only. |

## Progress and Planning Evidence

- User selected short screen fades and slide-up sheets; full planning, tests/docs/minimal logging are reused from earlier explicit preferences.
- Two read-only reconnaissance agents inspected installed navigation and sheet/panel lifecycle sources. No application changes, tests, package acquisition or device actions were performed by them.
- Expo SDK 57, installed public Router exports/vendored tab types, React Native 0.86 Animated/Modal and RNW Modal focus/presence internals were inspected. Native onDismiss platform limits and explicit transitionSpec precedence are recorded above.
- No research/roadmap artifact applies. The older heading/Close decision remains pending and does not authorize moving it in this feature.
- Source baseline: clean master `8a27740326fc429a75b3c84ad55b652863a1eafd`; 462 tracked files were snapshotted outside the repository before creating the new branch. Final planning integrity checks confirmed every tracked file remains byte-identical and only this plan was added. The exact Original Request, ten unchecked task IDs, per-task file/logging/requirement details, backward dependencies, existing command targets and whitespace were checked.
- Planning baseline validation: `npm run lint` and `npm run typecheck` passed (exit 0) using Windows Node/npm on 2026-11-10. These results validate the unchanged starting application, not the unimplemented transitions. Node/browser suites and exports were not repeated during planning.
- At planning completion, all ten tasks were unchecked. Those command declarations and earlier feature results did not establish implementation acceptance; actual implementation evidence follows below.
- Physical native transition/keyboard/accessibility acceptance remains pending/deferred.

- Task 1 implementation: ten new injected-controller tests and all 267 registered Node tests pass; typecheck/lint pass. Driver failure fallback, stale/synchronous callbacks, early close, reopen and live policy settling are covered. Test registration and command catalog were refreshed.

- Task 2: stable Animated bindings and incoming-only PanelTransition compile with the installed native/web types; lint passes. Readiness is tied to current semantic identity and active policy; actual route/sheet pilots follow in tasks 3–4.

- Task 3: all three real navigation pilots pass (26.8s), including intermediate opacity, outgoing DOM isolation, rapid navigation/state continuity and live reduced motion/History Link. Typecheck/lint pass. SDK 57 deliberately omits isInteraction from the public navigator transitionSpec type; the navigator owns its finite route animation, while custom sheet/panel drivers remain non-interaction animations.

- Task 4: shared sheets use measured translation and a separate fading backdrop. All 12 sheet/button pilots passed after correcting focus return to occur after web isolation release; all three sheet pilots passed again after the final forwarded-ref cleanup. Lint/typecheck pass. Outgoing controls are intentionally excluded from role queries; the existing background-reset test explicitly inspects its hidden control.

- Task 5: added a bounded token-guarded useSheetPresentation helper and explicit transfer activation/disposal. All 268 Node tests, lint and typecheck pass. Three literal-legacy backup journeys and two new retained-editor/held-real-file cancellation scenarios pass. The initial multiword CLI grep was rejected as no tests found; the corrected selection was actually executed.

- Task 6: Settings groups/Back and real backup review/Cancel animate incoming content by semantic identity. Both new browser pilots pass, including live theme/language selection without replay and focus after Back readiness. Lint/typecheck pass.

- Task 7: all six editor scrolling cases, five Planning inertia cases, the new incoming-panel/draft/focus pilot and the fifty-action apply/reorder/removal journey pass. Lint/typecheck pass. A first test observer selected the intentionally hidden retained editor instead of the discard panel; it now samples the visible presentation, and the unchanged behavioral assertions pass.

- Task 8 environment findings: all 22 sheet cases passed on the development preview, and all seven final navigation cases have passing development evidence. External activity navigation retains an open editor; browser Back to an entry outside the navigator restores the document and drops transient UI, so it is checked for URL/data/isolation cleanup rather than retaining an unmounted route. The public js-tabs export aliases the prior deprecated Tabs export; Back behavior is unchanged.
- Frozen-clock functional fixtures now select Reduce motion explicitly: pausing the browser clock also pauses animation frames. The original failing Sound entry was reproduced at the unchanged 45-second budget. Normal-motion transition cases retain real browser frames. The long Sound selections/playback test was split into two bounded journeys preserving its original assertions; all eleven Sound cases pass on the development preview.
- Repeated Metro reload latency reached the scenario budget at the final reload of the literal legacy editor/export/import journey; its domain assertions passed before that reload. A separate exported preview on localhost:8092 is being prepared for integration/full coverage. The ignored Playwright override changes only testDir resolution, baseURL and automatic server startup; browser, worker, retry and timeout settings inherit the tracked config. localhost:8091 remains running. All-platform export is run now as this verification prerequisite; task 10 still requires final source-bound coverage and audit.

- Task 8 complete: all 44 final transition/backup scenarios pass on the exported preview (1.4min), including the full literal legacy editor/panel/file journey. All 268 Node tests and current lint/typecheck pass. The all-platform export passed before this browser pass and provides the separate preview; final full coverage/audit remains task 10.

- Task 9 complete through aif-docs: README, DESCRIPTION, ARCHITECTURE and AGENTS now describe actual transitions, cancellation boundaries, module/test maps and native deferrals. Meaning preservation: N/A — no requirements rewritten; the prior heading decision is preserved. Technical/readability review PASS for the scoped edits; all 45 existing/added relative document links and anchors resolve, and whitespace checks pass. Existing README length is retained under this feature's explicit no-restructure scope; no unrelated documentation move/rewrite or new docs page was added.

- Task 10 fixture reconciliation: the first full exported-preview attempt was intentionally stopped after reproducing fixed-Date animation stalls, a fake-clock pause target overtaken by the newly added media-emulation call, and label-based fills reaching inert incoming inputs. Fixtures now select Reduce motion before freezing Date/time, keep pause targets safely ahead of installation, and use accessible textbox roles for current fields. The three original stopwatch/duration failures pass in the 54-case check. That check exposed six deep-scroll assumptions; all 29 Planning scrolling cases now pass after measuring the actual content viewport and using bounded repeated real wheel input while virtualized rows are measured. Assertions, budgets and retry policy are preserved. No application source changed after the successful all-platform export; the complete suite is restarted against the final test sources.

- Task 10 focus regression: the next full attempt reached 371 passes and four failures, all existing foreground theme-refresh cases. Sheet was forcing Close focus again after inactivity. It now remembers the active web modal's eligible control before suspension, ignores background trap focus, restores that control only in the active dialog, and initializes native focus once per logical opening. The four original failing cases pass against the rebuilt export; shared-sheet/theme coverage is being completed before the final full rerun. Native physical focus/accessibility acceptance remains deferred.

- The focus fix passes all 60 targeted sheet/theme scenarios (2.3min), including all four original foreground-refresh failures. Fresh all-platform export, lint and typecheck pass. Final full coverage restarts against this unchanged rebuilt source.

## Final Implementation Evidence

All ten tasks are complete. The original shared heading/Close decision remains separate and unanswered. Physical Android/iOS motion smoothness, native-driver behavior, keyboard avoidance, safe areas, Android Back, TalkBack/VoiceOver and native large-text acceptance remain pending under the user's device-test deferral.

| Gate | Actual result on final implementation |
|---|---|
| `npm test` | 268 passed, 0 failed/skipped; 5.2s |
| `npm run lint` | Exit 0, no warnings/errors |
| `npm run typecheck` | Exit 0 |
| `npm run export -- --output-dir .expo/screen-sheet-transitions-export` | Android, iOS and web exports pass after the focus fix; bundling evidence only |
| `npm run test:e2e -- --config .expo/transitions-static.config.ts --output .expo/transitions-release-full` | **405/405 pass in one full run, 19.0min**, 1 worker, no retries; all 405 distinct full case identities match the final declared catalog |
| Integrity / documentation | No implementation/test/config/asset/export/helper drift; scoped diff/whitespace and relative-link review pass; light editor and dark repeat screenshots inspected |

Commands run at repository root (`.`), using Windows Node 24/npm from `D:\App_Crono`, corresponding to `/mnt/d/app_crono`. Command IDs are `package.json#/scripts/test`, `/lint`, `/typecheck`, `/test:e2e`, and `/export`. Refreshed catalog revision: `c54d7f16912dcacf5df9477c32a0299d47f778057547836f1a5a713b1797e534`; package source SHA256: `7828541c0b1a300208c37f4dffa92707a8798f1a6a52b79ba5c704d8c6267013`; unchanged lock SHA256: `3fd807ba9f864ec2d3a5f4b465a103c112cd3a33ea9b1e07c27f8fa05bc66d66`.

Final implementation/test/config/asset fingerprint: `aa854ac569ac11312d82fffe437590dc13da3f0f1fa49a6c64bec4d51eb067a5` — SHA256 of compact, key-sorted JSON mapping each of 213 relative paths to its byte SHA256. The map covers files under src/tests/modules/assets, excluding generated module build/node_modules directories, plus package.json, package-lock.json, app.json, eas.json, playwright.config.ts and tsconfig.json. Documentation/plans and ignored validation output are separate from this runtime/test fingerprint.

The actual ESLint configuration is `eslint.config.cjs`; it was omitted from that historical 213-file manifest. Separate verification confirms that it is unchanged from HEAD, its byte SHA256 is `5648e960ff1838486a496e53d749090aa63cad60c74feb6c8a0297e3ec586794`, and current lint passes. This correction preserves the original manifest, fingerprint and full-run evidence rather than expanding their recorded scope retroactively.

Final all-platform export fingerprint: `8a75de7d37a9cab2c553dff68de49caeb5e18cc8c5faca8d016b1d0f26e27c50` (same mapping method, 76 generated files). The ignored verifier config SHA256 is `02e1411e0afadde8885cf4205ef1d9d1558804ea57fb49b18c8ce5c8dc5fb23a`; the local static-server helper SHA256 is `a7fcab15c91499c2c6a292a906ff189baaf5e034130cb49cc4d3ca86502c6723`. The override inherits all tracked browser/worker/retry/timeout settings and only resolves testDir, changes baseURL to localhost:8092, and disables automatic dev-server startup. The tracked Playwright config is unchanged. Development preview localhost:8091 was preserved; the final exported preview uses localhost:8092.

The earlier interrupted runs and corrected findings remain recorded above; they are not substituted for this final complete passing run. Logs, source maps, case catalog, coverage reconciliation, exports and screenshots remain ignored under .expo. No dependency, persisted schema, sound asset, native configuration or timing/audio/notification owner changed. No commit, push, PR, merge or device installation was performed during implementation.
