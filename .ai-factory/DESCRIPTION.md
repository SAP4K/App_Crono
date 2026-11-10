# CRONO Project Description

## Purpose

CRONO is a local stopwatch, countdown, and action schedule app for iOS and Android, with a web preview. Its interface supports Romanian (default), English, Russian, Spanish, French, and German through manual saved selection in Settings. Users can time activities, run ordered action sequences, record laps, save sessions, review history, and share results without an account or an application backend.

## Implemented Features

- Short shared button press/release animations across routes, sheets, Planning and Settings. A live OS/browser reduced-motion observer suppresses scaling/interpolation and refreshes on foreground return. Web switches use bounded thumb/track transitions; native switches and duration wheels retain their own interaction behavior. Motion is transient and does not delay handlers or add haptics/audio/persisted settings. Physical native motion/accessibility acceptance remains pending.
- Fade between the four tabs (180 ms), slide shared sheets with a separate fading backdrop (240 ms in / 180 ms out), and animate incoming Settings/backup/editor panels (140 ms, at most 8 px). Live reduced motion or inactivity settles to the logical destination without replay on return. Retained exit payloads never retain active previews or file operations; animation callbacks only finish presentation/focus cleanup. No new dependency, saved setting or timing owner is added.

- Start, pause, resume, and reset a stopwatch; resetting requires confirmation.
- Display centiseconds and show hours for long sessions.
- Record lap splits and cumulative times, highlight the fastest laps, and calculate average lap duration.
- Save paused sessions and retain the latest 50 sessions, with up to 1,000 laps per session.
- View session details, share results, and delete sessions with confirmation.
- Run a separate countdown (one second to 23:59:59, five-minute default) alongside the stopwatch, with pause/resume, reset confirmation, restart, and visible completion across tabs/sheets.
- Configure the Timer with a compact setup and 1/5/10/25-minute presets without starting it; show a larger countdown and hide duration wheels while running or paused.
- Show a localized running end time, including a date across midnight. Add exactly one minute while running or paused when the adjusted total remains within 23:59:59; preserve run identity and exact paused milliseconds. Reset/Restart use the adjusted total.
- Select duration with finite centered wheels: hours 00–23 and minutes/seconds 00–59, no wrapping/carry. Timer editing is idle/completed only; Start and Planning Apply reject zero or active motion. Native columns expose adjustable controls; web supports scrolling, neighboring-row clicks and ArrowUp/ArrowDown/Home/End.
- Save up to 20 schedules with 1–50 named actions each, automatic advancement, exact pause/resume, confirmed replacement/reset, and protected running/paused templates. Names are limited to 80 trimmed characters; action durations range from one second to 23:59:59.
- Open eight localized built-ins as independent unsaved drafts: Focus, Workout, Pomodoro, Study, Meditation, Morning routine, Stretching and Active break. The chooser shows action counts, total durations and short previews within the main Planning scroll. Pomodoro includes four 25-minute focus blocks, three 5-minute breaks and a final 15-minute break. Names/actions/durations remain editable; opening a built-in from a selected date inherits that one-time rule. Only Save consumes a saved slot, and saved text stays independent of later language changes. Duplicate saved schedules into independent unsaved copies that retain actions/calendar rules and use a bounded localized copy suffix. Preview 2/3/4 total cycles and apply repeated actions locally within the 50-action limit; whole-schedule Save persists the result.
- Emphasize Start on saved Planning cards, show a short action/duration preview, and expose Edit/Duplicate/Delete through a labelled options disclosure. Keep whole-page scrolling, active-source protection and replacement/deletion confirmation.
- Edit an action duration inside the existing schedule sheet: temporary numeric wheels, explicit Apply/Cancel, then separate whole-schedule Save. Preserve the virtualized list viewport/focus and shared completion/Stop feedback; name fields retain their text keyboard.
- Scroll the complete schedule draft through one virtualized list: name, Scheduling, Repeat, count/total, actions, Add, errors and Save share the same owner. Covered-editor layout stays mounted while duration/calendar/repeat/discard bodies scroll within their available height. Independent duration columns retain their gesture behavior; returning restores source focus and the opening position when the layout is unchanged. The shared title/Close policy and final all-window acceptance remain open in the current plan.
- Organize saved schedules by recurring weekdays or a specific calendar date. Filter Planning by day and use the existing Start control to run a sequence.
- Run one schedule alongside the independent stopwatch and timer. The Planificare tab follows Timer; schedule runs do not enter stopwatch history.
- Show running/paused Timer and Planning controls above navigation when viewing another tab, including both activities concurrently. Reuse their existing Pause/Resume owners and keep foreground display ticks out of persistence.
- Select Clasic, Clopoțel, Digital, or Gong with 5/15/30/60-second looping playback, manual preview, and Stop controls. Defaults are Clasic and 60 seconds for fresh/missing/invalid values; valid saved shorter choices are preserved. The automatic-alert switch applies to timer and schedule boundaries.
- Use one native Android audio owner for foreground and authorized background/locked completion playback, bounded from actual audio start; preview stays foreground-only. A separate OS reconciliation owner registers future deliveries. Return/relaunch catches timing up silently without replaying old sound; an already ringing Android alert retains its remaining budget. Physical minute/lock acceptance remains pending.
- Schedule local Android/iOS timer/action/final notifications with default-on saved enablement, gesture-only permission requests, one selected sound clip or silent visual delivery, localized Settings/status/retry and validated tap navigation. Android 12 OS delivery is verified on Home, after process reclamation, for schedule boundaries and with the keyguard showing; broader native acceptance remains pending.
- Restore active timing state, schedule snapshots/templates, laps, history, and preferences from local storage.
- Export saved schedules, existing stopwatch history and preferences to portable JSON; review additive fresh-ID imports with optional preference application before confirmation, preserving current clocks and run snapshots. See [Backups and Import](../docs/backups.md).
- Group Settings into Appearance, Language, Sound, Notifications, Device, Data and About with current summaries, Back and Close. Leaving Sound or closing Settings cancels its preview while preserving real completion playback.
- Save System/Light/Dark selection independently from other preferences. System is the fresh/missing/invalid default, follows device/browser appearance live and on foreground return, and resolves unavailable detection to Light. Preserve valid manual white/blue Light and navy/blue Dark choices. Appearance changes preserve clocks, unsaved drafts and real completion playback; OS-only changes do not write preferences. Sound ID/duration, automatic alerts, mobile haptic feedback and screen wake lock remain independent.
- Select Romanian, English, Russian, Spanish, French or German manually in Settings; save the choice independently, translate built-in copy/dates/counts/sharing/announcements, and retain user-entered names and timing/audio lifecycles.
- Adapt the interface to compact screens, safe areas, readable supporting/action text, wrapping labels and larger touch targets within a constrained desktop preview width. Native large-text/accessibility acceptance remains pending.

