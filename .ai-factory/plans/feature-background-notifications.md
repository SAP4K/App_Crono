# Implementation Plan: Background and Lock-Screen Notifications

Branch: `feature/background-notifications`
Created: 2026-11-06
Mode: full
Status: code, automated verification and documentation complete; 14/15 tasks complete; task 13 physical native acceptance pending.
Current task: 13 (requires rebuilt native binaries and physical Android/iOS devices).

## Original Request

adauga te notificari de sistem cand ecranul este blocat sau cand ne aflam pe ecranul principal, adica nu in aplicatie

## Settings

- Testing: yes — pure projection, injected native scheduling/races, persistence, browser regressions, and physical Android/iOS checks.
- Logging: minimal — WARN/ERROR at failed native/storage boundaries; no routine scheduling logs or saved user text in logs.
- Docs: yes — mandatory `$aif-docs` checkpoint; existing documentation stays in English.
- Planning depth: full, reusing the user's earlier detailed-plan preference. Tests, documentation and minimal logging also reuse prior answers.
- Platforms: Android and iOS local notifications. Web retains the existing in-app notices/audio and explains that mobile system notifications are unavailable there.
- Proposed event default: timer completion, every non-final schedule action, and one schedule-complete notification for the last action. This follows the user's earlier each-action/final alert choice; no duplicate final-action notification.
- Proposed sound default: play the selected bundled pattern once; `timerSound: false` makes system notifications silent without disabling their visual delivery. The existing 5/15/30-second looping duration remains a foreground setting.
- The two optional async questions about event coverage and background sound have not received answers at plan creation. The preceding two bullets are disclosed planning assumptions, not recorded user answers; revise them if the user chooses another option before implementation.
- Implementation was explicitly requested through `$aif-implement` after this plan was presented. The proposed defaults remain the implementation scope unless the user steers them differently. Commit checkpoints are deferred; no automatic publishing is included.
- Add a saved `systemNotifications` preference, default `true`, independently from OS authorization. First-use permission is requested only from an explicit start/resume/enable action, never merely from hydration.
- No remote push service, accounts, server, device push token, background JavaScript worker, ongoing background audio, full-screen alarm, critical-alert entitlement, browser push, calendar schedule, or new history behavior is included.
- This invocation creates this plan and its local branch only. It does not implement, install packages, submit builds, commit, push or merge.

## Requirements Reconciliation

Authority: the current explicit request extends background behavior. Earlier choices remain in force where compatible: independent clocks, automatic schedule advancement, one active schedule, saved language/theme, tests/docs, and minimal logging. The previous foreground-only alert choice and README/DESCRIPTION statements describing no system notifications are the old baseline; this request supersedes that restriction for native local notifications. Foreground playback and silent historical catch-up remain unchanged.

| Decision | Source and relationship | Verification |
|---|---|---|
| Notify outside the app, including Home and locked screen | Current Original Request; Android/iOS are the primary platforms in `AGENTS.md` | Rebuilt Android/iOS app tested on Home and while locked, with JavaScript suspended |
| Schedule future deadlines while the app can run | `timerCompletion.ts:reconcile`, `planningRunner.ts:reconcile` stop their JS scheduling while inactive; pure timer/run snapshots already contain deadlines | Adapter calls occur after accepted state changes, before background completion callbacks would be needed |
| Keep a single data owner and a separate OS side-effect owner | `ARCHITECTURE.md` — Dependency Rules / User Actions and Persistence; `useStopwatch.update/getSnapshot` | Native operations never occur inside pure transitions or updater functions; no second persisted clock store |
| Preserve event identity but distinguish changed deadlines/content | Same-run pause/resume changes deadlines in `core/timer.ts` and `core/planning.ts`; user selected saved language/sound | Old async results cannot cancel or revive a newer request, including rapid same-run resume and language cycling |
| Proposed each-action/final scope and one selected clip | Earlier each-action/final sound answer, existing four sound IDs; optional current questions remain unanswered | Assert the assumed scope explicitly; alter projection/sound policy if the user answers differently |
| Permission and delivery are independent from a saved opt-in | Native permission rules [D2, D4]; independently restored preferences in `core/stopwatch.ts` | Denial/revocation/limited permission does not reset clocks or silently disable the saved choice |
| Avoid a new destructive hydration failure | `DESCRIPTION.md` — Known Follow-up Work 1; `useStopwatch` currently becomes ready after a failed read | Failed hydration cannot schedule fallback-state requests or erase existing valid native requests |
| Native source/config checks are required | `AGENTS.md` — Expo/CNG/Validation; [D1–D8] | Versioned docs and installed APIs checked; no hand-edited generated native projects; device evidence remains separate from exports |

Supported combinations are bounded to the requested feature. State changes below refer to accepted application updates; failed/rejected domain operations must not disturb existing valid requests.

