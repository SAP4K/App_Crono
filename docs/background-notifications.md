[Back to README](../README.md) · [Backups →](backups.md)

# Background and Lock-Screen Notifications

CRONO schedules local timer and schedule alerts with Android/iOS before their deadlines. You can then go Home, open another app or lock the phone. Timing uses saved deadlines; notification delivery does not require JavaScript to keep running.

## Usage

1. Install a rebuilt native app. Expo Go and the web preview cannot use CRONO's native notification resources.
2. Open **Setări → Notificări** (Settings → Notifications), then use **Notificări de sistem**. The saved choice defaults on, including legacy data. Phone permission is separate.
3. Allow notifications from an accepted Start/Resume/Restart action, the enable switch or **Permite notificările**. Opening the app or Settings does not prompt automatically. Timing starts even if permission is unavailable.
4. On Android 12+, check **Alarme și mementouri** (Alarms and reminders). Granting this special access permits more precise alarms; it does not remove every power-management restriction.
5. Start the timer or a schedule and wait for notification preparation to finish before relying on a background alert.
6. For a full minute, choose **Setări → Sunete → Durata sunetului → 60 s**. A previously saved 5-, 15- or 30-second preference is preserved after upgrading. Check the Android extended-sound status; a rebuilt native app is required.

The timer registers one completion. A schedule registers its remaining action boundaries, with one schedule-complete notification for the final action. Timer and planning run independently; one schedule can run at a time. Calendar weekday/date rules organize saved templates: **Pornește** still starts a sequence manually.

Pause, reset, restart, confirmed schedule replacement and notification opt-out update the relevant future requests. Language and selected sound changes update future content. Duration changes also update enhanced Android registrations; theme/history changes and ordinary iOS notification duration choices do not rearm identical alerts. Overdue return/relaunch catches up silently without replaying past sounds or creating retrospective notifications. A native Android alert already ringing continues with its original remaining budget when you return.

Tapping a validated CRONO notification opens Timer or Planning without starting/resetting a run. Stale-run taps only navigate; existing drafts and confirmations stay open. The enhanced Android playback notification also has **Stop**, scoped to that alert, without resetting timing or navigating. Foreground expiry uses in-app notices and one audio owner; its system presentation is suppressed.

## Status and Troubleshooting

| Status | Meaning and next action |
|---|---|
| Configured | Permission and observable delivery settings permit notifications. This is not proof that a particular alert has already arrived. |
| Preparing notifications | Native registrations are still pending. Let preparation finish. |
| Permission not granted | Use **Permite notificările**. Android can return a requestable denial; CRONO handles it without repeatedly prompting after a refusal in the same controller lifetime. Explicit retries remain available when allowed by the OS. |
| Permission/channel blocked | Open phone settings and allow app notifications or the selected sound channel. CRONO respects your channel choices instead of creating a new ID to bypass them. |
| Exact-alarm access missing | Use **Alarme și mementouri**. The SDK can fall back to an inexact alarm, which may arrive late. Older Android versions do not require this special access. |
| Extended sound available | The Android module and observable alarm/notification access permit selected-duration playback. This is capability information, not proof of audibility. Android may display an alarm-clock indicator while a deadline is armed. |
| Short sound only | This Android binary lacks the enhanced module or its required capability. Available ordinary notifications use the 15-second clip; rebuild/check access to enable extended sound. |
| Some settings could not be checked | Check the phone settings. An older binary may lack the new capability probe while still supporting local notifications; an unknown observation does not disable otherwise valid alerts. |
| Update failed | Use **Reîncearcă notificările**. Failed cancellation/registration is reported separately from completion, audio and session-save feedback. |
| Saved data could not load | Reopen the app before managing notifications. Failed hydration must not erase existing valid OS requests. |

Settings and active timing notices show relevant problems with permission, the selected channel and registration. Battery optimization is advisory: being optimized does not establish that notifications are blocked. Conversely, an exemption does not prove that every manufacturer restriction is disabled.

### Android and Xiaomi/MIUI