## Technology Stack

Versions below describe the current package manifest, not a requirement to upgrade dependencies.

| Area | Implementation |
|---|---|
| Language | TypeScript with strict checking |
| Framework | Expo SDK 57 (`expo ~57.0.32`), React Native `0.86.3` |
| UI runtime | React `19.2.3`; React Native Web for browser previews |
| Navigation | Expo Router, entry point `expo-router/entry` |
| Portable files | SDK-compatible `expo-file-system ~57.0.7`, `expo-document-picker ~57.0.3`, `expo-sharing ~57.0.25`; platform-specific browser download/upload |
| Shared state | React Context and custom hooks |
| Persistence | AsyncStorage `2.2.0`, JSON schema version 1 |
| Device behavior | Expo Haptics, KeepAwake, SystemUI, StatusBar, and SplashScreen |
| Completion audio | Local Android MediaPlayer/alarm/service module; SDK-compatible `expo-audio ~57.0.5` on iOS/older Android binaries; `expo-asset ~57.0.20` and observed HTML media promise on web; four bundled patterns |
| System notifications | SDK-compatible `expo-notifications ~57.0.25`, `expo-intent-launcher ~57.0.1`, date requests and static notification resources; web unsupported |
| Visuals | React Native StyleSheet, react-native-svg, bundled Inter fonts |
| Core tests | Node.js test runner and strict assertions |
| Browser tests | Playwright using locally installed Google Chrome |
| Builds | EAS profiles in `eas.json` |
| Package manager | npm, with `package-lock.json` |

## Architecture

Pattern: **Layered Architecture adapted to a mobile application**, with shared pure stopwatch/countdown/schedule cores, global timing coordinators, one alert playback controller, and a separate OS notification coordinator.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the actual folder structure, dependency boundaries, data flow, and TypeScript examples. The app currently has one small functional domain; additional service, repository, or feature-module layers are not required for routine changes.

## Main Entry Points

