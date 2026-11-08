[Back to README](../README.md)

# Background and Lock-Screen Notifications

CRONO schedules local timer and schedule alerts with Android/iOS before their deadlines. You can then go Home, open another app or lock the phone. Timing uses saved deadlines; notification delivery does not require JavaScript to keep running.

## Usage

1. Install a rebuilt native app. Expo Go and the web preview cannot use CRONO's native notification resources.
2. Open **Setări → Notificări de sistem** (Settings → System notifications). The saved choice defaults on, including legacy data. Phone permission is separate.
3. Allow notifications from an accepted Start/Resume/Restart action, the enable switch or **Permite notificările**. Opening the app or Settings does not prompt automatically. Timing starts even if permission is unavailable.
4. On Android 12+, check **Alarme și mementouri** (Alarms and reminders). Granting this special access permits more precise alarms; it does not remove every power-management restriction.
5. Start the timer or a schedule and wait for notification preparation to finish before relying on a background alert.

The timer registers one completion. A schedule registers its remaining action boundaries, with one schedule-complete notification for the final action. Timer and planning run independently; one schedule can run at a time. Calendar weekday/date rules organize saved templates: **Pornește** still starts a sequence manually.

Pause, reset, restart, confirmed schedule replacement and notification opt-out update the relevant future requests. Language and selected sound changes update future content; theme, history and foreground sound-duration changes do not rearm identical alerts. Overdue return/relaunch catches up silently without replaying past in-app sounds or creating retrospective OS notifications.

Tapping a validated CRONO notification opens Timer or Planning without starting/resetting a run. Stale-run taps only navigate; existing drafts and confirmations stay open. Foreground expiry uses the existing in-app notices and playback. The notification handler also checks current activity during the transition out of the app.

## Status and Troubleshooting

| Status | Meaning and next action |
|---|---|
| Configured | Permission and observable delivery settings permit notifications. This is not proof that a particular alert has already arrived. |
| Preparing notifications | Native registrations are still pending. Let preparation finish. |
| Permission not granted | Use **Permite notificările**. Android can return a requestable denial; CRONO handles it without repeatedly prompting after a refusal in the same controller lifetime. Explicit retries remain available when allowed by the OS. |
| Permission/channel blocked | Open phone settings and allow app notifications or the selected sound channel. CRONO respects your channel choices instead of creating a new ID to bypass them. |
| Exact-alarm access missing | Use **Alarme și mementouri**. The SDK can fall back to an inexact alarm, which may arrive late. Older Android versions do not require this special access. |
| Some settings could not be checked | Check the phone settings. An older binary may lack the new capability probe while still supporting local notifications; an unknown observation does not disable otherwise valid alerts. |
| Update failed | Use **Reîncearcă notificările**. Failed cancellation/registration is reported separately from completion, audio and session-save feedback. |
| Saved data could not load | Reopen the app before managing notifications. Failed hydration must not erase existing valid OS requests. |

Settings and active timing notices show relevant problems with permission, the selected channel and registration. Battery optimization is advisory: being optimized does not establish that notifications are blocked. Conversely, an exemption does not prove that every manufacturer restriction is disabled.

### Android and Xiaomi/MIUI