- Allow app notifications and their lock-screen display. Enable sound for the selected channel if desired.
- On Xiaomi/MIUI, check **Autostart** and the app's **Battery → No restrictions** setting if alerts are delayed. Menu names vary by OS version. **Setări de baterie** opens public Android battery settings, with app settings as a fallback; CRONO does not silently change these settings.
- DND, silent mode, channel settings and lock-screen privacy remain under OS/user control. Private notification content can be hidden while the phone is locked. See [Xiaomi's lock-screen guidance](https://www.mi.com/global/support/faq/details/KA-692471/).
- Ordinary backgrounding, process reclamation and recents dismissal differ from **Force stop**. After an explicit Force Stop, reopen CRONO. Android can suppress/cancel pending work in that state; it cannot be bypassed by keeping a JavaScript timer alive. See [Android stopped-state behavior](https://developer.android.com/about/versions/15/behavior-changes-all).
- Enhanced Android delivery uses a user-visible alarm-clock request for the next boundary and rearms the following one independently of audio. Android may show its alarm indicator. Ordinary SDK fallback uses different alarm handling and can be delayed/throttled in deep Doze. Exact access does not remove OEM restrictions; physical Doze acceptance remains pending. See [Android alarm scheduling](https://developer.android.com/develop/background-work/services/alarms) and [Doze guidance](https://developer.android.com/training/monitoring-device-state/doze-standby).

On return from settings, CRONO refreshes actual capabilities rather than treating a settings-screen result as a grant. Successful cold hydration rearms validated future Android requests once; this also recovers from persisted SDK inventory whose underlying alarms were cancelled after special access was revoked. Identical normal refreshes reuse requests. See [Android alarm access and revocation](https://developer.android.com/develop/background-work/services/alarms).

### iOS

Allow notifications, sounds and lock-screen presentation in phone settings. Focus and Scheduled Summary can limit or delay alerts. There is no critical-alert entitlement or background-audio workaround.

The SDK 57 DATE implementation truncates milliseconds. CRONO rounds only the native iOS trigger upward to a whole second, adding less than one second through quantization. Original event identities and deadlines remain exact; an already elapsed semantic deadline is not revived by rounding. Physical iOS validation remains pending.

## Sound

Choose **5 / 15 / 30 / 60 seconds** for Classic, Bell, Digital or Gong. Fresh/missing/invalid preferences default to **60 seconds**; valid shorter saved choices remain unchanged. Select **60 s** explicitly after upgrading if needed. The duration starts when playback starts, with a separate four-second startup timeout.

| Platform/state | Playback and Stop |
|---|---|
| Rebuilt Android, app active | One native player loops for the selected duration; in-app **Oprește sunetul** stops it. Direct foreground sound/preview does not require OS notification permission. |
| Rebuilt Android, Home/another app/locked | With notification opt-in, notification/exact access and audible channel settings, a native alarm starts bounded playback through a media-playback foreground service. The selected 60-second budget also applies here. **Stop** in its notification silences the matching generation; **Open** navigates. |
| Android, leave/reopen during ringing | The same player and remaining budget continue when background delivery is allowed. Reopening does not restart the minute. With background delivery disabled/restricted, foreground-only playback stops when leaving. Preview always stops on leaving. |
| Android without enhanced capability | Available ordinary SDK notifications retain a one-shot 15-second clip and degraded status. A failed enhanced request is reported without retrying through a second audio path. |
| iOS | Active-app playback uses the selected duration. Background/locked notifications play the existing 15-second custom clip once; they do **not** provide a full minute or native Stop. |
| Web | Active-app playback and Stop are supported; background/locked/closed system alerts are unsupported. |

Phone/channel settings, silent mode, Focus/DND, audio-focus changes and OS delivery limits can silence, interrupt or override playback. **Alerte sonore** off retains visual notifications; preview remains available while active. Background playback uses the channel's effective sound URI. CRONO does not change volume, bypass silent/DND or request microphone permission. Notification vibration remains independent from button haptics.

Each action boundary has its own event; the last action and schedule ending produce one final alert. Actions advance on cumulative deadlines without waiting for sound. Live alerts replace previews, later deadlines replace earlier ones, and exact ties prefer timer, final schedule, then intermediate action. Interrupted sounds are never queued. With five-second steps, each new boundary can interrupt the previous minute.

The original short foreground patterns remain in `assets/audio/`. Separate clips in `assets/audio/notifications/` repeat those motifs to exactly 15 seconds, with a final 20ms fade. Regenerate them with:

```bash
npm run generate:notification-sounds
```

Rebuild the native app after changing these resources; a JavaScript update does not replace them. Resource basenames and Android channel IDs stay unchanged, preserving existing user/channel overrides. The clips fit [Apple's custom notification sound limit](https://developer.apple.com/documentation/usernotifications/unnotificationsound) of less than 30 seconds. Bundled clip length is not proof of audible duration on a particular phone.

## Configuration and Implementation

| Location | Responsibility |
|---|---|
| `app.json` | Existing notification plugin, four bundled sounds and Android exact-alarm permission; native configuration requires a rebuild. |
| `assets/audio/notifications/`, `scripts/generate-notification-sounds.mjs` | Four 15-second PCM clips and their reproducible generator; foreground sources remain separate. |
| `modules/crono-background-access/` | Read-only Android Expo module observing exact access and standard battery optimization. It does not schedule, store clocks or request exemptions. |
| `modules/crono-completion-alerts/` | Android atomic delivery ledger, next alarm-clock request, one MediaPlayer broker, bounded wake lock/service and scoped Open/Stop actions. |
| `src/core/completionAlerts.ts`, `src/hooks/nativeAlertPlayback.ts` | Validated shared request/policy, priority and duration contracts; native state mirroring without duplicate Expo audio. |
| `src/hooks/completionNotificationAdapter.ts`, `completionAlerts.ts`, `.web.ts` | Compose native/ordinary inventories under the existing coordinator; optional SDK-57 bridge and native-free web fallback. |
| `src/hooks/backgroundAccess.ts`, `.web.ts` | Optional native probe and platform fallback. Missing/failed optional observations stay unknown. |
| `src/hooks/notificationReadiness.ts` | Native-free policy separating permission, exact access, channel/sound state and registration outcome. |
| `src/core/notifications.ts` | Pure bounded future projection and validated version-1 payloads; at most 50 planning events plus one timer. |
| `src/hooks/notificationCoordinator.ts` | Sole serialized OS owner, unique physical IDs, relevant rearming, stale-result cleanup and owner-specific cancellation. |
| `src/hooks/systemNotifications.ts`, `.web.ts` | SDK 57 native calls and native-free unsupported web implementation. |
| `src/hooks/notificationPresentation.ts`, `notificationTrigger.ts` | Foreground handoff and native deadline mapping. |

Native availability uses the SDK's [`isRunningInExpoGo()`](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#isrunninginexpogo). An embedded release manifest can make `Constants.expoGoConfig` truthy; it is not an Expo Go detector. Regression coverage imports the real adapter with mocked platform boundaries for release, development-client and Expo Go cases.

Editable clocks, schedules and preferences remain in schema version 1 at `@crono/app-v1`. Capability observations are transient. The Android app-private atomic ledger persists validated delivery projections/policy, at most 51 pending events, 256 consumed receipts, 256 presented records and the latest response/failure. It is not a second editable timing store. Failed hydration cannot replace armed registrations. Backend/duration fingerprints can change without migrating saved user data; unknown/foreign requests are never cancelled by a cancel-all shortcut.

No push server, device-token request, permanent service or continuous background JavaScript is used. Android's service/wake lock last only through bounded alert playback, with cleanup on Stop/error/natural expiry. User force-stop, reboot restoration, uninstall and uninterrupted sound through system audio interruptions are outside this feature. See [Android media-playback services](https://developer.android.com/develop/background-work/services/fgs/service-types#media) and the [SDK 57 Notifications reference](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

## Builds and Verification

Use the existing build instructions in the [README](../README.md#installable-builds). The completion module requires a native rebuild; a JavaScript update alone cannot add its alarm, receiver or service. Generated root `android/` and `ios/` projects remain untracked. Local module source under `modules/` is tracked.

Verification on November 8, 2026:

- Lint/typecheck and **156 registered Node tests** passed, including regression-first permission and embedded-runtime cases, capability/access races, presentation, iOS mapping and literal legacy-data preservation.
- The relevant browser run passed **116/118** cases. It exposed a pre-existing undersized English calendar filter. Adding a 44px minimum width fixed it; **47 layout/calendar cases** then passed, including both failures. All 118 selected cases have passing evidence across these runs, not one clean full run. Native-only runtime detection does not enter the web adapter.
- Android/iOS/web exports passed. A local release-mode APK was rebuilt and installed over the existing app on a Redmi Note 9 running Android 12, retaining its data and signing identity. This is development signing, not a store-production signing setup.
- Android confirmed configured notifications, exact-alarm access granted and standard battery optimization enabled. A seven-second timer delivered on Home after the app process was reclaimed. A two-action schedule delivered both boundaries at approximately seven and sixteen seconds on Home; return showed completed state. The temporary QA schedule was reset and removed.
- A further timer notification was posted while the keyguard was showing, with HIGH importance, `mHidden=false` and the selected Classic sound resource. Posted notification records establish OS delivery; actual lock-card appearance and acoustic playback still need manual confirmation.

The APK used for the Android OS-delivery checks above had SHA256 `d7b5562c26f242816d439a28098f1a6ff9829cc6f6a14d53ba71be4a9e498ee3`. Runtime/config source fingerprint: `0d93589d011f1514d171ff5e5f7770ecb2ebb83e7090b81d8c27cbc680b0c7c2`. Those checks predate the longer notification clips.

Physical iOS, Android 33+ permission dialogs, deep Doze, recents/reboot/Force Stop, all sound/mute/channel combinations, native notification taps and full accessibility checks remain pending. Browser tests and exports do not establish those results. See the [implementation plan](../.ai-factory/plans/feature-background-alert-reliability.md) for the full acceptance matrix and progress.

### Longer Completion Sounds

The longer-sound implementation passed lint/typecheck, all **171 registered Node tests**, all **149 selected browser scenarios** in one 10.7-minute run, and fresh Android/iOS/web exports. Coverage includes preserved saved durations and literal legacy data, real-media 15-second playback, Stop, preview/alert priority, cancellation, independent timing and all six localized Settings layouts.

Isolated SDK 57 CNG copied all four clips byte-identically. The Android release build passed; inspection of the final APK found exactly one matching native resource for each 15-second clip. APK SHA256: `9522740691370a4f92f0e44480999e956d2d85a05b3a848c33adf7827db68705`. Source/config/assets/generator fingerprint: `dbff4699645c89980844317e86fe0cdf353c60318f06c6353694b30b9dbf19e6`. The package is `ro.appcrono.mobile` version `1.0.0`, signed with the same development certificate as the previous APK.

This APK was built but not installed during this implementation run. iOS configuration references the new resources without background audio/recording; no iOS binary was built. Physical confirmation remains pending for all four sounds on Home and the lock screen, existing-channel upgrades, mute/DND and channel overrides, short-step overlap and dismissal. See the [longer-sound plan](../.ai-factory/plans/feature-longer-completion-sounds.md).

### One-Minute Completion Alerts

Across November 8–9, 2026, lint/typecheck, **189/189 Node tests**, **15/15 Android JUnit tests** and Android/iOS/web exports passed. Native tests cover the atomic ledger, corrupt/failed writes, bounded receipts, shared priority cases, deadline selection, strict policy and a monotonic 60-second playback cutoff after preparation. The instrumentation source compiles; these checks do not establish physical sound.

The selected browser run passed **152/157** in 15.9 minutes. Four theme tests retained a 15-second expectation; their corrected 60-second boundaries passed all four on rerun. The English wheel-input case passed unchanged alone. All 157 selected cases have passing evidence across those runs, including real-media minute playback, Stop, cumulative schedule deadlines, legacy data and all six languages/both themes. After updating expanded notification help, all 15 notification cases passed again. This is not one clean 157-case run.

The final Android release-mode APK was built and inspected on November 9 after the accepted-preference guard passed native tests. Package: `ro.appcrono.mobile` version `1.0.0`/code `1`, Android 24+, arm64-v8a/armeabi-v7a. APK SHA256: `5c40f4aaf8c678c0cfa1d036d5cdd697563aae63c1460726ca7f5ce185f15473`; source/config/assets/module fingerprint: `3724691f0cccefcbddcd54e8151978dc0eae6be5f841bd839260617d4c439168`. Signature verification passed with the same development certificate as the preceding APK (`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`), suitable for a compatible test upgrade, not store-production release.

The APK contains both private receivers, the private `mediaPlayback` service, the final sound/duration guard and one byte-identical native resource per clip under the original resource names. Only the two foreground-service permissions were added relative to the preceding APK; no recording/full-screen permission was introduced. The existing Expo overlay declaration was retained and is unused by this feature. Generated native projects and build outputs remain outside Git.

MIUI rejected the dedicated instrumentation test package with `INSTALL_FAILED_USER_RESTRICTED`, so **0 instrumented tests ran**. The user chose **Continue without device tests for now**. No further installation was attempted in this run. Home/another-app/keyguard acoustic onset and 60-second cutoff, foreground-to-lock continuity, native Stop/Open, process reclamation, channel/silent/DND combinations and Android 14/15+ service policy remain pending. Earlier OS-delivery checks above used a different binary and do not validate this new broker. iOS background minute playback is not implemented; it retains the 15-second clip. See the [one-minute plan](../.ai-factory/plans/feature-one-minute-alerts.md).

## See Also

- [README](../README.md) — setup, features and builds.
- [Architecture](../.ai-factory/ARCHITECTURE.md) — state, timing and notification ownership.
- [Backups and import](backups.md) — portable saved data and live-clock preservation.