| ID / accepted input and validation | Persisted state | Output / next transition | Effects and invariants | Verification scenario |
|---|---|---|---|---|
| C1: native, loaded data, enabled, permission granted, running timer | Existing timer run/deadline unchanged | One future timer-complete descriptor | OS request armed in advance; expiry on Home/lock needs no JS callback | Injected request test and real locked timer |
| C2: running schedule with 1–50 validated actions, optionally concurrent timer | Existing run snapshot and cumulative deadlines unchanged | Remaining action boundaries; last is schedule-complete only | At most 50 planning requests plus one timer; no background state writes needed for advancement | Maximum-bound projection and multi-action locked run |
| C3: deadline occurs while foregrounded | Existing domain completion/notice | Existing in-app feedback and foreground sound policy | Explicitly suppress OS foreground banner/list/sound/badge to prevent duplicates | Real foreground native check plus existing browser audio regressions |
| C4: pause/reset/restart/resume or confirmed schedule replacement | Existing transitions only; same run may have a new deadline | Remove obsolete requests; resume/start project new future deadlines | Owner-specific diff; timer and schedule cannot cancel each other's valid requests | Delayed native resolve after pause/reset and same-run resume |
| C5: idle, paused, completed or overdue hydrated/returned data | Existing restoration/catch-up semantics | No retrospective OS alert; only future boundaries remain | Catch-up does not replay foreground audio; delivered notifications are not treated as new events | Legacy fixture, delayed return, hydration and already-completed cases |
| C6: opt-in off, permission undetermined/denied/revoked, limited iOS authorization | Boolean preference remains independent; no saved OS grant | Off cancels owned requests; blocked/limited capability is visible | No repeated permission prompts; timers still run; permission refresh on return | Denial, limited authorization, revocation and Settings-return tests |
| C7: sound muted, selected sound changes, or duration changes | Existing sound ID/mute/duration values preserved | Muted visual notifications; changed sound affects future content/channel | No native loop; duration-only change is a native scheduling no-op | Four sound mappings, silent channel and unchanged deadline assertions |
| C8: language changes; theme/haptics/history change | Language/theme/user text/clocks retain their normal semantics | Future content localized in ro/en/ru; unrelated changes are no-ops | Native replacement does not recreate timing/audio owners or rename user text | Rapid ro→en→ru→ro with pending promises; theme/history no-op assertions |
| C9: initial storage read fails | Existing saved data is unknown, not empty | Notification capability unavailable until a successful app hydration | Do not enumerate-and-delete or create from fallback data; retain the existing storage warning | Valid native pending requests survive a simulated read failure |
| C10: cold/warm notification tap, including old run or malformed payload | No timing/history mutation | Valid timer/planning payload opens only `/timer` or `/planning` | Buffer until hydration/fonts/router are ready; deduplicate initial/live response | Cold/warm/stale tap and invalid route/version tests |
| C11: schedule/cancel/list/channel call fails, or native operation completes after state changes | App data is unaffected | Partial/unavailable status and a retry route; latest desired state retained | Serialized diff, stale-result cleanup and bounded retry; no cancel-all shortcut | Deferred promise and partial failure tests |
| C12: web or unavailable native runtime | Existing foreground behavior and saved opt-in preserved | Unsupported capability explanation, no system prompt or native crash | No native notification module in the web dependency path | Browser startup/settings/localization and web export |
| C13: Android exact-alarm access missing, power saving, Focus/silent or OS channel restrictions | App data unaffected | OS-managed delivery; app explains relevant capability limits/settings | Never report a scheduled request as proof of punctual/audible delivery; no bypass of OS settings | Android special-access/idle tests and iOS sound/lock-screen settings checks |

Meaning preservation: PASS — the requested native background/locked delivery is retained; prior foreground behavior is preserved. Event/sound defaults are explicitly proposed, and OS timing/audibility and unverified native behavior are not strengthened into guarantees.

## Technical Decisions and Evidence

### Boundaries and projection

1. Add `src/core/notifications.ts` for framework-free semantic event/payload types, bounded validation and pure future-event projection. It may import core timing types/helpers; it must not import catalogs, React, Expo or storage. Project from the current timer deadline and schedule run snapshot, accumulating subsequent durations without extending deadlines. Filter `dueAt <= now`, including deadlines crossed during an async operation. Validate safe timestamps and supported indices. Preserve semantic IDs `timer:<runId>` and `planning:<runId>:<stepIndex>` separately from native request IDs.
2. Add `src/hooks/notificationCoordinator.ts`, an injected asynchronous controller. Inputs include fresh `getSnapshot`, hydration outcome, capability, clock, native inventory/schedule/cancel/dismiss functions and a descriptor formatter. It is not a timing runner and cannot transition clocks. One serialized worker coalesces requested reconciliations and re-reads the newest snapshot. Reuse identical future descriptors rather than cancelling/recreating everything.
3. Native physical IDs use a CRONO/version namespace and a fresh unique registration nonce, with validated ownership/event/deadline/content metadata in `content.data`. Do not reuse an identifier for distinct registration attempts: deadline/content hashes alone fail the ro→en→ro / stale-cancel race. Rebuild inventory from OS requests on successful hydration; do not create an AsyncStorage map of native IDs. Cancel only recognized CRONO-owned requests. Unknown/foreign requests remain untouched.
4. A successful schedule result is checked again against the latest desired state. Cancel its exact returned ID if obsolete, then continue towards the latest state. A failed cancellation remains tracked, is surfaced, and prevents claiming that obsolete alerts were removed. Bound retries to explicit retry/relevant state/lifecycle changes; avoid render loops. Schedule chronologically, retain unaffected requests, and expose arming/partial/failed status honestly. Registration is asynchronous, so immediate process death or an expiring first-use permission dialog is not promised to be atomic with Start.
5. Track already-consumed semantic events for the current reconciliation session so a clock rollback or duplicate lifecycle callback cannot recreate a delivered event; when the OS supplies delivered-notification inventory, use its validated event metadata during hydration. Do not infer “not delivered” solely because an ID is absent from the pending list. The existing app remains based on wall-clock timestamps; arbitrary clock changes are not a precision guarantee.

### Storage and lifecycle

6. Extend `useStopwatch` with a transient successful/failed hydration outcome, separate from `ready` and the dismissible error banner, plus a stable subscription for accepted updates. Notify subscribers after the accepted state/ref changes, outside updater functions; notify neither rejected/no-op changes nor display ticks. Initial successful hydration, including a successful empty read, is authoritative. Failed initial read disables notification mutation for that session and leaves the existing storage defect/fallback behavior otherwise untouched; no general storage repair is included.
7. Compose one stable notification owner in `CronoContext` through `useSystemNotifications`. Observe accepted updates promptly, rather than depending only on a later React render/effect or on AppState background time. Keep future native requests armed while active; suppress their foreground presentation through a native module handler. Backgrounding stops the existing JS/audio owners as before, but never cancels still-valid OS requests. Ordinary cleanup removes JS listeners/work and invalidates in-flight results; it must not clear all successfully armed requests for an active run. Restore ownership on next successful hydration.
8. On return, refresh permissions, run the existing silent catch-up and reconcile future requests using fresh time; order races so an old snapshot cannot re-arm an overdue request. Explicit reset/replacement/disable may also dismiss matching delivered notifications; merely opening the app does not clear unrelated notification history. Foreground/background boundary tests must cover nearly simultaneous native delivery and JS completion.