| Path | Responsibility |
|---|---|
| `src/app/_layout.tsx` | Fonts, safe areas, shared/theme providers, startup gate, four-tab shell, settings, and notices |
| `src/app/index.tsx` | Stopwatch screen and user actions |
| `src/app/timer.tsx` | Compact duration setup, presets, active countdown and extension controls |
| `src/app/planning.tsx` | Saved cards, templates/duplication, editor composition, and confirmed run replacement |
| `src/app/history.tsx` | Session history, details, sharing, and deletion |
| `src/core/stopwatch.ts` | Types, immutable timing operations, limits, formatting, statistics, and stored-data validation |
| `src/core/timer.ts` | Pure countdown transitions, atomic bounded extension, restoration, parsing, and ceiling-based display |
| `src/core/durationPicker.ts` | Pure numeric parts, duration conversion, bounds and nearest-row clamping |
| `src/components/DurationPicker.tsx`, `DurationWheel.tsx`, `.web.tsx` | Localized themed columns, native adjustment and web spinbuttons |
| `src/hooks/durationWheel.ts`, `useDurationWheel.ts` | Shared injected settling generations and lifecycle/current-prop bridge |
| `src/core/planning.ts` | Schedule bounds, validation/CRUD, run snapshots, and cumulative transitions |
| `src/core/planningTools.ts` | Pure templates, independent copies and bounded flat repeated sequences |
| `src/core/backup.ts` | Strict portable projection/parser and additive fresh-ID imports |
| `src/core/planningCalendar.ts` | Civil date validation, rule normalization, and date matching |
| `src/core/sounds.ts`, `src/audio/sources.ts` | Pure preference catalog and separate static asset map |
| `src/hooks/useStopwatch.ts` | Hydration outcome, accepted-update subscriptions, serialized writes and app-state persistence |
| `src/context/CronoContext.tsx` | Shared state, global timer/planning runners, one audio owner, notices, haptics, and one screen wake guard |
| `src/context/ThemeContext.tsx` | Resolved theme, navigation palette and serialized native root background |
| `src/context/MotionContext.tsx`, `src/hooks/motionPreference.ts` | One live reduced-motion/activity observer and layout-free covered-surface scopes |
| `src/components/MotionPressable.tsx`, `src/hooks/pressMotion.ts`, `usePressMotion.ts` | Ref/style-safe single Pressable host and cancellable finite visual transitions |
| `src/components/NavigationScene.tsx`, `.web.tsx` | Focused scene input/accessibility gates around navigator-owned fades |
| `src/hooks/transitionMotion.ts`, `useSheetMotion.ts`, `src/components/PanelTransition.tsx` | Injected finite presence/entrance controllers and stable Animated bindings |
| `src/hooks/useSheetPresentation.ts` | One token-guarded display payload retained through a logical close |
| `src/core/themePreference.ts` | Pure saved System/Light/Dark validation/default and effective Light/Dark resolution |
| `src/hooks/themeAppearance.ts`, `useSystemTheme.ts` | Appearance override release, fresh reads, live/foreground observation and bounded background writes |
| `src/hooks/timerCompletion.ts` | Injectable completion coordinator with current-state guards and cancellation |
| `src/hooks/useTimerCompletion.ts` | Readiness and foreground lifecycle adapter for the coordinator |
| `src/hooks/planningRunner.ts`, `usePlanningRunner.ts` | Accepted schedule transitions, boundary identity, and silent lifecycle reconciliation |
| `src/hooks/alertPlayback.ts`, `useAlertPlayback.ts` | Shared duration limits, event priority, preview/Stop, and scoped failures |
| `src/core/completionAlerts.ts`, `src/hooks/nativeAlertPlayback.ts` | Shared validated policy/priority and Android state mirroring with scoped cancellation |
| `src/hooks/completionNotificationAdapter.ts`, `completionAlerts.ts`, `.web.ts` | Native/ordinary notification composition and optional platform bridge |
| `modules/crono-completion-alerts/` | Atomic delivery projections/receipts, one native alarm/audio owner and bounded media-playback service |
| `src/hooks/useAlertSound.ts`, `.web.ts` | Source-bound native/browser playback with explicit cleanup |
| `src/components/StopwatchFace.tsx` | Local display refresh and stopwatch dial |
| `src/components/TimerFace.tsx`, `TimerCompletionNotice.tsx` | Local countdown display and completion feedback in shell/sheets |
| `src/components/ScheduleEditorSheet.tsx`, `ScheduleStepRow.tsx` | Controlled drafts, ordered actions, validation, and explicit save/discard |
| `src/components/ScheduleCard.tsx`, `ScheduleRepeatPanel.tsx` | Primary/secondary card actions and explicit repetition preview |
| `src/components/ScheduleCalendarPanel.tsx`, `CalendarDateFields.tsx` | Calendar rule drafts and date entry shared with the Planning filter |
| `src/components/EditorBody.tsx`, `.web.tsx` | Keep a covered virtualized editor laid out while excluding interaction/accessibility |
| `src/components/PlanningRunCard.tsx`, `PlanningNotice.tsx`, `TimingNotices.tsx` | Local schedule display, controls, and shared notices/Stop in shell/sheets |
| `src/components/ActiveActivities.tsx`, `src/hooks/useForegroundNow.ts` | Cross-tab activity controls and local foreground display ticks |
| `src/components/SettingsSheet.tsx`, `BackupSettings.tsx` | Grouped preferences and reviewed file transfers |
| `src/hooks/backupTransfer.ts`, `useBackupTransfer.ts` | Transfer cancellation, hydration guards and latest-state import confirmation |
| `src/hooks/backupFiles.ts`, `.web.ts` | Optional native file modules and browser upload/download resources |
| `src/components/Sheet.tsx`, `src/hooks/sheetIsolation.ts`, `.web.ts` | Shared sheet navigation and background accessibility/interaction isolation |
| `src/core/language.ts`, `src/core/notices.ts` | Pure language registry/defaults and semantic transient notices |
| `src/i18n/`, `src/hooks/useI18n.ts` | Typed stable catalogs, cached locale/plural/share formatting, and saved selection |
| `src/core/notifications.ts`, `src/i18n/notificationContent.ts` | Future projection/payload validation and selected-language notification content |
| `src/hooks/notificationCoordinator.ts`, `useSystemNotifications.ts` | One serialized native request owner, hydration/lifecycle safeguards and gesture permission flow |
| `src/hooks/systemNotifications.ts`, `.web.ts`, `notificationTypes.ts` | Date requests, inventory, channels, permissions, settings and unsupported web policy |
| `src/hooks/notificationResponses.ts`, `useNotificationNavigation.ts` | Validated buffered/deduplicated Router navigation after notification taps |
| `src/audio/notificationSounds.ts`, `src/components/SystemNotificationNotice.tsx` | Native names/channels and independent failure/retry feedback |
| `src/theme.ts` | Pure semantic light/dark palettes and font-family names |