- Allow app notifications and their lock-screen display. Enable sound for the selected channel if desired.
- On Xiaomi/MIUI, check **Autostart** and the app's **Battery → No restrictions** setting if alerts are delayed. Menu names vary by OS version. **Setări de baterie** opens public Android battery settings, with app settings as a fallback; CRONO does not silently change these settings.
- DND, silent mode, channel settings and lock-screen privacy remain under OS/user control. Private notification content can be hidden while the phone is locked. See [Xiaomi's lock-screen guidance](https://www.mi.com/global/support/faq/details/KA-692471/).
- Ordinary backgrounding, process reclamation and recents dismissal differ from **Force stop**. After an explicit Force Stop, reopen CRONO. Android can suppress/cancel pending work in that state; it cannot be bypassed by keeping a JavaScript timer alive. See [Android stopped-state behavior](https://developer.android.com/about/versions/15/behavior-changes-all).
- In deep Doze, Android throttles allow-while-idle alarms, including closely spaced schedule actions and a concurrent timer sharing the app quota. Exact access does not guarantee second-precise repeated alerts in that mode. See [Android Doze guidance](https://developer.android.com/training/monitoring-device-state/doze-standby).

On return from settings, CRONO refreshes actual capabilities rather than treating a settings-screen result as a grant. Successful cold hydration rearms validated future Android requests once; this also recovers from persisted SDK inventory whose underlying alarms were cancelled after special access was revoked. Identical normal refreshes reuse requests. See [Android alarm access and revocation](https://developer.android.com/develop/background-work/services/alarms).

### iOS

Allow notifications, sounds and lock-screen presentation in phone settings. Focus and Scheduled Summary can limit or delay alerts. There is no critical-alert entitlement or background-audio workaround.

The SDK 57 DATE implementation truncates milliseconds. CRONO rounds only the native iOS trigger upward to a whole second, adding less than one second through quantization. Original event identities and deadlines remain exact; an already elapsed semantic deadline is not revived by rounding. Physical iOS validation remains pending.

## Sound

The selected bundled Classic, Bell, Digital or Gong pattern plays **once** in a system notification. **Alerte sonore** off retains visual notifications through a silent channel. Phone/channel settings control sound and vibration independently from button haptics.

The 5/15/30-second duration and **Oprește sunetul** apply to looping playback inside the active app. They do not create a background loop or stop an already delivered OS sound. CRONO requests no microphone permission or background recording/playback mode.

## Configuration and Implementation

| Location | Responsibility |
|---|---|
| `app.json` | Existing notification plugin, four bundled sounds and Android exact-alarm permission; native configuration requires a rebuild. |
| `modules/crono-background-access/` | Read-only Android Expo module observing exact access and standard battery optimization. It does not schedule, store clocks or request exemptions. |
| `src/hooks/backgroundAccess.ts`, `.web.ts` | Optional native probe and platform fallback. Missing/failed optional observations stay unknown. |
| `src/hooks/notificationReadiness.ts` | Native-free policy separating permission, exact access, channel/sound state and registration outcome. |
| `src/core/notifications.ts` | Pure bounded future projection and validated version-1 payloads; at most 50 planning events plus one timer. |
| `src/hooks/notificationCoordinator.ts` | Sole serialized OS owner, unique physical IDs, relevant rearming, stale-result cleanup and owner-specific cancellation. |
| `src/hooks/systemNotifications.ts`, `.web.ts` | SDK 57 native calls and native-free unsupported web implementation. |
| `src/hooks/notificationPresentation.ts`, `notificationTrigger.ts` | Foreground handoff and native deadline mapping. |

Native availability uses the SDK's [`isRunningInExpoGo()`](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#isrunninginexpogo). An embedded release manifest can make `Constants.expoGoConfig` truthy; it is not an Expo Go detector. Regression coverage imports the real adapter with mocked platform boundaries for release, development-client and Expo Go cases.

Only `systemNotifications` and existing user preferences are persisted. Capability observations are transient. Schema version 1 and `@crono/app-v1` remain unchanged. OS requests retain validated ownership metadata and semantic event/run/deadline identities. Registration format/access mode can change without a saved-data migration. Unknown/foreign requests are never cancelled by a cancel-all shortcut.

The implementation uses local notifications, not a push server, device-token request, recurring background task, permanent foreground service or second timing store. See the [SDK 57 Notifications reference](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

## Builds and Verification

Use the existing build instructions in the [README](../README.md#installable-builds). The new local module requires a native rebuild; a JavaScript update alone cannot add its capability getter. Generated root `android/` and `ios/` projects remain untracked. Local module source under `modules/` is tracked.

Verification on November 8, 2026:

- Lint/typecheck and **156 registered Node tests** passed, including regression-first permission and embedded-runtime cases, capability/access races, presentation, iOS mapping and literal legacy-data preservation.
- The relevant browser run passed **116/118** cases. It exposed a pre-existing undersized English calendar filter. Adding a 44px minimum width fixed it; **47 layout/calendar cases** then passed, including both failures. All 118 selected cases have passing evidence across these runs, not one clean full run. Native-only runtime detection does not enter the web adapter.
- Android/iOS/web exports passed. A local release-mode APK was rebuilt and installed over the existing app on a Redmi Note 9 running Android 12, retaining its data and signing identity. This is development signing, not a store-production signing setup.
- Android confirmed configured notifications, exact-alarm access granted and standard battery optimization enabled. A seven-second timer delivered on Home after the app process was reclaimed. A two-action schedule delivered both boundaries at approximately seven and sixteen seconds on Home; return showed completed state. The temporary QA schedule was reset and removed.
- A further timer notification was posted while the keyguard was showing, with HIGH importance, `mHidden=false` and the selected Classic sound resource. Posted notification records establish OS delivery; actual lock-card appearance and acoustic playback still need manual confirmation.

The installed APK SHA256 is `d7b5562c26f242816d439a28098f1a6ff9829cc6f6a14d53ba71be4a9e498ee3`. Runtime/config source fingerprint: `0d93589d011f1514d171ff5e5f7770ecb2ebb83e7090b81d8c27cbc680b0c7c2`.

Physical iOS, Android 33+ permission dialogs, deep Doze, recents/reboot/Force Stop, all sound/mute/channel combinations, native notification taps and full accessibility checks remain pending. Browser tests and exports do not establish those results. See the [implementation plan](../.ai-factory/plans/feature-background-alert-reliability.md) for the full acceptance matrix and progress.

## See Also

- [README](../README.md) — setup, features and builds.
- [Architecture](../.ai-factory/ARCHITECTURE.md) — state, timing and notification ownership.
- [Project description](../.ai-factory/DESCRIPTION.md) — persistence and open follow-ups.