### Native adapter, sounds and permissions

9. Add `src/hooks/systemNotifications.ts` and `.web.ts` with a shared native-free contract in `src/hooks/notificationTypes.ts`. Only the native implementation imports `expo-notifications`/Android intent APIs. The web adapter reports unsupported and performs no scheduling/permission request. Use one-shot absolute-date triggers; inspect the installed SDK 57 declarations before implementation. No push token or headless remote-notification task is necessary for this design [D1, D3].
10. Install SDK-compatible `expo-notifications` and `expo-intent-launcher` through `npx expo install`, updating the committed lockfile. Configure the notifications plugin in `app.json`; retain `expo-audio`'s recording/background settings and leave remote background notifications disabled. Include the notification sound resources in the rebuilt binary. Do not hand-edit `ios/` or `android/`.
11. Preserve all existing WAVs and `src/audio/sources.ts`. Create only `assets/audio/notification_classic.wav` as a byte-identical copy of the retained `timer-complete.wav`: its hyphenated basename fails Android raw-resource naming validation in the SDK 57 plugin [D7]. Bell/digital/gong already have valid basenames. New `src/audio/notificationSounds.ts` maps stable sound IDs to native basenames. Existing PCM clips are Classic 1.02s, others 3s; validate copied bytes, names, channel/config coverage and supported format. They fit Apple's custom-sound constraints [D6]. No 5/15/30-second background looping is promised.
12. On Android, use a bounded stable set of channels: four sound-specific IDs plus one silent channel under a versioned CRONO prefix. Channel behavior is immutable after creation and user overrides win [D5]; do not keep generating channels to bypass blocked/silent choices. Language changes can update channel display names, not behavioral identity. Use selected filename on iOS and the matching Android channel; sound mute preserves visual delivery. Notification vibration remains OS-managed, independently from the app's button-haptic preference.
13. Persist only `preferences.systemNotifications`, default true; restore valid false independently under the existing version/key. OS authorization/capabilities stay transient and are queried at boot/foreground/settings. Android creates its channel before the request flow; iOS inspects authorization and granular alert/lock-screen/sound capabilities rather than treating every non-denial as full audible permission. Provisional/ephemeral/limited access is represented honestly. Never block or reset timing when permission is denied.
14. Request authorization from an explicit user start/resume/restart, confirmed schedule start/replacement, or Settings enable action. Coalesce simultaneous requests. Hydration, automatic action advancement, navigation, and ordinary re-renders cannot prompt. Start retains its timestamp and does not wait for the dialog; if permission arrives after a deadline, filter it instead of issuing a retrospective notification. Denied/non-askable status provides an Open Settings action and refreshes on return.
15. Configure Android `SCHEDULE_EXACT_ALARM` through app config and provide an Android 12+ Alarms & reminders settings action using SDK 57 IntentLauncher [D4, D8]. The SDK 57 native scheduling source uses exact alarms when access is available and falls back otherwise [D7]; scheduling success does not reveal the grant. Do not invent a `canScheduleExactAlarms` Expo JavaScript method or display an unverified “exact access granted” status. Explain potential delay and link to special access; use the documented app-settings fallback if the specific activity cannot open. No custom alarm native module or `USE_EXACT_ALARM` entitlement is planned. OS idle throttling, disabled channels, Focus/silent mode and force-stop remain platform constraints.

### Presentation, responses and compatibility

16. Add localized Settings controls/status/help through `Messages` and all three catalogs; update the current foreground-only audio help. Provide saved enablement, authorization status, explicit request/retry, relevant OS settings action, and a short explanation that notification sound plays once while duration controls apply inside the app. Show native registration failure/partial status in the shell and sheets via the existing notice pattern or a small `SystemNotificationNotice` in `TimingNotices`; notification errors must not replace timer/audio/session-save identities or close editors.
17. Build notification title/body through `src/i18n/notificationContent.ts`, preserving schedule/action names verbatim and selected language. Future content changes replace requests without resetting clocks/audio. Theme, button haptics, history and foreground duration alone are native no-ops. Independent timer/planning events at the same deadline both remain visible requests; foreground single-player arbitration is retained, while the OS controls simultaneous background sounds.
18. Handle native taps early, buffer until the interactive Router is ready, then navigate with Expo Router only. New `src/hooks/notificationResponses.ts` validates version/owner/event metadata into the fixed `/timer` or `/planning` route; `useNotificationNavigation.ts` binds it to the shell after fonts/storage/root navigation mount. Deduplicate initial and live responses and consume a handled initial response using the installed API. Ignore arbitrary payload URLs/actions. Old run notifications can open their screen but cannot start/resume/reset/replace activities.

### Official documentation checked on 2026-11-06