## Data and Persistence

The `AppData` object contains:

- `version: 1` to identify the persisted schema.
- `stopwatch`: accumulated milliseconds, an optional start timestamp, and recorded laps.
- `timer`: status, configured duration, remaining snapshot, optional deadline, and run identity.
- `planning` contains saved schedules with optional weekly or fixed-date rules and a separate run snapshot with its identity, source ID/name/actions, status, current index, remaining milliseconds, and optional deadline. Valid templates with missing or invalid calendar metadata load in Manual mode.
- `sessions`: saved session identifiers, save timestamps, total durations, and laps.
- `preferences`: `language: 'ro' | 'en' | 'ru' | 'es' | 'fr' | 'de'`, `haptics`, `keepAwake`, `timerSound`, and `systemNotifications` booleans, `theme: 'system' | 'light' | 'dark'`, `alertSoundId: 'classic' | 'bell' | 'digital' | 'gong'`, and `alertDurationSeconds: 5 | 15 | 30 | 60`. The legacy `timerSound` name now controls automatic timer and schedule alerts. Theme stores the selected preference; its resolved Light/Dark mode is transient.

The hook stores the entire object as JSON under `@crono/app-v1`. Actions go through `update(action)`, which applies a functional transformation and queues a write. Its synchronous `{ changed, data }` result confirms in-memory acceptance, not durable storage; stable `getSnapshot()` reads the current accepted state. Additional writes are requested when the app leaves the active state. Display refreshes do not persist a new snapshot on every frame.

Portable backups use a separate version-1 `crono-backup` envelope, limited to 5 MiB of UTF-8 JSON. Strict validation rejects malformed records/preferences before preview; confirmation rechecks loaded hydration and combined capacity in one functional update. Imports add independent copies without eviction, with preference application off initially. Files exclude live clocks, run snapshots, OS authorization and native delivery records. Failed hydration disables file transfers; accepted imports retain existing storage-failure feedback rather than claiming durable writes. Native picker/share uses optional modules loaded on demand and needs a rebuilt app; web uses upload/download.

Portable theme validation accepts all three selected preferences. System resolves against the receiving device and is never exported as a substituted manual mode. Old manual version-1 files remain supported; older app versions may reject new files containing System.

Wheel offsets, motion flags and temporary parts are local presentation state, with no persisted schema changes. A settled effective valid Timer change uses the existing timer controls; focus/alignment/same-value scrolling cannot reset completion or stop its audio. Planning Apply updates only the identified local action draft; Save retains the shared accepted-update boundary.

`restoreData` validates unknown JSON and filters invalid stored records. Unsupported versions and malformed input fall back to initial data. This fallback is existing behavior, not a migration strategy for future schema changes.

