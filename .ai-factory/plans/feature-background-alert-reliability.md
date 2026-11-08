# Implementation Plan: Reliable Background and Lock-Screen Alerts

Branch: `feature/background-alert-reliability`
Created: 2026-11-08
Mode: full
Status: code and documentation complete; 11/12 tasks complete. Extended native acceptance in task 11 remains pending. Commit checkpoints deferred; no publishing requested.
Starting revision: `1440fe74fe384837a0f2d39f3730d1ebc8b7de09`.
Branch dependency: created from `feature/calendar-planning` to retain the installed Android startup fix and calendar work. [PR #10](https://github.com/SAP4K/App_Crono/pull/10) was open during planning. The configured integration base remains `master`; reconcile that dependency before publishing a future PR. This plan does not merge or publish either branch.

## Original Request

poti te rog sa modific aplicatia sa ruleze in background, cand ies din aplicatie aceasta, sau cand sunt cu ecranul blocat, oricum sa vina notificare

## Settings

- Testing: yes — regression-first permission coverage, injected coordinator/lifecycle tests, existing browser regressions, native build checks and physical delivery acceptance.
- Logging: minimal — bounded WARN/ERROR at failed native boundaries; no routine scheduling logs, user action names, notification bodies, saved snapshots or device identifiers in logs.
- Docs: yes — mandatory `$aif-docs` checkpoint, with English documentation.
- Reuse the user's established full-plan, tests, documentation and minimal-logging preferences.
- Platforms: prioritize the connected Android phone; retain iOS compatibility and the explicit unsupported web fallback. Physical iOS acceptance must be labelled pending if no device is available.
- Scope: harden the existing timer/action/final local-notification path. Background timing uses saved absolute deadlines and OS-owned requests; continuous JavaScript execution is not a prerequisite for delivery.
- Preserve schema version 1, `@crono/app-v1`, default-on saved `systemNotifications`, all six languages, independent timer/stopwatch, one active schedule, calendar template rules and foreground sound/Stop behavior.
- The planning invocation owned this plan and its local branch only. The user subsequently requested `$aif-implement`; code, builds, device verification and documentation were then authorized. Commits, push and PR creation remain unrequested for this change.

## Requirements Reconciliation

Authority: the current request requires alerts outside CRONO and while locked. Earlier accepted behavior and `AGENTS.md`, `.ai-factory/ARCHITECTURE.md` and `.ai-factory/rules/base.md` constrain integration. `.ai-factory/plans/feature-background-notifications.md` records an existing implementation whose physical acceptance is still pending; it is a baseline, not evidence that phone delivery already works.

| Decision | Source and relationship | Verification |
|---|---|---|
| Timer completion and every remaining schedule boundary must be registered with the OS while the app can run | Current request; `core/notifications.ts:projectNotificationEvents`; Architecture — System Notifications | Home/lock delivery without a JavaScript expiry callback; up to 50 planning events plus one timer |
| Emit one final schedule notification, not both last-action and final notifications | Earlier action/final choice; existing projection and notification plan | Single final event; timer and planning remain independent |
| Preserve deadline-based background progress and silent catch-up on return | Architecture — Display and Device Behavior; `timerCompletion.ts`, `planningRunner.ts` | Suspend across several boundaries; return to correct state without replaying historical in-app sound |
| Separate app opt-in, OS permission, alarm access, selected channel and registration outcome | Existing saved preference; Description — Known Follow-up Work 5; SDK/native evidence below | No false promise of reliable delivery from a successful registration or a saved toggle |
| Repair requestable-denied permission handling | `notificationTypes.ts:notificationCapability`; `notificationCoordinator.ts:requestPermission`; installed SDK 57 permission implementation | A valid user gesture can request Android permission when status is denied and `canAskAgain` is true |
| Preserve foreground-only 5/15/30-second loops; background OS sound plays one chosen clip or is silent | Earlier accepted audio choice; Architecture — System Notifications | Muted alerts remain visual; duration-only changes do not rearm OS requests |
| Background operation does not require a permanent foreground service, background audio or a background fetch worker for this notification goal | Existing architecture and installed SDK scheduler; [D1–D3] | Delivery from already-registered native requests with the app process absent; no duplicate scheduling owner |
| Home, another app and a locked screen are required delivery scenarios; recents dismissal must be tested separately | Current request interpreted against Android lifecycle/OEM behavior | Separate native evidence for each case; never substitute Force Stop for ordinary backgrounding |
| Force Stop, disabled notifications/channels, lock-screen privacy, DND and OEM restrictions remain system-controlled | [D2–D5] | Explain actionable restrictions; do not claim delivery through an explicit OS block |
| Short schedule actions may be delayed by Android Doze throttling even with exact access | Installed scheduler uses allow-while-idle alarms; [D3] | Exercise short intervals and concurrent timer/schedule in Doze; disclose observed delay rather than claim second-precise delivery |
| Calendar dates/weekday rules continue to organize manually started templates | `planningCalendar.ts`; current calendar plan | Saving a calendar rule does not register a new automatic-start alarm |
| Use an authentic stored-data artifact | `tests/fixtures/app-v1-before-planning.json` and existing restore tests | Restore literal legacy data, preserve false preferences/history, then start a future run through accepted updates |

Meaning preservation: PASS — Home/locked alerts remain the goal, with system-owned scheduling as the implementation method. Existing foreground audio and manual calendar starts remain intact. Permission, punctuality, audible delivery and pending device evidence are kept distinct; “oricum” is not converted into an unsupported promise to override Android Force Stop or user restrictions.

Supported combinations below refer to accepted shared-state changes. OS capabilities are transient and must not be persisted as user preferences.

| ID / accepted input | Persisted state | Output / transition and side effects | Verification scenario |
|---|---|---|---|
| C1: native, loaded, enabled, permitted, future running timer; user goes Home, switches apps or locks | Existing run/deadline unchanged | One OS completion request survives JavaScript suspension; no keep-alive loop | Native 30-second timer in each exit scenario, observing delivery before reopening |
| C2: validated running schedule with 1–50 actions, optionally a timer | Existing run snapshot/cumulative deadlines | All future action/final requests prearmed; no JS boundary callback required; one final event | Multi-action lock test, maximum inventory test, concurrent deadlines |
| C3: foreground expiry or notification handler invoked during active→inactive handoff | Existing completion semantics | Suppress redundant OS presentation while active; allow OS presentation if the handler executes after the app becomes inactive | Injected presentation policy and native near-boundary Home/lock test |
| C4: Android requestable-denied / nonrequestable-denied / granted; first gesture versus explicit Settings request | Opt-in unchanged | Requestable denial can prompt from a gesture; permanent denial routes to Settings; no hydration/background prompt or repeated automatic prompt after a refusal in the same owner lifetime | Android-shaped responses; overlapping gestures; refusal then explicit retry |
| C5: Android API <31 / >=31 with exact access granted, denied or unreadable | No OS grant saved | Show not-required / granted / delayed-delivery risk / unknown; preserve SDK inexact fallback; rearm on effective access changes | Injected capability tests and Android special-access return test |
| C6: app notification permission granted but selected channel blocked, muted or hidden on lock screen | Sound/preference values unchanged | Separate visibility and sound status where observable; provide Settings/help; unobservable lock-screen/OEM state is not labelled verified | Real channel settings, silent visual test, lock-screen privacy test |
| C7: pause/reset/resume/restart/replacement, opt-out or permission revocation | Existing domain transition only | Cancel/replace only obsolete owned requests; no resurrection from stale native promises; other clock owner survives | Deferred schedule/cancel/access responses, rapid same-run resume, accepted/no-op actions |
| C8: iOS deadline contains milliseconds or becomes stale during native preparation | Original semantic deadline/IDs unchanged | Round only the native date upward to a whole second; reject elapsed semantic deadlines; no early alert caused by SDK truncation | Fractional-second mapping tests, device pause/resume, before/after deadline checks |
| C9: overdue hydration/return, failed hydration, cold/warm/stale tap | Version-1 restoration contract unchanged | Silent catch-up; never enumerate/delete valid requests after failed hydration; valid taps navigate only, without restarting clocks | Literal legacy fixture, response tests and native cold/warm taps |
| C10: language/sound changes versus theme/history/duration-only changes | Existing saved selections and user names | Only relevant content/channel changes replace future requests; capability refresh does not reset clocks, sheets or playback | Six-language content, same-run races, existing UI regressions |
| C11: web, Expo Go, older binary missing the access probe, or a failed optional query | Existing data unchanged | Web unsupported; native capability unknown/unavailable with honest guidance; an optional exact-access query failure must not disable working local notifications | Web imports/export, injected missing-module/query tests, native startup |
| C12: process reclaimed, recents dismissal, reboot, Force Stop or deep idle | Existing deadlines retained where storage/native inventory permits | Already-armed requests use native ownership; reboot recovery uses SDK receiver; on relaunch rebuild future requests and silently catch up; Force Stop cannot be bypassed | Distinct physical/emulator cases, future-only recovery, no automatic settings changes |

## Verified Baseline and Technical Decisions

### Existing implementation and concrete gaps

- `expo ~57.0.32`, React Native `0.86.3`, `expo-notifications ~57.0.25` and `expo-intent-launcher ~57.0.1` are installed. No new notification library is needed.
- `app.json` already declares `SCHEDULE_EXACT_ALARM` and bundles all notification sounds. The installed SDK provides boot/package-replacement receivers and persists scheduled requests. Do not add another boot receiver or a second alarm inventory.
- `notificationCapability` currently sets Android `canAsk` only for `undetermined`. The installed SDK's Android 33+ implementation can return `denied` with `canAskAgain: true`. An existing assertion in `tests/notifications.test.ts` even encodes the restrictive behavior. The coordinator also independently requires `unknown` unless the request is explicit; both gates need coverage and repair.
- The installed `ExpoSchedulingDelegate.setupAlarm` uses `setExactAndAllowWhileIdle` when permitted and `setAndAllowWhileIdle` otherwise. Scheduling success does not identify which path ran. The public Expo notification API has no exact-alarm access getter in this installed version.
- Add a small Android-only local Expo module under `modules/crono-background-access/` to read `AlarmManager.canScheduleExactAlarms()` on API 31+ and `PowerManager.isIgnoringBatteryOptimizations()`. It reads capabilities only; scheduling remains with `expo-notifications`. A battery exemption does not prove Xiaomi autostart or lock-screen permission. Keep this distinction visible.
- The native adapter creates HIGH channels with PRIVATE lock-screen visibility, respecting user privacy and channel overrides. Query the selected existing channel through Expo's channel API. Do not change IDs to bypass a user's blocked channel, force PUBLIC content or attempt to bypass DND.
- The static foreground handler currently always suppresses presentation. SDK Android handling normally presents in the background without JS; inspect and regression-test the active→inactive handoff so a handler called during that transition does not discard an otherwise valid alert.
- The installed iOS `DateTriggerRecord.toUNNotificationTrigger` truncates the supplied epoch milliseconds to seconds. Quantize only the native trigger upward; semantic `dueAt`, IDs and core timing remain exact. A registration-format discriminator must replace older unrounded requests once without a storage migration.
- Capability and registration state must be separate. Existing `status: ready` means reconciliation completed and can even coexist with denied permission; derive honest user-facing readiness rather than treating that field as a delivery guarantee.

### Read-only phone evidence during planning

The connected Redmi Note 9 is authorized over ADB. The installed package `ro.appcrono.mobile` contains exact-alarm, notification and boot permissions/receivers. `POST_NOTIFICATION` app-op reported `allow`; the exact-alarm app-op reported no explicit operation and default mode. **Default mode alone does not prove that exact scheduling is granted.** These checks establish neither audible delivery nor lock-screen visibility. No timer was started, app data cleared, permission granted, battery policy changed, app force-stopped or phone rebooted for this planning invocation. The Android requestable-denied defect is verified in code but is not established as this Android 12 phone's failure cause.

### Registration and capability contract

1. Keep one `useSystemNotifications` owner subscribed immediately to accepted updates. Successful hydration, foreground return and explicit retry refresh capabilities. Preparation must create channels before Android runtime permission is requested.
2. Model notification authorization, exact access, selected-channel visibility/sound, battery-optimization observation and registration outcome separately. Use explicit unknown/not-applicable states. No capability is written to AsyncStorage; opting out remains authoritative.
3. Keep gesture-only prompts. Permit the Android denied/requestable path; coalesce concurrent requests. After an actual automatic gesture prompt is declined, suppress subsequent implicit start/resume prompts for that controller lifetime, retaining the explicit request button. Do not re-prompt on hydration, route changes, backgrounding or Settings return.
4. Decorate the registration fingerprint with a stable transport-format/access-mode discriminator outside the pure timing core and translation catalogs. Preserve semantic event/run/deadline identity. This permits one-time replacement of old-format or inexact registrations when exact access becomes available.
5. Android's persisted Expo inventory is not proof that AlarmManager still contains its alarms after special access was revoked. On successful cold hydration perform one serialized, scoped rearm of future validated CRONO-owned requests. Foreground capability changes also rearm relevant future requests. Do not churn requests on every display tick, theme change, battery-help opening or unchanged capability refresh.
6. Retain generation guards, exact physical IDs, cancellation failure visibility, bounded consumed-event tracking, failed-hydration protection and foreign-request preservation. A failed optional diagnostic query produces unknown capability rather than clearing otherwise valid requests. Backgrounding and ordinary disposal must leave already-armed requests intact.
7. Show scheduling-pending until required native registrations have resolved. Starting a timer still works without permissions; show the relevant remediation when background alerts cannot be confirmed. No app can finish an interrupted registration after an immediate Force Stop; document that prerequisite instead of claiming it is armed.
8. Use the existing exact-alarm Settings shortcut, add the public battery-optimization Settings destination with app-settings fallback, and provide concise MIUI guidance. Never use private OEM intents, silently change settings, request an unrestricted background service or claim a system Settings activity result proves permission was granted. Refresh actual observations on return.
9. Android Doze can throttle closely spaced allow-while-idle alarms, including a timer and schedule competing for the same app quota. Keep all required future events registered. Do not delete events or change schedule durations to hide this constraint. If the user later requires second-precise, repeated short-interval alerts in deep idle, reopen the alarm-clock/foreground-service design explicitly; this plan does not claim the current SDK path provides that guarantee.

### Primary references checked for this plan

- D1: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) and [SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) — permission responses, channels, scheduled requests and native configuration. Matched against the installed package source.
- D2: [Android alarm scheduling](https://developer.android.com/develop/background-work/services/alarms) — alarms outside the process lifetime, exact-access checks, revocation and re-registration.
- D3: [Android Doze and App Standby](https://developer.android.com/training/monitoring-device-state/doze-standby) — idle throttling, capability queries, public battery Settings and device validation.
- D4: [Android stopped-state behavior](https://developer.android.com/about/versions/15/behavior-changes-all) — explicit Force Stop restrictions; Android 15 cancels pending intents.
- D5: [Xiaomi lock-screen notification guidance](https://www.mi.com/global/support/faq/details/KA-692471/) and [MIUI settings controls](https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1) — per-app notification/lock-screen and autostart settings are user-controlled. Menu names vary by MIUI version.
- D6: [Expo documentation index](https://docs.expo.dev/llms.txt), [local Expo modules](https://docs.expo.dev/modules/get-started/), [module API](https://docs.expo.dev/modules/module-api/) and [module configuration](https://docs.expo.dev/modules/module-config/) — tracked local modules, native registration and platform support, without hand-editing generated app projects.
- D7: [SDK 57 IntentLauncher](https://docs.expo.dev/versions/v57.0.0/sdk/intent-launcher/) — supported Settings intents, return handling and fallbacks.

## Commit Plan

- After tasks 1–4: `fix(notifications): repair permission requests and inspect background access`
- After tasks 5–8: `fix(notifications): rearm native alerts across lifecycle and access changes`
- After tasks 9–12: `feat(notifications): guide background setup and verify native delivery`

These are implementation checkpoints, not authorization to commit, push, merge or publish during planning. Each checkpoint must compile and pass its relevant checks.

## Tasks

### Phase 1: Permissions and observable native capabilities

- [x] Task 1: Reproduce both permission gates with Android-shaped regression cases.
  - Files: `tests/notifications.test.ts`, `tests/notificationCoordinator.test.ts`.
  - Replace the old requestable-denied assumption with a regression that fails on the current code. Cover denied/requestable, denied/permanent, granted, undetermined and existing granular iOS states. Exercise ordinary accepted-start and explicit Settings gestures separately, including two overlapping requests and a denial followed by another start.
  - Verify that successful hydration, inactive lifecycle and unsuccessful/no-op timing actions never cause a permission prompt. Capture the pre-fix failure before task 2; keep these cases in the already registered test files.
  - Depends on: none. Evidence: C4, C7, C11; baseline permission source above.
  - Logging: tests assert bounded warning behavior; no production logging added.

- [x] Task 2: Fix requestable-denied handling and gesture prompt policy.
  - Files: `src/hooks/notificationTypes.ts`, `src/hooks/notificationCoordinator.ts`, and accepted-action callers in `src/app/timer.tsx`, `src/app/planning.tsx`, `src/components/PlanningRunCard.tsx` only if necessary.
  - Correct both `canAsk` and the coordinator status gate so the existing Start/Resume/Restart path can request a requestable Android denial. Preserve iOS limited/denied semantics. Coalesce in-flight requests, retain channel preparation before prompting, and stop repeated implicit prompts after a refusal in the same controller lifetime. Explicit Settings requests remain available when the OS permits them.
  - Preserve saved opt-in, clocks and failure/hydration guards; revocation is not a preference update. Rerun task 1's failing tests.
  - Depends on: 1. Evidence: C4, C7, Architecture — System Notifications.
  - Logging: retain WARN on request/read failure only; no logs for ordinary permission refusal or status refresh.

- [x] Task 3: Add a read-only Android access probe and native-free readiness policy.
  - Files: new `modules/crono-background-access/` local Expo module with Android module configuration/Gradle source; `src/hooks/backgroundAccess.ts` and `.web.ts`; `src/hooks/notificationTypes.ts`; new `src/hooks/notificationReadiness.ts`, `tests/notificationReadiness.test.ts`; `package.json` test registration.
  - Expose exact-access and battery-optimization observations through the existing Expo Modules API. Use API guards for Android <31 and <23; the Android-only module must not enter iOS/web imports. Optional loading handles an older binary/Expo Go without crashing. The module must not schedule alarms, store timing data or request exemptions.
  - Derive readiness codes for disabled, permission-needed/blocked, pending, failed, channel-blocked, exact-access risk, unknown and registered states. Battery optimization is advisory, not proof of failure or success. Test the supported combinations and missing/throwing probes immediately in a registered Node suite.
  - Depends on: 2. Evidence: C5, C6, C11; D2, D3, D6.
  - Logging: a deduplicated WARN for unexpected probe errors; missing optional capability remains unknown without repeated logs. No device identifiers.

- [x] Task 4: Connect selected-channel and access observations to the native adapter.
  - Files: `src/hooks/systemNotifications.ts`, `.web.ts`, `src/hooks/notificationTypes.ts`, `src/hooks/notificationReadiness.ts`, adapter fixtures in `tests/notificationCoordinator.test.ts` and `tests/notificationReadiness.test.ts`.
  - Add an explicit injected capability-read boundary. Read exact access through task 3 and selected-channel state through installed Expo APIs after preparation. Respect existing user-modified channel importance/sound and PRIVATE visibility; unavailable lock-screen/OEM information stays unknown. Implement public battery Settings navigation with app-settings fallback alongside the existing exact-access shortcut.
  - Do not make optional diagnostics a prerequisite for scheduling permitted notifications. Keep the web adapter native-free and distinguish an unsupported platform from a missing new probe in an otherwise functioning native notification binary.
  - Depends on: 3. Evidence: C5, C6, C11; D1, D7.
  - Logging: WARN on failed native reads/Settings opens, scoped by operation; no success or routine inventory logging.

<!-- Commit checkpoint: tasks 1-4 -->

### Phase 2: Registration survival and lifecycle correctness

- [x] Task 5: Reconcile registration mode and rearm lost native alarms safely.
  - Files: `src/hooks/notificationCoordinator.ts`, `src/hooks/notificationTypes.ts`, `src/hooks/useSystemNotifications.ts`, `tests/notificationCoordinator.test.ts`.
  - Separate reconciliation outcome from derived delivery capability. Include transport/access mode in registration identity without changing semantic event IDs or core deadlines. Rearm validated future Android requests once on successful cold hydration and on effective exact-access changes; unchanged foreground refreshes reuse registrations.
  - Test denied→granted and granted→denied→relaunch, including inventory entries whose underlying alarm was removed. Preserve owner isolation, latest-snapshot guards, partial-failure retry, cancellation failures, consumed events and foreign requests. Inject late capability responses and late registrations during pause, opt-out and same-run resume. Failed hydration must not inspect/delete native inventory; optional-probe failure must not cancel valid alerts.
  - Depends on: 4. Evidence: C1, C2, C5, C7, C9, C12; D2.
  - Logging: bounded WARN/ERROR at failed inventory/cancel/register boundaries; avoid logging names, bodies or whole descriptors.

- [x] Task 6: Protect Home/lock handoff and preserve already-armed requests.
  - Files: `src/hooks/systemNotifications.ts`, `src/hooks/useSystemNotifications.ts`, `src/hooks/appActivity.ts`; new `src/hooks/notificationPresentation.ts` and `tests/notificationPresentation.test.ts` if extraction is needed; register any new suite in `package.json` immediately.
  - Resolve foreground presentation using current activity when the handler actually executes: active keeps existing in-app feedback; inactive/background permits system banner/list and the descriptor's sound policy. Normal native background delivery must continue without invoking JavaScript.
  - Verify that accepted updates initiate reconciliation before an exit event, backgrounding does not cancel armed requests and foreground refresh does not replay expired audio. Test near-boundary activity changes and delayed native callbacks; retain one shared owner rather than adding background workers. Record pending registration honestly when a user leaves before native confirmation.
  - Depends on: 5. Evidence: C1–C3, C7, C9; installed SDK handling delegate.
  - Logging: no logs for normal lifecycle events or display ticks; WARN only on handler/listener failures.

- [x] Task 7: Prevent iOS DATE-trigger truncation from scheduling an early alert.
  - Files: `src/hooks/systemNotifications.ts`; new `src/hooks/notificationTrigger.ts`, `tests/notificationTrigger.test.ts`; `tests/notificationCoordinator.test.ts`, `package.json` test registration.
  - Introduce a small native-free trigger-mapping helper. Preserve Android millisecond dates; use `Math.ceil(dueAt / 1000) * 1000` for iOS native DATE input only. Recheck semantic expiry immediately before registration; do not turn an already elapsed event into a new future alert through rounding.
  - Cover exact-second, fractional-second, near-expiry, invalid timestamp and delayed-preparation cases. Keep event payload `dueAt` exact and use task 5's format discriminator to replace old unrounded requests once. Retain cumulative schedule deadlines and final-event deduplication.
  - Depends on: 5. Evidence: C8, C9; Description — Known Follow-up Work 6; installed Swift trigger implementation.
  - Logging: helper has no logs; rejected native scheduling follows the existing bounded failure path.

- [x] Task 8: Localize background readiness and setup guidance in every catalog.
  - Files: `src/i18n/types.ts`, `ro.ts`, `en.ts`, `ru.ts`, `es.ts`, `fr.ts`, `de.ts`, `tests/i18n.test.ts`, `tests/notificationReadiness.test.ts`.
  - Provide complete typed copy for readiness/remediation, exact access granted/missing/unknown, selected-channel restrictions, battery Settings/help, and Home/lock usage. Explain Force Stop and MIUI settings in a concise expandable help area; do not present technical implementation details in the primary timer flow.
  - Keep Android-only help conditional, Romanian the default, user-entered names intact, and existing one-shot system sound versus foreground duration distinction accurate. Never translate an unknown capability into a confirmed blocker or a guarantee. Cover all readiness codes through typed catalog/formatting assertions.
  - Depends on: 3–7. Evidence: C4–C6, C10–C12; D3–D5.
  - Logging: no translation/render logs; tests check copy completeness and semantic state mapping.

<!-- Commit checkpoint: tasks 5-8 -->

### Phase 3: User setup, native acceptance and documentation

- [x] Task 9: Expose actionable background-alert status in Settings and active runs.
  - Files: `src/components/SettingsSheet.tsx`, `SystemNotificationNotice.tsx`, `src/hooks/useSystemNotifications.ts`, `src/context/CronoContext.tsx` only for the existing context interface; optionally new `src/components/BackgroundNotificationHelp.tsx`.
  - Use task 3's derived policy to show opt-in, OS permission, selected-channel/exact-access restriction, pending registration and retry separately. Offer the existing permission and app Settings actions plus exact/battery destinations and optional MIUI help. On return refresh observations; a Settings result code is not permission evidence.
  - Extend the shared notice for an active timer/schedule when a real blocker or registration failure needs action, including inside open sheets. Do not block timing itself, dismiss drafts, remount routes, restart audio or show native setup controls on web. Respect disabled/failed-hydration behavior, compact layouts, both palettes, touch targets and accessibility announcements.
  - Depends on: 4–8. Evidence: C1, C2, C4–C7, C10, C11.
  - Logging: WARN on failed navigation/retry boundaries only; no repeated warnings from rendering a persistent restriction.

- [x] Task 10: Complete automated lifecycle, persistence and UI regression coverage.
  - Files: registered notification/readiness/trigger/presentation Node suites, `tests/notificationResponses.test.ts`, `tests/e2e/notifications.spec.ts`, relevant `planning.spec.ts`, `timer.spec.ts`, `localization.spec.ts`, `tests/fixtures/app-v1-before-planning.json` (read-only).
  - Exercise C1–C12 where deterministic: all 51 future descriptors, exact-mode replacement, unchanged-capability no-op, silent sound/channel mapping, deferred failures, handoff, hydration and valid/stale taps. Use the literal legacy snapshot in restore→accepted future start→OS descriptor→return tests; preserve its history and false settings.
  - Extend web tests for localized unsupported behavior in six languages/two themes and retained timer/planning/settings flows. Test native readiness policy through injection; do not add a production debug bypass just to make browser tests pretend to be native. Check 320px layouts and larger text for new help. Run required lint/typecheck/core tests and relevant browser cases; exports are compatibility evidence only.
  - Depends on: 9. Evidence: all combinations, particularly C7–C11.
  - Logging: assert bounded warnings, no payload leakage and no unsolicited prompts; test failures retain useful operation names.

- [ ] Task 11: Build the native app and verify real background delivery.
  - Files/config to verify: `app.json`, local module config/source, `eas.json`, `package.json`; record results and exact build/source identifiers in this plan's progress section. Change build configuration only if the new local module requires it.
  - Generate native projects in an isolated directory; verify autolinking, exact/boot/notification permissions and byte-identical sounds. Do not hand-edit or commit generated root `android/` or `ios/`. Use the preview APK profile or the previously proven isolated local build; rebuild is required for the new native access probe. Do not remove app data or change signing identity silently.
  - Install/update the connected phone and execute the native acceptance matrix below. Android 12 phone evidence is required for its actual delivery; use an Android 33+ device/emulator for runtime-permission behavior and a current Android version for newer restrictions. Keep unavailable matrix rows explicitly pending. A passing browser suite or APK build cannot complete delivery acceptance.
  - Depends on: 10. Evidence: C1–C12; AGENTS — Native Validation.
  - Logging: collect only app-scoped failures and safe scheduling/capability metadata. Do not capture unrelated personal notifications. Any temporary emulator idle simulation must be restored; do not force-stop or reboot the user's phone without an explicit testing instruction.
  - Progress: rebuilt/installed Android 12 APK and the Home, process-reclamation, schedule and keyguard delivery checks passed. This task remains open for the outstanding native matrix below; do not repeat implementation or treat unavailable device checks as passes.

- [x] Task 12: Update setup and behavior documentation through `$aif-docs`.
  - Files: `README.md`, new or existing `docs/background-notifications.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, this plan's progress evidence.
  - Document Home/locked operation, permissions, exact access, selected channels, MIUI autostart/battery/lock-screen help, one-shot background sound, registration-pending behavior, force-stop and Doze limits, and recovery on return/reboot. Explain that calendar rules still require manual Start.
  - Record the new local read-only module and sole scheduling owner. Update the two known findings only after their respective regressions and available native checks pass. Replace stale build claims with dated evidence; retain pending iOS/current-Android/Doze checks as pending. Do not create a generic report or claim universal device reliability.
  - Depends on: 11's available evidence; unavailable native checks remain explicitly pending rather than fabricated. Evidence: requirements table and the matrix below.
  - Logging: no runtime logging; documentation examples use safe operation metadata only.

<!-- Commit checkpoint: tasks 9-12 -->

## Native Acceptance Matrix

Use a rebuilt native binary with known source revision/hash. Start from real UI actions. Verify pending OS registration before relying on an alert; where delivery is observed, record expected deadline, actual presentation and device policy. Do not treat inventory alone as delivery evidence.

| Scenario | Required observation |
|---|---|
| Timer → Home; timer → another app; timer → screen locked | A completion notification appears before opening CRONO again, with selected one-shot sound or intentionally silent visual delivery |
| Three-action schedule → locked; timer and schedule together | Action/final requests survive suspension, one final event only, independent owners; record OS throttling if boundaries are close |
| Immediate Home after Start and a 50-action schedule | Requests arm in advance without waiting for an app expiry callback; pending/partial registration is never shown as confirmed |
| Home/lock immediately around expiry | No lost event due to stale foreground suppression; active in-app behavior remains unchanged |
| Foreground timer/schedule expiry | Existing in-app notice/audio/Stop; no redundant system sound/banner |
| Ordinary app process reclamation / recents swipe | Already-armed requests remain native-owned; record MIUI-specific behavior separately from Android Force Stop |
| Android 33+ fresh permission, refusal, explicit retry, permanent denial | Requestable-denied can prompt; no repeated implicit prompts in the same owner lifetime; Settings route works when blocked |
| Exact access missing, then granted, then revoked and app reopened | Accurate transient status; inexact fallback disclosed; future alarms rearmed without duplicates or retrospective alerts |
| Selected channel blocked or muted; app/lock-screen notification settings restricted | Honest visibility/sound guidance; no changed channel ID to defeat user settings; silent notifications stay visual where permitted |
| MIUI autostart/battery policy and DND | Instructions match available settings; OS restrictions and observed delivery are distinguished, not silently changed |
| Deep Doze on an emulator/test device, including closely spaced schedule/timer boundaries | No dependence on JS; record delivery delay/quota effects. Do not claim guaranteed short-interval punctuality |
| Pause/reset/replacement/opt-out before leaving | Obsolete notifications do not arrive; unrelated clock requests survive |
| Cold/warm notification tap after several elapsed boundaries | Correct Timer/Planning route, silent catch-up, no clock restart or old audio replay; open drafts survive a warm tap |
| Reboot on an emulator/test device with future requests | SDK-owned recovery delivers future events where permitted, no replay of elapsed ones; do not add a competing boot scheduler |
| Force Stop on an emulator/test device | Document expected OS suppression; explicit reopen recovers only future events. This is a platform limit, not a delivery success case |
| iOS rebuilt app: Home/lock, sound settings, subsecond pause/resume, cold/warm taps | No truncation-induced early alert; correct system presentation and routing; mark physical iOS rows pending if unavailable |

Second-precise repeated alerts in deep idle are not a proven property of Expo's allow-while-idle path. If that becomes an explicit requirement, select an alarm-clock/foreground-service approach with the user before claiming acceptance. The current request is addressed through scheduled OS completion notifications with honest capability feedback.

## Verification Commands

Discovery: `ai-factory commands --json` at project root.
Catalog revision after test registration: `0d9d5df7abcbf49cf66b655c67f2484b2d2d09b08d0d756209bc568589c9892f`.
Manifest: `package.json`, SHA256 `3027a28194cd4ba300988830df84946a198b5558cfd54eb437a0756bcf0cc38a`.
Lockfile: `package-lock.json`, SHA256 `fd6a7c8e60b7af3cdddf2ee0b1c4c941c4fc194beb647e9b0aab2338a2a99557`.
Refresh the catalog after adding new test suites or changing either source. Declared commands are not proof of a successful run.

All package-command CWDs: repository root.

| Command ID | Planned command | Purpose |
|---|---|---|
| `package.json#/scripts/lint` | `npm run lint` | Required Expo ESLint gate |
| `package.json#/scripts/typecheck` | `npm run typecheck` | Required TypeScript gate, including new interfaces/module wrapper |
| `package.json#/scripts/test` | `npm test` | Registered Node suites, including permission and lifecycle regressions |
| `package.json#/scripts/test:e2e` | `npm run test:e2e -- tests/e2e/notifications.spec.ts tests/e2e/timer.spec.ts tests/e2e/planning.spec.ts tests/e2e/localization.spec.ts --workers=1` | Relevant UI regressions; these test paths exist in the starting revision |
| `package.json#/scripts/export` | `npm run export` | Android/iOS/web bundling; confirm no native module in web dependency path |
| `package.json#/scripts/build:android` | `npm run build:android` | Preview APK when an EAS project/account is available; otherwise use the proven isolated local build with recorded arguments |

Additional native/config tools follow `AGENTS.md`: `npx expo install --check`, `npx expo-doctor`, and isolated CNG/build inspection. No package installation, EAS submission, native build or device-policy mutation was run to discover commands. Node suites require Node.js 24 LTS or later. Windows npm/Node and Windows Git are the known working host tools for this mounted workspace.

## Planning Verification and Progress

- Read existing context, notification implementation/tests, installed SDK 57 native scheduling/permission/trigger source, official version-matched documentation and the earlier notification plan.
- All twelve implementation tasks remain unchecked. The application source, dependencies, native configuration and device settings were not changed during planning.
- Planning-time `npm run lint` and `npm run typecheck`: both passed with exit code 0 against the unchanged application source.
- At planning time, new behavior and native acceptance were not implemented or verified. The subsequent implementation evidence follows.

## Implementation Evidence

Code and automated checks are complete. Task 11 remains unchecked for the outstanding native acceptance matrix; task 12 documents available results without weakening those requirements.

### Regressions and implementation adjustments

- Permission regressions first failed on both the Android capability policy and the coordinator's gesture gate; the same registered cases pass after the fix. A refused prompt suppresses repeated implicit requests in that controller lifetime, while explicit retries remain possible.
- Physical Android verification found that `Constants.expoGoConfig` is truthy for this embedded release manifest. The old guard silently declared native notifications unavailable. A real-adapter import regression reproduced it before the fix. SDK 57 `isRunningInExpoGo()` now distinguishes Expo Go from release/development clients; all eight runtime/manifest combinations pass. The [versioned Expo API](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#isrunninginexpogo) and installed implementation were checked. This directly corrects native availability within task 11's scope.
- The browser regression run found an existing English calendar filter below the 44px touch-target requirement. `src/app/planning.tsx` now gives filter buttons a 44px minimum width; the same failing cases and all related layout/calendar cases pass.
- Failed optional capability reads preserve existing registrations; an event skipped as elapsed during native preparation is consumed so clock rollback cannot revive it. New suites are registered immediately in `package.json`.

### Automated results

- `npm test`: **156/156 passed**, including runtime detection, permissions, access-mode rearming/races, legacy snapshot preservation, activity handoff and iOS trigger mapping.
- `npm run lint` and `npm run typecheck`: passed after the implementation and runtime correction.
- Selected browser run: **116/118 passed in 4.8 minutes**; both failures were the undersized English calendar filter. After the minimum-width fix, **47/47 layout/calendar cases passed in 2.7 minutes**, including both failures. All 118 selected scenarios have passing evidence across the runs, not one clean full run. The later runtime correction is native-only and excluded from the web adapter.
- Fresh final Android/iOS/web exports passed after the native runtime correction. No CRONO native access probe or native notification/intent adapter is present in the web bundle.
- Isolated CNG/autolinking found the local Android module. All four generated raw sound resources matched source bytes. Native module compilation passed; the final release APK build passed in **1m 23s** after the first full build (**6m 43s**).

### Android device evidence

Device: Redmi Note 9, Android 12. App: `ro.appcrono.mobile`, version 1.0.0. The APK was installed over the existing app with the same signing identity; no uninstall or data clear occurred. It uses development signing, not a store-production signing setup.

Final APK SHA256: `d7b5562c26f242816d439a28098f1a6ff9829cc6f6a14d53ba71be4a9e498ee3`.
Runtime/config source fingerprint (100 files): `0d93589d011f1514d171ff5e5f7770ecb2ebb83e7090b81d8c27cbc680b0c7c2`.
The isolated build matched source; prebuild changed only staging npm Android/iOS scripts, which were restored to the source manifest before the final build.

| Check | Observed evidence |
|---|---|
| Native readiness | Settings showed configured notifications, exact access granted and standard battery optimization enabled. No permission/battery policy was changed. |
| Timer on Home with process reclaimed | Existing seven-second duration used. After Home, `am kill` removed the app process; process absence was confirmed before expiry. Android then posted one owned notification with HIGH importance, `mHidden=false` and the Classic raw sound URI. This was ordinary process reclamation, not Force Stop. |
| Two-action schedule on Home | A temporary `CRONO-QA` template used 7s and 9s actions. Android posted two new owned registration tags, approximately 9s apart, plus an OS-created grouping summary. The summary is not another schedule event. Return displayed the completed schedule; no duplicate final action notification was posted. |
| Timer with keyguard showing | Another seven-second run posted an owned notification while `showing=true` for keyguard. Android reported HIGH importance, `mHidden=false` and the expected Classic sound URI. The screen was awake by the time it was queried; this does not weaken the keyguard observation or prove an acoustic result. |
| QA cleanup | The temporary schedule was reset and deleted through the app UI. User history and other schedules were not edited. |

Actual lock-card appearance/acoustic playback was requested as an optional user confirmation and remains unconfirmed until an answer arrives. OS-posted records establish delivery, not heard audio or a screenshot of lock-screen presentation.

### Remaining native acceptance — task 11

- Physical iOS Home/lock, quantized date behavior, Focus/sound settings and taps.
- Android 33+ real runtime-permission dialogs, explicit denial/retry and permanent denial.
- Real exact-access revocation/grant return, selected-channel/mute variations, all sound patterns and audible playback.
- Deep Doze and closely spaced concurrent timer/schedule quotas; recents dismissal, reboot and Force Stop on a test device/emulator.
- Native cold/warm/stale taps with drafts, full TalkBack/VoiceOver, enlarged native text, and the remaining native UI/device checks.
- Manual lock-card/acoustic confirmation if the user does not answer the pending optional question.

These are pending, not failed or waived. The implementation uses the existing sole OS owner; it cannot promise delivery through user/OS restrictions or guaranteed repeated short-interval punctuality in deep idle.

### Documentation checkpoint

Completed through `$aif-docs`: the new English feature guide, scoped README updates, repository map and factual description/architecture maintenance. All 27 local links/anchors pass validation. Meaning preservation: PASS — saved-state, foreground audio, manual calendar starts and OS limits retain their scope. The existing README structure was retained; unrelated documentation reorganization was not part of this feature.

Resume task 11 for outstanding native acceptance rather than repeating completed code tasks. `$aif-verify` can review code and available evidence now. No commit, push or merge was performed.