- **D1:** [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [Expo documentation index](https://docs.expo.dev/llms.txt), followed before choosing APIs.
- **D2:** [Expo SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) — date scheduling, scoped cancellation/inventory, permissions, foreground handler, config and sound resources. Recheck the actual installed module version/types after installation.
- **D3:** [Apple local-notification scheduling](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/SchedulingandHandlingLocalNotifications.html) — system-delivered pre-scheduled local requests; [Expo notification types](https://docs.expo.dev/push-notifications/what-you-need-to-know/) distinguishes local from remote delivery.
- **D4:** [Android notification permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission) and [alarm scheduling/special access](https://developer.android.com/develop/background-work/services/alarms) — separate capabilities and user-controlled access.
- **D5:** [Android notification channels](https://developer.android.com/develop/ui/compose/notifications/channels) — stable channel behavior and user overrides.
- **D6:** [Apple UNNotificationSound](https://developer.apple.com/documentation/usernotifications/unnotificationsound) — bundled PCM/WAV support and custom clips shorter than 30 seconds.
- **D7:** SDK 57 source: [ExpoSchedulingDelegate](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt) and [Android notification plugin](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/plugin/src/withNotificationsAndroid.ts). Source inspection establishes fallback scheduling and asset-name validation; it does not establish behavior of an unbuilt CRONO binary.
- **D8:** [SDK 57 IntentLauncher](https://docs.expo.dev/versions/v57.0.0/sdk/intent-launcher/), [React Native 0.86 Linking](https://reactnative.dev/docs/0.86/linking), [SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/) and [Expo incoming-notification handling](https://docs.expo.dev/push-notifications/receiving-notifications/) — OS settings, buffered navigation and explicit SDK 57 foreground suppression.
- **D9:** [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) — own rebuilt binary for bundled native resources/config. Local notifications in Expo Go are not proof that CRONO's custom sounds/config work in its binary.

## Baseline, Commands and Ownership

- Started from clean `master` at `8c01dd245098366a8ebd707d1e069f0a2b025411` (merged multilingual PR #4). Fetched origin and `git pull --ff-only origin master` reported up to date, then created this feature branch. Preserve the completed language/theme/planning/audio work and existing plans/patches.
- Command discovery: installed AI Factory `commands --json` from project root; catalog `revision_sha256: 34cd7a6731f2595ed029d1c5e0448ccf5a515dee777f3109bf542425b11f07c2`. `package.json` SHA-256: `e18a746ce00f4990f34609236e89693714875b4794c9f8d4236e03c8d78dab24`; `package-lock.json`: `9faa54bacbf3c0741e5d586438bd147df17dc598e460c03cf78bf64029609766`. Refresh discovery after manifest/lock changes; declaration alone is not a successful run.
- Planned existing verification IDs, all CWD `.`: `package.json#/scripts/lint` → `npm run lint`; `/scripts/typecheck` → `npm run typecheck`; `/scripts/test` → `npm test`; `/scripts/test:e2e` → `npm run test:e2e`; `/scripts/export` → `npm run export`. Windows Node/npm are available; direct TypeScript tests require Node 24+.
- The existing `build:android` and `build:ios` scripts declare cloud builds, not local checks. A future native test must identify the actual build/profile/device and relevant credentials. No build is submitted by planning. Prefer the existing preview profile for a self-contained test binary; the development profile requests a development client while `expo-dev-client` is not currently installed, so verify/add it through Expo only if choosing that profile.
- Planning validation: lint and typecheck passed on the unchanged baseline. Prior completed implementation evidence is 59 Node tests, 95 browser scenarios and all-platform exports, recorded in README; none is evidence for this unimplemented notification feature.
- Read-only inputs: `AGENTS.md`, description, architecture, base rules, config, prior plans/patches, source, fixtures, manifests, and official documentation. No roadmap or research artifact exists; no artificial linkage or Research Context is created. Optional skill-context files are absent. Task tooling is unavailable; this file is the durable task ledger.

## Commit Plan

- **Commit 1, after tasks 1–4:** `feat(notifications): add local notification foundation and preferences`
- **Commit 2, after tasks 5–8:** `feat(notifications): coordinate background alerts with saved timing state`
- **Commit 3, after tasks 9–12:** `test(notifications): cover routing lifecycle and scheduling races`
- **Commit 4, after tasks 13–15:** `docs(notifications): document device setup and verified delivery behavior`

These are proposed implementation checkpoints. Each checkpoint must typecheck and pass its affected checks. The plan itself does not execute commits or publishing.

## Tasks

### Phase 1: Native foundation and deterministic contract

- [x] Task 1: Add compatible dependencies, native config and safe notification sound resources.
  - **Files:** `package.json`, `package-lock.json`, `app.json`; new `src/audio/notificationSounds.ts`, `assets/audio/notification_classic.wav`; extend `tests/sounds.test.ts` as needed.
  - **Depends on:** none.
  - **Deliverable:** install through `npx expo install expo-notifications expo-intent-launcher`; inspect resolved SDK 57 types/source; configure plugin sound paths and Android exact-alarm permission. Copy Classic bytes under the valid underscore filename; retain originals/audio-source map and current background-recording/playback configuration. Do not configure remote push credentials/tasks or manually edit generated native projects. If a notification icon is configured, verify its required monochrome/transparency format rather than reusing an uninspected launcher image.
  - **Verify:** lock compatibility; all notification basenames are Android-safe; all four configured files exist and decode; Classic copy byte equality; native map/plugin coverage; lint/typecheck and relevant asset tests. Refresh command catalog after changes.
  - **Logging:** install/config failures retain actionable diagnostics; no routine asset-selection logs.
  - **Source:** D1/D2/D6/D7/D8; C7/C12/C13.

- [x] Task 2: Add backward-compatible opt-in and complete translated notification copy.
  - **Files:** `src/core/stopwatch.ts`, `src/i18n/types.ts`, `ro.ts`, `en.ts`, `ru.ts`; `tests/language.test.ts`, `tests/i18n.test.ts`, `tests/stopwatch.test.ts`.
  - **Depends on:** none.
  - **Deliverable:** independently default/restore `systemNotifications: true` while preserving false; no version/key bump or persisted permission. Add typed control, authorization/limited/unavailable/partial status, help, retry/settings and notification-title/body entries in all three catalogs. Update foreground-only sound descriptions without changing duration values.
  - **Verify:** literal `tests/fixtures/app-v1-before-planning.json` remains byte-identical; valid clocks, history, language/theme and false settings survive. Test invalid/missing/false notification preference and catalog parameters/parity.
  - **Logging:** no restoration/translation success logs and no saved payload dumps.
  - **Source:** current request; user language choices; base persistence rules; C5–C9/C12.

- [x] Task 3: Project bounded future semantic events without native/presentation dependencies.
  - **Files:** new `src/core/notifications.ts`, `tests/notifications.test.ts`; `package.json` test registration.
  - **Depends on:** 2.
  - **Deliverable:** validated timer/action/final descriptors, cumulative future deadlines, namespace/payload validation helpers and no past notifications. Preserve semantic event IDs and one final event; include a simultaneous independent timer. User names remain data, not translated keys.
  - **Verify:** idle/paused/completed, one-action/fifty-action, partially overdue run, at-deadline filtering, maximum valid duration, invalid timestamp/index, same-run resumed deadline and independent clocks. Register this test file immediately.
  - **Logging:** pure functions remain silent; deterministic assertion diagnostics only.
  - **Source:** `core/timer.ts`, `core/planning.ts:ScheduleRun/reconcileSchedule`; C1/C2/C4/C5/C10.

- [x] Task 4: Implement platform adapters, sound channels and permission capability handling.
  - **Files:** new `src/hooks/notificationTypes.ts`, `systemNotifications.ts`, `systemNotifications.web.ts`, `src/i18n/notificationContent.ts`; relevant unit tests.
  - **Depends on:** 1, 2, 3.
  - **Deliverable:** injectable native-free contract for inventory/schedule/cancel/dismiss/permissions/responses; native date requests with selected language and bounded ownership metadata; four stable sound channels plus silent. Include coalesced authorization and documented Android special-access/app-settings actions. Do not infer exact access from a successful schedule call; provide unsupported web implementation and safe unavailable-runtime behavior.
  - **Verify:** native input mappings against installed SDK types, sound filenames/channels, muted visual requests, iOS granular statuses, Android channel-before-prompt ordering, settings failures and web exclusion. Confirm payload text preserves names and unknown IDs cannot select arbitrary files/routes.
  - **Logging:** WARN on failed native initialization/permission/channel/settings calls with operation/code only; no notification bodies or user text.
  - **Source:** D2/D4–D8; C6/C7/C10/C12/C13.

<!-- Commit checkpoint 1: tasks 1–4 -->

### Phase 2: Reliable state-to-OS coordination

- [x] Task 5: Implement serialized reconciliation, stale-result cleanup and owned request diffing.
  - **Files:** new `src/hooks/notificationCoordinator.ts`, `tests/notificationCoordinator.test.ts`; `package.json` registration.
  - **Depends on:** 3, 4.
  - **Deliverable:** the controller in decisions 2–5. Reuse equal descriptors, use unique registration IDs, coalesce new snapshots, remove obsolete owner-specific requests, filter newly expired deadlines and preserve foreign inventory. Handle partial failures and matching delivered-notice cleanup; dispose cannot clear all valid armed requests. Expose honest pending/partial/failure state and bounded explicit retry.
  - **Verify:** changed deadline with same run ID, synchronous no-op, out-of-order native resolves, failed cancel/list/schedule, concurrent owner isolation, repeated reconcile and disposal. Register tests immediately; no updater side effects.
  - **Logging:** one WARN per failed operation/relevant revision, redacted identifiers if needed; no interval/poll spam.
  - **Source:** accepted-update architecture; decisions 2–5; C1–C5/C7/C8/C11.

- [x] Task 6: Expose successful hydration and immediate accepted-update subscriptions safely.
  - **Files:** `src/hooks/useStopwatch.ts`; integration coverage in existing browser persistence scenarios/new notification tests.
  - **Depends on:** 5.
  - **Deliverable:** stable accepted-update subscription plus separate loading/loaded/failed hydration outcome. Notification mutation requires successful hydration; dismissing storageError cannot authorize cleanup. Subscribers run after acceptance outside the functional action and cannot disrupt persistence/UI if they fail. Preserve the existing ordered write path and storage owner.
  - **Verify:** successful empty and legacy reads, failed initial read, no-op/rejected updates, accepted updates before React commit and teardown cleanup. A failure leaves pre-existing OS requests untouched. Do not describe this narrow guard as fixing the previously documented general storage-overwrite defect.
  - **Logging:** retain existing storage warning semantics; WARN for an unexpected subscriber boundary failure without serializing AppData.
  - **Source:** `useStopwatch:update/getSnapshot`, DESCRIPTION Known Follow-up Work 1; C4/C5/C9/C11.

- [x] Task 7: Wire one global notification owner and preserve foreground/background behavior.
  - **Files:** new `src/hooks/useSystemNotifications.ts`; `src/context/CronoContext.tsx`, native adapter and lifecycle bridge as needed.
  - **Depends on:** 4, 5, 6.
  - **Deliverable:** stable controller before route/font readiness, successful-hydration reconciliation, immediate accepted-change observation, permission/lifecycle refresh and future-request retention on background/unmount. Register explicit foreground suppression early; preserve the existing timer/planning coordinators and one foreground audio owner. Do not await background JS completion to schedule alerts.
  - **Verify:** Start then immediate Home, foreground completion without OS duplication, return before/after deadline, multiple crossed actions, duplicate effect activation/cleanup, run replacement and unrelated preference no-ops. Existing silent catch-up and clearTimeout wrapper regressions remain intact.
  - **Logging:** WARN only on reconciliation/adapter failure; never log every accepted update or display tick.
  - **Source:** `CronoContext`, `appActivity`, existing runner lifecycle hooks; C1–C5/C8/C9/C11.

- [x] Task 8: Add mobile Settings controls, explicit permission gestures and visible failure feedback.
  - **Files:** `src/components/SettingsSheet.tsx`, `TimingNotices.tsx`; new `SystemNotificationNotice.tsx` if needed; `src/app/timer.tsx`, `src/app/planning.tsx`, `src/components/PlanningRunCard.tsx`; catalogs.
  - **Depends on:** 2, 7.
  - **Deliverable:** saved enablement separate from live authorization, request/retry/settings actions and localized limited/partial/unavailable feedback. Trigger first-use authorization only from accepted user start/resume/restart/confirmed replacement/enable flows; coalesce calls without delaying the clock start. Pauses/resets, automated action advancement and hydration cannot prompt. After failed hydration, disable this feature's preference writes and scheduling actions; explain that saved data must load successfully before notification management resumes. Native-only controls explain unavailable web functionality; feedback remains visible in sheets without discarding drafts.
  - **Verify:** denied and unaskable states, preference off, permission dialog outliving a short timer, repeated Start/enable gestures, language updates, current selection no-op, 44-point targets in both themes and existing modal confirmations.
  - **Logging:** no success/interaction logs; WARN for failed user-requested OS settings or retry operations.
  - **Source:** manual settings pattern, D2/D4/D8; C4/C6–C9/C11/C12/C13.

<!-- Commit checkpoint 2: tasks 5–8 -->

### Phase 3: Response handling and regression coverage

- [x] Task 9: Validate notification responses and navigate safely after cold or warm launch.
  - **Files:** new `src/hooks/notificationResponses.ts`, `useNotificationNavigation.ts`, `tests/notificationResponses.test.ts`; `src/app/_layout.tsx`, adapter response wiring and `package.json` registration.
  - **Depends on:** 3, 4, 7.
  - **Deliverable:** early response capture; bounded deduplication of initial/live responses; Router-ready navigation to only timer/planning. Validate all external/native data, consume handled initial responses and retain usable cold-launch response until the shell mounts. Old run taps open a screen without timing mutations; no arbitrary URL/action execution. Retain active editor/confirmation state rather than implicitly dismissing an unsaved flow; a retained modal can continue to cover the navigated tab until the user closes it normally.
  - **Verify:** cold/warm/background taps, delayed fonts/hydration, duplicate events, invalid namespace/version/kind/index/route, missing/deleted run and repeated remount. Register pure response tests immediately.
  - **Logging:** minimal WARN for an actual response-handling/navigation failure; silently ignore unsupported/malformed payloads without dumping them.
  - **Source:** D2/D8; root hydration gate; C10/C12.

- [x] Task 10: Extend domain/lifecycle coverage for concurrent clocks, legacy restoration and changed preferences.
  - **Files:** `tests/notifications.test.ts`, `notificationCoordinator.test.ts`, `timerCompletion.test.ts`, `planningRunner.test.ts`, `sounds.test.ts`, `language.test.ts`, `i18n.test.ts` as applicable.
  - **Depends on:** 5, 6, 7, 8.
  - **Deliverable:** exercise actual projected descriptors through the injected adapter using restored repository fixture data and existing real transition helpers. Cover one timer plus 50 actions, partial catch-up, one final event, same-run deadline changes, mute while retaining visual requests, all sound IDs and locale changes. Duration/theme/haptics/history must not churn native requests or replay foreground sound.
  - **Verify:** run registered Node suite; compare pre/post clock IDs/deadlines/names and exact event sets. Existing literal legacy fixture bytes stay unchanged; update exact preference expectations only for the new independently defaulted field.
  - **Logging:** deterministic test diagnostics by event/operation; no saved-data dumps.
  - **Source:** representative fixture and existing boundary tests; C1–C9.

- [x] Task 11: Stress asynchronous cancellation, failures, delivery deduplication and hydration safeguards.
  - **Files:** `tests/notificationCoordinator.test.ts`, `notificationResponses.test.ts`; controller/adapter fixes only when scenarios expose defects.
  - **Depends on:** 5, 6, 7, 9, 10.
  - **Deliverable:** deferred promises for native list/schedule/cancel and channel/permission results. Cover stale results after reset/replacement/disposal, rapid pause/resume, ro→en→ru→ro, native partial success, failed cancellation then explicit retry, permission revoked during registration, foreign pending requests and delivered-vs-pending inventory. Ensure a failed initial read never removes a valid request and late operations do not mutate disposed UI state.
  - **Verify:** exact retained/cancelled physical IDs, no old deadline revival, no current request deleted by an obsolete callback, bounded work/retries, no retrospective sound/notification, and unchanged independent owner. First reproduce any defect in the scenario before fixing and rerun the same case.
  - **Logging:** capture/assert expected WARN paths; avoid warnings for routine cancellation or no-ops.
  - **Source:** async freshness requirements in architecture and accepted-update evidence; C4–C11.

- [x] Task 12: Add browser compatibility, localized Settings and legacy-data journeys.
  - **Files:** new `tests/e2e/notifications.spec.ts`; `tests/e2e/{sounds,theme,planningButtons,localization}.spec.ts` preference expectations where needed; existing helpers/config retained.
  - **Depends on:** 8, 9, 10, 11.
  - **Deliverable:** verify web unsupported/no-prompt behavior, default/false restoration from the literal fixture, unchanged foreground timer/planning notices/audio, saved notification selection, errors/hydration warning handling where observable, and translated compact Settings/sheets. No production-only test hook or browser mock may be presented as proof of native delivery.
  - **Verify:** targeted new cases in all three languages and both palettes, Russian compact layout; rerun impacted existing settings/legacy/audio cases. Preserve 45-second limits, one worker, no retries, identity loopback headers and real-timer regression coverage.
  - **Logging:** test/page errors only; no production debug logging.
  - **Source:** existing Playwright conventions and real legacy fixture; C3/C5–C9/C12.

<!-- Commit checkpoint 3: tasks 9–12 -->

### Phase 4: Native acceptance and documentation

- [ ] Task 13: Validate rebuilt native configuration and actual Home/locked-screen delivery.
  - **Files:** native config/adapter only for verified defects; record case evidence or unavailable checks in this plan's progress ledger and existing documentation, without a separate report artifact.
  - **Depends on:** 1, 7, 8, 9, 11, 12.
  - **Deliverable:** identify an actual CRONO binary/profile and physical Android/iOS devices. Check package permissions, channel setup and bundled resources in the generated build. Test timer on Home/lock; multi-action automatic schedule and final; concurrent timer; foreground suppression; pause/resume/reset/replacement cancellation; denied/revoked/limited grants; all four one-shot sounds/mute; Settings return; warm/cold/stale tap; retained requests after ordinary process removal where supported. Include Android exact-access denied/granted, idle/Doze, channel overrides and reboot behavior; iOS Focus/silent/lock-screen presentation and rapid short actions.
  - **Verify:** device OS/build identifiers, observed native request/delivery results and audibility recorded honestly. Check no in-app replay on return and no duplicate last-action alert. Record force-stop/power-saving/short-interval limitations; unavailable device/build cases remain unchecked/pending, never inferred from browser/export results. Cloud build submission is a separate external action and is not performed by this planning invocation.
  - **Logging:** device failure diagnostics only; redact user notification text and credentials.
  - **Source:** Original Request, AGENTS native-validation rule, D2–D9; C1–C13.

- [x] Task 14: Run final registered verification and all-platform exports against one final source revision.
  - **Files:** `package.json` test registration if incomplete; only scoped source/test fixes justified by failures.
  - **Depends on:** 10, 11, 12. Include available results from 13; missing devices must not block independent CLI/browser checks or be represented as successful native acceptance.
  - **Deliverable:** refresh command discovery/hashes, then run lint, typecheck, complete registered Node tests, full browser suite and Android/iOS/web export. Verify native modules are excluded from web and unchanged timer/planning/foreground audio regressions pass. Run SDK dependency/config diagnostics appropriate to the newly added modules; inspect the generated notification plugin/asset configuration separately because export alone does not exercise native resource copying.
  - **Verify:** exact commands/CWD/results bound to the final revision/source fingerprint; no weakened assertions, broader timeouts or retries to conceal failures. Native acceptance status remains distinct from CLI success.
  - **Logging:** normal command diagnostics; WARN/ERROR-only application logging.
  - **Source:** configured verification commands, AGENTS/base rules; C1–C13.

- [x] Task 15: Complete the mandatory documentation checkpoint and factual project context updates.
  - **Files:** `README.md`, `AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`; update this plan's progress/task status.
  - **Depends on:** 14 and the available results/pending status from 13.
  - **Deliverable:** route usage documentation through `$aif-docs`; explain enabling permission, Home/lock behavior, selected one-shot notification sound versus in-app looping duration, denied/limited permission, Android alarm settings, native rebuild requirement, routing and platform limitations. Replace superseded “no system notifications” statements while preserving silent historical catch-up and current foreground audio rules. Update architecture/data preference/map only to implemented facts; retain unrelated storage/history findings and unavailable native checks. Do not invent a docs directory restructure, roadmap, or summary report.
  - **Verify:** documentation meaning-preservation check, links, catalog/help consistency, real command/build/device evidence and native limitations. Mark only actually completed tasks/checks; do not claim physical delivery from exports or all tasks complete while required native checks remain unavailable.
  - **Logging:** no new runtime logs; minimal warning for unavailable required verification.
  - **Source:** user's retained docs preference, `$aif-docs` checkpoint, Original Request, C1–C13.

## Completion Criteria

- Native notifications for the accepted event scope are armed from accepted future timing state and can be delivered on Home/lock without a live JS deadline callback, subject to OS authorization/settings.
- Foreground behavior, silent catch-up, independent clocks, user text, language/theme selection and legacy data remain intact.
- Cancellation/replacement and async error paths cannot knowingly leave stale requests while reporting success; failed hydration cannot erase unknown valid OS schedules.
- Notification taps only navigate to validated app screens and never mutate runs.
- Tests/exports pass, native custom-resource configuration is checked, and available physical-device evidence supports the claimed behavior. Unavailable native cases remain pending and visible.
- No implementation, commit, push or build is implied by completing this planning workflow.

## Implementation Progress

- Task 1 complete: SDK-compatible notifications 57.0.25 and intent-launcher 57.0.1 installed, plugin/special access configured, Classic copied with byte identity and safe basename. Lint, typecheck and 60 Node tests passed. Command catalog d2a99b9ab99476d0b3262c1bc86c829ad86d37cca05dc1365276d7df8e62074b; manifest 4fbabc5add1e70d8899e66a0d2195d3a9e6986536fc01915184076d66cc8cc53; lock dd06dbd9c3fe45da8e20440fa443559aaf22ce518ae3f91130e2bfa584809e6a.

- Task 2 complete: saved opt-in restores independently with true default/false preservation; all three typed catalogs include permission/status/help copy. Literal legacy fixture retained. Lint/typecheck and all 61 Node tests passed.

- Task 3 complete: pure bounded future projection and coherent payload validation added; all 65 registered Node tests, lint and typecheck passed. Same-run resumed deadlines, fifty-step bound, one final event and overdue filtering are covered.

- Task 4 complete: SDK-typed native adapter, stable channels, one-shot content, permission normalization/coalescing, OS settings and web fallback added. Corrected optional SDK notification data typing; lint/typecheck and all 68 Node tests pass. Expo Go is reported unavailable for this feature because it lacks CRONO-specific bundled sounds; rebuilt own binaries are required.

- Task 5 complete: serialized native reconciliation, unique registration identities, stale completion cleanup, scoped cancellation, failure/retry state and hydration guard implemented. Lint/typecheck and 73 Node tests pass, including deferred registration after pause/disposal and independent owner preservation.

- Task 6 complete: stable accepted-update subscriptions and loading/loaded/failed hydration state added, with stale hydration generation protection. Existing storage behavior/ordered writes retained. Lint/typecheck, 73 Node tests and all four stopwatch/persistence browser journeys passed (43.3s). General storage-overwrite finding remains open.

- Task 7 complete: one provider-owned notification bridge observes accepted relevant state, retains OS requests on background, buffers responses and refreshes on foreground. Native imports are isolated from the web adapter. Lint/typecheck, 73 Node tests and all five real-browser-timer/audio cases passed (50.2s); native delivery remains for task 13.

- Task 8 complete: Settings separates saved opt-in from OS capability, exposes guarded permission/settings/retry actions, and provides independent failure feedback in shell/sheets. Start/resume gestures request permission without delaying clocks. Lint/typecheck, 73 Node tests and all 12 localized layout cases passed (2.0min), including both palettes and compact Russian.

- Task 9 complete: validated, deduplicated responses buffer until hydration/fonts/Router readiness, then only navigate to timer/planning. Stale runs never mutate clocks; retained modals remain intact. Lint/typecheck and 76 Node tests passed. Catalog refreshed to bbf15d776eb853f722bc66bb7a20dba915de070b171a3061dc040491f06cc98c.

- Task 10 complete: real cumulative catch-up retains the remaining requests from a 51-request concurrent run. Sound/locale changes preserve clocks; unrelated preferences do not churn registrations. Literal legacy restoration uses the actual string-storage boundary and preserves all data. Lint/typecheck and 79 Node tests passed.

- Task 11 complete: reproduced two failures before fixing stale permission inventory mutation and elapsed-pending clock-rollback revival. Added deferred locale/revocation/cancel races, partial registration cleanup, delivery consumption, bounded failures/retry and late hydration safeguards. All 89 Node tests plus lint/typecheck pass.

- Task 12 complete: nine new browser cases pass (1.5min), covering all languages/palettes, compact Russian, unsupported/no prompt, true/false restoration and failed-read protection. Eleven impacted legacy journeys also passed (1.7min). Visual inspection corrected an oversized web switch track; the layout assertion now measures its 44-point wrapper, retaining native hitSlop. Lint/typecheck pass; timeouts/retries remain unchanged.

- Task 13 partially verified, remains unchecked: isolated SDK 57 `expo prebuild --no-install --platform all` completed Android generation at `C:\Users\SAP4K\AppData\Local\Temp\crono-notifications-config-HVhzJh`. Generated manifest contains SCHEDULE_EXACT_ALARM; all four generated raw WAVs match committed source bytes. SDK library manifest declares POST_NOTIFICATIONS/RECEIVE_BOOT_COMPLETED. No native directories were generated in this repository. Windows did not generate iOS; `where adb` found no runtime. No physical Android/iOS device or signed binary was available, so Home/lock delivery, audibility, taps, exact access/Doze/reboot and OS overrides remain pending. Proceeding with independent tasks 14–15 as planned.

- Task 14 diagnostic follow-up: first Expo Doctor run was 20/21 because five existing Expo packages had newer SDK-57 patch recommendations. Stopped the partial browser run (seven scenarios had passed; no complete-suite claim), applied `npx expo install --fix`, and restarted Metro. Expo is now 57.0.32, metro-runtime 57.0.18, asset 57.0.21, router 57.0.30 and splash-screen 57.0.11. Fresh lint/typecheck/89 Node tests pass; dependency check is up to date and Expo Doctor passes 21/21. Repeated isolated CNG successfully at `C:\Users\SAP4K\AppData\Local\Temp\crono-notifications-config-E9il8W`; manifest and all four audio resources pass again. iOS config introspection has no audio/remote-notification background mode or microphone key. Native-device acceptance stays pending.

- Task 14 complete: final source fingerprint `8cfe44ca037ac364c24114ff359d29ed7e54cfdf48b1dfb2e0b6b1ce91a76f9f` (sorted source/tests/assets plus manifests/build/test configuration; raw file SHA-256 aggregation). On this unchanged source, lint/typecheck, 89/89 Node tests, 104/104 browser tests in one full run (4.7min), Android/iOS/web exports, SDK dependency check and 21/21 Expo Doctor checks passed. Web export excludes native notification/intent implementation. Legacy fixture/original Classic/source map remain unchanged. Final catalog `1d2b8bcb5323d6a6dfc0db6f568ede5b74a603741688454017e6fdf7188fff8b`; manifest SHA-256 `02e9ed4cac486eb675e1b2f873bbbe7cd6cb5f28369535f1006dfcd09892cc32`; lock `b0edcf55daf61e1550368f11fb19f83bd25c9e04e4dec547ada32833713ac3a2`. Command IDs remain package.json#/scripts/{lint,typecheck,test,test:e2e,export}, CWD `.`; all actual executions were through Windows Node/npm in `D:\App_Crono`. Native acceptance remains separate/pending.

- Task 15 complete: `$aif-docs` updated README usage/build/limits and factual AGENTS/DESCRIPTION/ARCHITECTURE maps, preference contract, notification ownership and evidence. Meaning preservation: PASS; requirements, default/silent/one-shot policies and native uncertainty preserved. All 13 relative Markdown targets resolve. Existing README structure retained per this plan (164 lines); no docs split, deletion or reports. Reviewed changed documentation against source/catalogs and retained unrelated storage/history findings. Final code fingerprint remains `8cfe44ca037ac364c24114ff359d29ed7e54cfdf48b1dfb2e0b6b1ce91a76f9f`; diff whitespace check passes.

- Continuation: 14/15 tasks completed. Task 13 remains pending only for unavailable native build/device acceptance; see its case list above. No commit, push, PR, cloud build or store submission performed. Web preview remains on port 8091. Resume physical validation with the existing preview/build workflow and record actual build/device IDs and outcomes here.