Optional timer/planning/preferences additions retain version 1 and the storage key. Missing or invalid fields independently default to Romanian language, System theme, an idle five-minute timer, empty planning, Clasic, and 60-second sound; automatic alerts and system-notification opt-in default on. Valid saved Light/Dark and 5/15/30/60-second choices remain unchanged. OS authorization is queried separately and never persisted. Existing valid clocks/history and false preferences are preserved. Schedule restoration filters bad templates independently and rejects incoherent run snapshots independently; validated snapshots can outlive their source template. Valid overdue runs remain running until the provider reconciles them. Literal pre-planning data covers restoration, settings, real playback, completion and reload.

The Android completion module keeps a separate app-private atomic delivery ledger: validated projections/policy, at most 51 pending events, bounded 256-item consumed/presented inventories and the latest buffered response/failure. It stores no second editable clock/schedule/history. Successful app hydration gates policy synchronization and reconciliation; a failed read cannot clear armed native work.

Time is derived from `Date.now()` timestamps and accumulated paused time. Background time counts on return. Manual changes to the device clock can affect measurements; this app does not provide a metrological accuracy guarantee.

## Platform Behavior

- Android and iOS are the primary platforms; web provides a preview and browser test target.
- Haptics and screen wake lock are enabled only on mobile and respect saved preferences.
- One wake guard covers any running stopwatch, timer, or schedule. Theme and sound controls also work on web; manual appearance overrides the OS setting. The interactive shell waits for storage/fonts; the static native splash cannot read the saved preference before JavaScript.
- Timer and schedule coordinators belong to the provider and publish effects only after accepted updates. Actions advance against cumulative deadlines without waiting for sound; delayed callbacks publish only the latest crossed boundary. Hydration/background return catches up silently; completed hydration never replays sound. Android lifecycle suspension leaves authorized native live playback intact while explicit pause/reset/replacement/mute cancels obsolete requests. iOS/web retain foreground-only loops. No recording permission or iOS background audio/remote-notification mode is configured.
- One playback controller arbitrates all alerts and previews. Live alerts outrank previews; later live deadlines win, with exact ties ordered timer completion, schedule completion, then action boundary. The final action emits only a schedule-complete event. Patterns loop for the selected duration after playback starts; startup is limited to four seconds. Stop, mute, sound/duration changes, and lifecycle cleanup cancel obsolete playback without resetting timing. Owner-specific pause/reset cannot cancel another activity's sound. Settings close cancels only preview; preview may play while automatic alerts are muted.
- Native and browser transports create a player for each accepted request and release old resources explicitly. Audio errors match their event/run; a later success clears old feedback without clearing unrelated session-save notices. TimingNotices projects completion and Stop into both shell and open sheets.
- Native sound respects silent mode and mixes with existing audio. Browser autoplay rejection produces visible feedback; the web adapter observes `HTMLMediaElement.play()` because SDK 57's web player does not observe that promise.
- Native system requests survive ordinary backgrounding/owner cleanup, suppress foreground system presentation, and are diffed against accepted future clocks and relevant language/sound/mute/opt-in changes. Failed hydration disables notification mutation, while denied/limited grants and native failures remain separate from saved preference and timing. Android uses four stable sound channels plus silent and a special-access Settings shortcut; OS policy can delay/silence delivery. Taps only navigate to validated timer/planning routes after startup readiness, retaining open drafts.
- Enhanced Android delivery uses `setAlarmClock`, silent notification envelopes and one bounded MediaPlayer service for the selected duration, with scoped Stop/Open. The same broker owns active-app audio, avoiding overlap with Expo playback. Ordinary Android fallback and iOS background retain one-shot 15-second PCM clips from `assets/audio/notifications/`; iOS has no full-minute background guarantee. Original assets, generator, resource basenames and channel IDs remain unchanged. `timerSound: false` retains visual delivery. Silent/DND/channel controls and audio focus can interrupt or suppress sound. Web background is unsupported; missing native capability has explicit degraded status and requires a rebuilt binary for enhanced playback.
- Session results use React Native Share on mobile; web uses native browser sharing when available, otherwise the clipboard. Portable backups use native picker/share sheets or browser upload/download.
- CRONO stores application data locally on the device or in browser storage; users choose destinations for exported backups and shared results. Uninstalling the app or clearing browser data removes its local data.
- Native projects are generated through Expo Continuous Native Generation. The repository has no checked-in `ios/` or `android/` directories.

## Development and Verification

The [screen and sheet transition plan](plans/feature-screen-sheet-transitions.md) records the current implementation and final quality-gate evidence. Its controller tests cover readiness, interrupted/reopened requests, stale/synchronous callbacks, disposal and immediate failure fallback. Browser checks observe actual route/sheet/panel movement, root isolation, focus, retained drafts, immediate file cancellation and the literal legacy file through real backup/import. Frozen-clock domain fixtures use Reduce motion; normal-motion cases retain real frames. Native physical transition/keyboard/Back/accessibility acceptance remains deferred; exports establish bundling only.

The [interaction animation plan](plans/feature-interaction-animations.md) records current implementation progress and source-bound checks. Its registered Node tests cover query/event ordering, foreground refresh, cancellation and stale completions; browser checks exercise real holds/cancellation, keyboard/Link/ref behavior, disabled controls, idle settling, file transfer and all six language/palette compact layouts. Native touch feel, reduced-motion changes, native-driver behavior and assistive-technology acceptance remain pending under the existing device-test deferral.

Usability improvements verified on 2026-11-09: lint/typecheck, **227 registered Node tests**, and Android/iOS/web bundle exports passed. All **282 distinct browser cases** have passing results across the focused journeys, the 265-pass remaining-suite run and the 15-case scrolling rerun; this is combined coverage, not one clean full-suite invocation. Application source/configuration fingerprint: `461fd2ce42e87271e8053326cf8bc50386a6054d5f702ff5cb676efc5c3731a1` (SHA256 over sorted `src/**/*.ts`, `src/**/*.tsx`, `package.json`, `package-lock.json`, `app.json` paths and contents, each separated/terminated by NUL).

Coverage includes legacy export/import/edit/reload, live-clock preservation, fresh copies, capacity/errors, optional preferences, inertial wheels, six languages/two themes, reduced motion and compact/enlarged web text with both activity rows. See the [current plan and evidence](plans/feature-usability-improvements.md) and [backup guide](../docs/backups.md). Native file transfer requires a rebuilt app; physical picker/share, gesture feel, large text, TalkBack/VoiceOver and existing minute/lock-screen acceptance remain pending. These exports are not a signed build or new device-test evidence.

Historical one-minute alert implementation checks: lint/typecheck, **189 Node tests**, **15 native JUnit tests** and Android/iOS/web exports pass. All **157 selected browser scenarios** have passing results across the initial 152/157 run and exact reruns; the four stale theme-duration assertions were corrected to 60 seconds, and the English wheel case passed unchanged. Real-media minute playback passed. The 15 notification cases passed again after expanded-help copy changes. Native instrumentation compiles, but MIUI blocked test-package installation and the user deferred device tests; **0 instrumented tests ran**. Native Home/keyguard audibility, Stop/Open and Android 14/15+ policy remain pending. The [one-minute plan](plans/feature-one-minute-alerts.md) and [guide](../docs/background-notifications.md#one-minute-completion-alerts) distinguish implementation/build evidence from physical acceptance.

A final development-signed release-mode APK was built/inspected on November 9: SHA256 `5c40f4aaf8c678c0cfa1d036d5cdd697563aae63c1460726ca7f5ce185f15473`, source fingerprint `3724691f0cccefcbddcd54e8151978dc0eae6be5f841bd839260617d4c439168`, package `ro.appcrono.mobile` version `1.0.0`/code `1`, two ARM targets. Signature matches the preceding app. New native classes, private components, original sound-resource names/bytes and the final preference guard were inspected. It has not been installed or acoustically verified; user data was not cleared and no store-production signing is established.

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run web` | Start the web preview |
| `npm run lint` | Run Expo ESLint checks |
| `npm run typecheck` | Run TypeScript without emitting output |
| `npm test` | Run core logic tests; requires Node.js 24 LTS or later |
| `npm run test:e2e` | Run browser scenarios; starts or reuses port 8091 |
| `npm run export` | Export JavaScript/assets for all platforms |
| `npx expo-doctor` | Diagnose Expo dependency and configuration issues |

Language expansion checks on 2026-11-07: lint/typecheck, all 96 Node tests, all 162 browser scenarios in one full run (8.0min), and fresh Android/iOS/web exports passed on the source identified in `plans/feature-additional-languages.md`. All six languages cover both themes at 390px; Spanish/French/German/Russian also cover 320/430/1024px. The new languages cover 130% web text and reduced motion. Final catalog glyphs exist in all five loaded Inter weights; representative screenshots were inspected. Saved/default selection, exact plurals/dates/sharing, literal legacy data, native-content reconciliation, mounted drafts, independent clocks, notice deadlines and real pending/playing playback are covered. Native devices/accessibility/OS delivery and independent linguistic review remain pending. No dependency, storage schema/key, native config or timing/audio policy changed for this expansion.

Duration-wheel checks on 2026-11-06: lint/typecheck, all 103 Node tests and Android/iOS/web exports passed. Full browser run: 118/119 passed in 24.1min; the unchanged stopwatch journey timed out at 45 seconds, then passed alone in 26.1s with no source/config change. All 119 cases therefore have passing results across those runs, not one clean full pass. Fifteen picker cases cover real scrolling/touch, motion/cancellation, endpoints/zero, disabled clocks, no-op completion/audio, actual legacy data, concurrent feedback, fifty-action save/reorder/removal and all languages/palettes with enlarged web text. Screenshots were inspected. Implementation/test/config/asset fingerprint `b6ed99c1e947aa64ab588ceb17edcaac08f44b6c96013c684cf7d1a90bcec394`; details are in `plans/feature-duration-wheel-picker.md`. No new dependency was added. Physical native gestures, keyboard avoidance, list return, VoiceOver/TalkBack, font scaling and reduced motion remain pending.

Notification implementation checks on 2026-11-06: lint/typecheck, 89 Node tests, all 104 browser scenarios in one full run (4.7min), fresh Android/iOS/web exports, dependency compatibility and 21/21 Expo Doctor checks passed. The five recommended SDK-57 patch updates were installed through Expo. Fresh isolated Android CNG verified SCHEDULE_EXACT_ALARM and byte-identical raw sound resources; iOS config introspection has no microphone or audio/remote-notification background mode. The native implementation is excluded from web. Physical Home/lock delivery, audible/visual behavior, permissions, exact access/Doze/channel/reboot settings and cold/warm taps remain pending; no APK/IPA or signed build was produced. Detailed evidence and source fingerprint are in the notification plan.

Earlier multilingual checks on 2026-11-06: lint/typecheck, all 59 Node tests, all 95 browser scenarios in one complete 4.6-minute run, and fresh Android/iOS/web exports passed. Both themes cover all three languages at 390px; Russian also covers 320/430/1024px. Tests cover manual saved choice, defaults/legacy data, user text, localized sharing, concurrent timing, pending/playing real audio, silent catch-up and unchanged feedback lifetimes. Native-device and independent native-speaker checks remain pending.

Historical theme-refresh checks on 2026-11-05: 51 Node tests, lint/typecheck, and all 56 Playwright scenarios pass in one full browser run (7.6 minutes) against the development server on port 8091. The unchanged stopwatch journey passes in 21.7 seconds; 45-second timeouts and no retries are retained. Android/iOS/web export passed before the test-configuration fix, which does not change application code.

The preceding verification run passed 55/56 browser scenarios: repeated compressed Metro bundle loads exhausted the stopwatch journey's time limit, including a 90-second diagnostic. Playwright now requests uncompressed responses from the local server, resolving that verification failure without changing assertions or application behavior.

Both palettes cover 320/390/430/1024px, saved/legacy preferences, concurrent clocks, and pending/playing audio through theme changes; representative screenshots were inspected. Each palette checks 31 foreground/surface contrast pairs. All 12 sound/duration combinations retain controller coverage; browser checks observe playback calls and decode all four actual assets.

The earlier baseline passed dependency compatibility and 21 Expo Doctor checks before this notification change. The current change adds native notification/intent modules and notification resource/plugin configuration while retaining playback-only audio settings. Physical-phone audible duration/Stop, silent mode/routing, keyboard, appearance, wake lock, and locked/background return remain pending because no native device/runtime is available. Signed builds remain unverified.

Install app dependencies through `npx expo install <package>` to resolve SDK-compatible versions. Follow [AGENTS.md](../AGENTS.md) for versioned documentation requirements and EAS commands. Browser tests and successful exports do not establish physical-device behavior or signed-build readiness.

Background-alert hardening on 2026-11-08 passed lint/typecheck and all 156 registered Node tests, including requestable-denied permission and real-adapter runtime-loading regressions. The selected browser run passed 116/118 cases; a 44px minimum-width fix for the English calendar filter then passed all 47 layout/calendar rechecks. All 118 selected scenarios have passing evidence across those runs. Fresh Android/iOS/web exports also passed after the native-only runtime correction.

A rebuilt, development-signed release-mode APK was installed on a Redmi Note 9 running Android 12 without uninstalling the app. Native Settings confirmed notification availability, exact access granted and standard battery optimization enabled. OS records confirmed a seven-second timer after process reclamation, both boundaries of a seven/nine-second schedule on Home, and another timer with the keyguard showing. The temporary QA schedule was removed. Physical iOS, Android 33+ prompts, deep Doze, recents/reboot/Force Stop, native taps, full sound/accessibility checks and manual lock-card/acoustic confirmation remain pending. See [the background guide](../docs/background-notifications.md) and [the background-alert plan](plans/feature-background-alert-reliability.md).

## Known Follow-up Work

The original repository review on November 4, 2026 identified findings 1–4. The November 6 notification review added findings 5–6. Duration-wheel work did not resolve them; the November 8 notification implementation addresses findings 5–6 below:

1. A failed initial storage read leaves the hook ready with initial data. A subsequent action can overwrite previously stored history. This was reproduced with a simulated browser storage read failure. The notification feature now guards its own writes/inventory on failed hydration; unrelated existing writes still require a separate storage fix.
2. The permitted maximum history can produce a single JSON entry larger than Android AsyncStorage's [documented per-entry read limit](https://react-native-async-storage.github.io/2.0/advanced/Limits/). A generated valid 50-session history with 1,000 laps per session was approximately 2.33 MiB. Physical-device reproduction is still needed.
3. Dependency audit alerts require triage before release; no CI workflow is present. A development-signed Android APK has now been built and exercised on Android 12; iOS and store-production signing/release verification remain pending.
4. Lap lists currently render all recorded rows without virtualization.
5. Addressed in code on November 8: Android SDK 57 requestable-denied permission now passes both capability and gesture gates. Regression cases failed before the fix and pass afterward; actual Android 33+ permission-dialog acceptance remains pending.
6. Addressed in the adapter on November 8: native iOS DATE input is rounded upward to whole seconds while semantic deadlines remain exact; elapsed events are rejected. Registered boundary tests pass. Physical iOS precision/delivery validation remains pending.

Findings 1–4 remain separate follow-ups. Keep the remaining native acceptance checks for 5–6 explicit; these notification changes do not change storage formats or establish store-release readiness.

## AI Factory Context

- Configuration: `config.yaml`.
- Architecture: `ARCHITECTURE.md`.
- Base conventions: `rules/base.md`.
- Repository map and Expo requirements: `../AGENTS.md`.
- Installed workflow skills: `../.agents/skills/` (33 existing AI Factory skills).
- Communication and generated artifact languages: English, as configured.
- Git base branch: `master`; new full/ultra plans may create branches using `feature/`.
- Latest implementation: [Screen and sheet transitions](plans/feature-screen-sheet-transitions.md), extending the existing [interaction animations](plans/feature-interaction-animations.md) with route fades, sheet presence and incoming panels. Both plans distinguish source-bound checks from deferred native acceptance.
- The earlier active [Unified window scrolling plan](plans/feature-unified-window-scrolling.md) has implemented the complete editor body and bounded subpanels. The explicit title/Close choice is still unanswered; shared-window acceptance and final documentation/validation closure remain pending. Existing and new browser evidence is scoped to tested behavior, not physical native acceptance.
- The completed [Planning template library plan](plans/feature-more-planning-templates.md) expands the bundled chooser to eight localized editable drafts with count/duration summaries and retained saved-data/backup compatibility. Lint/typecheck, all 245 Node tests and Android/iOS/web exports passed; all 105 selected browser cases have passing results across focused and regression runs. Source identities and exact selections are recorded in the plan; physical native gesture/accessibility acceptance remains pending.
- The earlier completed [System theme detection plan](plans/feature-system-theme-detection.md) adds saved System/Light/Dark choices, fresh and foreground appearance detection, backward-compatible manual saves and portable preferences, localized controls and continuity coverage. Lint/typecheck, all 241 registered core tests and Android/iOS/web exports passed; all 267 selected browser cases have passing results across the main run and targeted reruns. Source identity and earlier navigation/worker failures are recorded in the plan; physical native appearance acceptance remains deferred.
- Earlier [Everyday usability improvements](plans/feature-usability-improvements.md) delivered Timer setup/end-time/extension controls, Planning cards/shortcuts, grouped Settings/readability, cross-tab controls and portable backups. Those eight product improvements are implemented; native acceptance remains deferred at the user's request.
- Earlier one-minute sound work remains at `plans/feature-one-minute-alerts.md`: four duration choices, optional Android alarm/audio module and truthful platform capability. Device acceptance is deferred at the user's request. The preceding 15-second native clip work remains at `plans/feature-longer-completion-sounds.md`. Earlier hardening is recorded in `plans/feature-background-alert-reliability.md`; calendar planning in `plans/feature-calendar-planning.md`; six-language expansion in `plans/feature-additional-languages.md`; duration wheels in `plans/feature-duration-wheel-picker.md`; original notifications/multilingual work in their corresponding feature plans. Earlier completed plans for Planning button feedback, white/blue theme, sound settings/schedules and dark mode remain preserved. No roadmap or research artifact is present.

The connected GitHub app is available in the current agent session. No repository-level MCP server configuration is present. Reuse host-provided integrations when available; additional servers should address a concrete project need.
