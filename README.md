# CRONO

A stopwatch, countdown, and action schedule app for **iOS and Android**, built with React Native, Expo SDK 57, and TypeScript. A web version is also available for previews.

## Quick Start

Open a terminal in `D:\App_Crono`:

```powershell
npm install
npm start
```

Install **Expo Go** on your phone and scan the QR code displayed in the terminal. Your computer and phone must be on the same network. On iPhone, if Expo Go asks you to sign in, use the same Expo account on your phone and in the terminal (`npx expo login`).

```powershell
npm run web       # preview in the browser
npm run android   # open on an Android emulator that is already configured
```

When developing on Windows, you can preview the interface on a physical iPhone using Expo Go. CRONO system notifications and custom native sounds require a rebuilt app; Expo Go is shown as unavailable for this feature. The iOS Simulator and local iOS builds require macOS and Xcode.

## Features

- Start, pause, and resume; reset with confirmation.
- Time displayed to hundredths of a second, with hours shown automatically for long sessions.
- Individual lap durations and cumulative times, with the fastest laps highlighted and average lap times displayed.
- Save the latest 50 sessions with up to 1,000 laps each, view details, share results, and delete with confirmation.
- Run an independent countdown with quick presets, a large active view, localized end time and a bounded **+1 minute** control; run an action sequence alongside both clocks.
- Select timer and action durations with inertial wheels; create schedules from templates, duplicate them and repeat a draft sequence.
- Use grouped Settings, compact cross-tab activity controls and [portable backup/import](docs/backups.md).
- Choose from four bundled sounds with 5, 15, 30, or 60 seconds of playback, preview, and Stop controls; rebuilt Android apps also support the selected duration in the background.
- Schedule native timer/action/final notifications for Home and locked screens, with saved enablement and OS permission controls.
- Choose white/blue light or navy/blue dark mode and save that preference across launches.
- Restore the active stopwatch, countdown, schedule, laps, and settings after closing and reopening the app.
- Haptic feedback and screen wake lock on mobile, each with its own setting.
- Short button animations across screens, sheets and Settings, respecting the system's Reduce motion setting.
- Directional horizontal slides between tabs, slide-up sheets, and subtle incoming motion for Settings and Planning panels.
- Romanian, English, Russian, Spanish, French, and German interfaces, bundled fonts, and no account or dedicated backend required.

Tap **Pauză → Salvează sesiunea** (Pause → Save session) to keep your result and prepare a new stopwatch session. In **Istoric** (History), tap a session to view its details and share it. On the web, results are copied to the clipboard if the browser does not support native sharing.

## Language, Theme, Timer, and Sound

Open the gear button (**Setări** in Romanian). The overview groups Appearance, Language, Sound, Notifications, Device, Data and About, with current summaries. Back returns to the overview; Close exits Settings. Choose a language under **Limbă / Language**. Settings lists the choices by estimated total speakers worldwide, including native and second-language speakers.

| Choice | Saved ID | Locale |
|---|---|---|
| English | `en` | `en-GB` |
| Español | `es` | `es-ES` |
| Français | `fr` | `fr-FR` |
| Русский | `ru` | `ru-RU` |
| Deutsch | `de` | `de-DE` |
| Română | `ro` | `ro-RO` |

Romanian is the default, including older data and unsupported saved choices; device/browser language is not detected. Your manual selection is saved and works offline.

Labels, dates, plural phrases, accessible names, notices, and shared results use that choice. Existing schedule/action names and history remain unchanged; new default action names use the selected language. Switching language preserves clocks and real completion alerts. Leaving the Sound panel cancels its preview. The examples below use the default Romanian labels. To extend support, follow [Adding a language](AGENTS.md#adding-a-language).

Light mode uses white backgrounds and blue accents; dark mode uses navy backgrounds and lighter blue accents across the four tabs, controls, and sheets. Open **Setări → Aspect** (Settings → Appearance) and choose **Sistem / Mod luminos / Mod întunecat** (System / Light mode / Dark mode). System is the default for new installs and follows the phone/browser appearance, including changes while the app is open and on return. A saved Light or Dark choice takes priority until you select System again.

Existing valid Light/Dark preferences are preserved. Missing or invalid saved themes use System; unavailable system detection falls back to the Light palette. Changing the appearance preserves active clocks, schedules, unsaved editor drafts and real completion audio. The first interactive screen uses the restored choice and current appearance; the native launch image appears before saved settings can load. Launcher icons, favicon, and splash artwork retain their existing branding.

Buttons fade and shrink slightly on press, then return smoothly on release or cancellation. An accepted action runs without waiting for the animation. The phone/browser's **Reduce motion** setting removes scaling and timed transitions while retaining immediate pressed feedback; changes apply live and on return to the app. Web switches also animate their thumb and track briefly; native switches retain platform behavior. This visual feedback adds no sounds, vibrations or saved settings, and duration-wheel gestures stay independent. See the [interaction animation plan](.ai-factory/plans/feature-interaction-animations.md) for verification and pending device checks.

Switching between Stopwatch, Timer, Planning and History slides the content horizontally. Selecting a tab to the right brings its screen from the right while the current screen moves left; selecting a tab to the left reverses this. Tabs and existing navigation buttons trigger the transition. The header and bottom navigation stay fixed, including on wider desktop previews. See the [directional screen transition plan](.ai-factory/plans/feature-directional-screen-transitions.md) for checks and pending native acceptance.

Sheets slide up with a fading backdrop and slide down when closed. Settings groups, backup review and Planning's duration, scheduling, repeat and discard views fade in with a small upward movement. Reduce motion makes these changes immediate; returning from the background does not replay an entrance. Accepted actions, clocks and sounds keep their existing behavior. The [original screen and sheet transition plan](.ai-factory/plans/feature-screen-sheet-transitions.md) records the earlier implementation.

Open **Timer** and scroll **Ore / Minute / Secunde** (hours/minutes/seconds) until the desired values reach the highlighted center row, then press **Pornește**. A quick flick continues gliding after release and snaps to a centered value; move slowly for precise selection. Duration selection opens no numeric keyboard. Hours stop at 00–23; minutes and seconds stop at 00–59, without wrapping or carrying into another column. Start waits for every manually moving column to settle; `00:00:00` is invalid. On web, focus a column and use ArrowUp/ArrowDown or Home/End, or click a neighboring value.

The default is five minutes; valid durations remain `00:00:01`–`23:59:59`. Setup uses a compact dial and wheels while idle/completed. Running/paused views show a larger countdown and hide the wheels.

Quick presets accept **1, 5, 10 or 25 minutes** immediately without starting; changed columns visibly scroll to that value. Start remains available during this visual movement, and another preset replaces the target immediately. Touch, wheel or keyboard input takes over the column; Reduce motion aligns it directly. Leaving Timer or backgrounding settles the target without replay on return. This adds no saved animation setting and leaves Planning’s manual duration selection unchanged.

Pause/resume keeps the exact remaining time; reset requires confirmation while running or paused. **+1 min** adds exactly one minute while running or paused, up to the total duration limit. It keeps the same run, shifts a running deadline by one minute and extends the exact frozen budget while paused. Reset/Restart subsequently use the adjusted duration.

The running dial shows a localized **Ends at** time, including a date across midnight. Paused timers have no end-clock estimate. Reset before selecting another duration. After completion, use **Repornește** to start again. Focusing or returning to the same value preserves completion and its sound. Countdown runs do not create stopwatch history entries.

When a running or paused Timer or Planning activity is on another tab, a compact row above navigation shows its remaining time and Pause/Resume. Tap the row to open that activity. Both rows can appear together; completion removes its row.

In **Setări → Sunete** (Settings → Sound), **Alerte sonore** controls automatic timer and schedule alerts and defaults on. Choose **Clasic**, **Clopoțel**, **Digital**, or **Gong** under **Sunet**, then **5 s**, **15 s**, **30 s**, or **60 s** under **Durata sunetului**. Clasic and 60 seconds are the defaults for fresh/missing/invalid preferences. Valid saved shorter durations are retained: select **60 s** manually on an upgraded installation. The pattern loops for the selected duration after playback starts. **Ascultă sunetul** previews it even when automatic alerts are muted. See [notification sound behavior](docs/background-notifications.md#sound) for platform differences.

Use **Oprește sunetul**, available in the shell and open sheets, to silence playback without resetting an activity. Changing sound/duration or muting automatic alerts cancels current playback. Leaving Sound or closing Settings stops its preview. A live alert replaces a preview; newer live deadlines replace older alerts. Exact ties prefer timer completion, then schedule completion, then an action boundary. Interrupted sounds are not queued.

On rebuilt Android apps, one native audio owner handles foreground completion and, with system notifications enabled and required access available, continues playback on Home, in another app or with the screen locked. Its notification offers **Stop** and **Open**; returning does not restart the minute. Preview remains foreground-only. iOS/web looping remains active-app-only; iOS background notifications retain a separate 15-second clip. Overdue timing catches up without replaying old sounds. Completion and Stop remain visible inside open sheets. Native playback respects silent/DND/channel controls and audio-focus interruptions; browser autoplay can be blocked. No microphone permission is requested. Physical Android minute/lock-screen acceptance is still pending.

Preset scrolling passed lint/typecheck, **277 Node tests**, all **455 browser cases** in one full run, and Android/iOS/web bundle exports. See the [animated preset plan](.ai-factory/plans/feature-animated-timer-presets.md) for source identity and cancellation evidence. Physical Android/iOS gesture and accessibility checks remain deferred; bundle exports do not establish them.

## System Notifications

Open **Setări → Notificări** (Settings → Notifications) in a rebuilt Android/iOS app, then use **Notificări de sistem**. CRONO registers future timer and schedule alerts with the OS, so they can arrive on Home or while the phone is locked. Permission, exact-alarm access and channel settings are shown separately from the saved enable switch.

See [Background and Lock-Screen Notifications](docs/background-notifications.md) for Android minute playback, setup, MIUI/battery guidance, platform limits and verification. Native module changes require a rebuild; the web preview retains in-app feedback.

## Planning Example

Open **Planificare**, next to Timer, and tap **Orar nou**. Name it “Studiu”, set the first action to “Lucru”, and tap its **Durată** value to open the wheels. Select 25 minutes and tap **Aplică durata**, then use **Adaugă etapă** for “Pauză” lasting 5 minutes. Move actions with the arrow buttons and tap **Salvează orarul**, then **Pornește**. Planning controls fade and shrink slightly while pressed.

Saved cards emphasize **Pornește** (Start), show a short sequence preview and place Edit, Duplicate and Delete under the labelled ellipsis options button. Open **Șabloane** (Templates) to choose from eight built-ins. Each choice shows its action count, total duration and a short sequence preview, using the selected language.

| Template | Default sequence in minutes | Total |
|---|---|---|
| Focus | Focus 25 → Break 5 | 30 min |
| Workout | Warm up 5 → Exercise 20 → Cool down 5 | 30 min |
| Pomodoro | Four 25-minute focus blocks, three 5-minute breaks, then a 15-minute long break | 130 min |
| Study | Study 45 → Break 10 → Study 45 → Review 10 | 110 min |
| Meditation | Settle in 1 → Meditation 8 → Finish 1 | 10 min |
| Morning routine | Wake up 5 → Stretch 10 → Get ready 10 → Breakfast 15 | 40 min |
| Stretching | Warm up 2 → Stretch 6 → Relax 2 | 10 min |
| Active break | Walk 2 → Move 2 → Rest 1 | 5 min |

Choosing a template opens an independent unsaved draft. Adjust its name, actions and durations, then **Salvează orarul** (Save schedule). Closing an unchanged draft adds nothing; closing an edited draft asks before discarding it. Duplicate also opens an independent unsaved copy, including calendar rules. Templates opened from a chosen date inherit that one-time date; **Toate** creates a draft without a calendar rule. The eight built-ins do not consume saved-schedule slots until Save. Use **Pornește** to start the saved sequence. Changing the interface language leaves previously saved names unchanged.

In the editor, **Repeat sequence** previews **2, 3 or 4 total cycles**. Apply copies the steps into the draft in order, then **Save schedule** persists them. The resulting sequence must fit the existing 50-action limit; Cancel preserves the draft.

Scroll the **Planificare** page to move its controls, any active run and saved schedules together. Scroll back to the top for **Orar nou** and the date filters.

Inside the schedule editor, the name, Scheduling, Repeat sequence, action rows, Add and Save schedule move together in one list. Scroll to the bottom to save a long sequence, and back to the top to edit its name or scheduling rule.

The duration, calendar, repeat and discard panels scroll their own complete content when it exceeds the available height. Duration wheels remain separate inputs: scrolling a column changes its value, while scrolling the panel moves its content. Closing a panel returns focus to its source control and restores the opening scroll position when the layout is unchanged; changes remain local until Save schedule.

**Aplică durata** changes only the action draft; **Salvează orarul** saves the whole schedule. The same flick and slow-drag gestures work here. Apply waits for every moving column to settle and rejects zero duration. **Renunță**, the close button, or Back returns to the editor without applying the temporary selection, including during a glide. The action list retains its position and returns focus to that action. Schedule/action names still use the text keyboard, and completion notices and **Oprește sunetul** remain available inside the duration panel.

Before saving, open **Programare** and choose **Săptămânal** for one or more weekdays or **Dată fixă** for a single calendar date. Use **Manual** for a schedule you want to find in the full list. Tap **Aplică programarea** to apply the rule to the draft, then **Salvează orarul** to save it.

In **Planificare**, tap **Alege o zi**, enter a date or fill it with **Astăzi**, and tap **Afișează orarele**. The date view shows matching weekly and one-time schedules. **Toate** shows the complete list. **Orar nou** starts with the selected date when you open it from a date view. Use **Pornește** to start a sequence.

Actions advance automatically on their deadlines, without waiting for the selected sound to finish. A later boundary replaces the previous sound; the last action and schedule ending produce one final alert. Android background playback follows the same priority rules. **Pauză / Continuă / Resetează / Repornește** control the run; reset retains the saved schedule. Starting another schedule confirms replacement. Running or paused schedules are protected from editing/deletion; other schedules remain editable. Closing an edited draft asks before discarding it.

Save up to 20 schedules, each with 1–50 ordered actions. Names allow 80 trimmed characters; each action lasts `00:00:01`–`23:59:59`. One schedule can run or pause at a time, independently of stopwatch and timer. Schedule runs do not add stopwatch history entries.

## How Time Is Measured

The stopwatch calculates the difference between timestamps instead of accumulating interval ticks. Time spent in the background or with the phone locked is therefore included when you return. The display refreshes approximately every 32 ms; this does not guarantee measurement accuracy. Manually changing the device clock may affect the current session.

The countdown and schedule use absolute deadlines, with local foreground display refreshes every 200 ms. Schedule deadlines remain anchored to preceding actions; a delayed callback catches up without replaying every missed sound. Positive fractions round up to the next displayed second. Pausing freezes the exact remaining milliseconds. Device clock changes can affect both activities too.

Data is stored locally using AsyncStorage. Version 1 and `@crono/app-v1` are retained: missing or invalid optional fields default to Romanian, System theme, empty schedules, Clasic, 60 seconds, and system notifications enabled while preserving valid clocks, history, theme, and false preferences. Valid saved sound durations of 5, 15 and 30 seconds are preserved. A saved schedule can include a weekly rule or one calendar date. Older schedules and valid templates with invalid calendar metadata load in Manual mode. A running schedule saves a snapshot of its actions. Uninstalling the app or clearing browser data removes local data. Haptic feedback and screen wake lock apply only to mobile. With **Ecran mereu activ** enabled, one wake guard covers any running stopwatch, timer, or schedule.

## Checks

Node.js 24 LTS or later is required for tests that run TypeScript directly.

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run export
npx expo-doctor
```

UI tests use a locally installed Google Chrome browser and automatically start the app on port 8091. Screenshots are saved in `previews/`, and temporary test results are stored in `test-results/`.

## Installable Builds

The `eas.json` configuration includes a `preview` profile for Android APKs and a `production` profile for distribution. The initial application identifier is `ro.appcrono.mobile` on both platforms; change it if you have your own identifier.

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npm run build:android
npm run build:ios
```

Cloud builds require an Expo account and signing configuration. iOS distribution requires an Apple Developer account and app registration. Creating the source code and running local checks do not publish the app to stores.

Expo Go can preview the interface, but native appearance/audio/notification plugin, file-transfer modules and local-module changes require a rebuilt development or preview app. Use the existing preview profile for a standalone Android test APK. The development-client profile additionally requires SDK-compatible `expo-dev-client`, which is not currently installed. Expo audio remains playback-only with no recording or iOS background-audio mode; the Android completion module owns a bounded media-playback foreground service.

Official documentation: [Expo Go and setup](https://docs.expo.dev/tutorial/create-your-first-app/), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Android/iOS builds](https://docs.expo.dev/build/introduction/), [SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

## AI Factory

AI Factory **2.21.0** is installed globally and initialized for the Codex app in this project. The 33 skills are in `.agents/skills/`, the installation inventory is in `.ai-factory.json`, and settings are in `.ai-factory/config.yaml`.

Open the `D:\App_Crono` project in Codex. Skills can be invoked in a new message, for example `$aif-plan` to plan a new feature. The `$aif` command analyzes the project and updates its context. Project context is documented in [DESCRIPTION.md](.ai-factory/DESCRIPTION.md), [ARCHITECTURE.md](.ai-factory/ARCHITECTURE.md), and the [base rules](.ai-factory/rules/base.md); `AGENTS.md` maps the repository and preserves its Expo requirements.

```powershell
ai-factory --version
ai-factory update
```

Source: [lee-to/ai-factory](https://github.com/lee-to/ai-factory).

## Verification Status

The original screen and sheet transition implementation passed lint/typecheck, **268 Node tests**, **all 405 browser scenarios in one full run (19.0 minutes)** on an exported web preview, and Android/iOS/web exports. The [earlier transition plan](.ai-factory/plans/feature-screen-sheet-transitions.md) distinguishes development-preview pilots, corrected failures, final source fingerprints and native deferrals. The [directional screen transition plan](.ai-factory/plans/feature-directional-screen-transitions.md) tracks the replacement of route fades with horizontal slides and its separate verification. Frozen-clock functional tests explicitly use Reduce motion; movement tests sample real browser animation frames. Physical native smoothness, keyboard avoidance, Android Back, safe areas and TalkBack/VoiceOver remain deferred.

Directional slides passed lint/typecheck, **277 Node tests**, Android/iOS/web exports and **487 distinct browser cases** across the full run and a corrected 24-case layout rerun. The application stayed unchanged during that correction: layout assertions now measure settled scenes and exclude inactive/covered controls. The directional plan records exact source identities and coverage; this is not a claim of one all-green full run or physical-device acceptance.

Interaction animations on November 10, 2026 passed lint/typecheck, **257 Node tests** and Android/iOS/web exports. All **375 distinct browser cases** have passing evidence across an interrupted full attempt and focused reruns, including the new interaction/lifecycle checks and six-language layouts. The [animation plan](.ai-factory/plans/feature-interaction-animations.md) records source fingerprints, the two test-timing findings and exact selections. Physical native animation/accessibility acceptance remains deferred.

One-minute completion alerts passed lint/typecheck, **189 Node tests**, **15 native unit tests**, and Android/iOS/web exports. All **157 selected browser cases** have passing results across the main run and targeted reruns, including real-media 60-second playback. Android instrumentation compiled but device execution and acoustic checks were deferred at the user's request after MIUI blocked test-package installation. See the [current evidence and platform limits](docs/background-notifications.md#one-minute-completion-alerts) and [active plan](.ai-factory/plans/feature-one-minute-alerts.md).

Longer completion-sound checks passed lint/typecheck, **171 Node tests**, **149 browser scenarios** in one run, and Android/iOS/web exports. A rebuilt Android APK contains all four verified 15-second notification clips; physical acoustic checks remain pending. See the [sound build evidence](docs/background-notifications.md#longer-completion-sounds) and [implementation plan](.ai-factory/plans/feature-longer-completion-sounds.md).

Background-alert hardening on November 8, 2026 passed lint/typecheck and **156 Node tests**. All **118 selected browser scenarios** have passing evidence across the initial 116/118 run and 47-case layout/calendar rerun after fixing the English filter target size. A rebuilt Android APK was installed and OS delivery was verified on Home, after process reclamation, for a two-action schedule and with the keyguard showing. See the [background guide](docs/background-notifications.md#builds-and-verification) for build identity and remaining native checks.

Language expansion checks on November 7, 2026 passed lint/typecheck, all **96 Node tests**, all **162 browser scenarios** in one full run (8.0 minutes), and fresh Android/iOS/web exports. All six languages cover both themes at 390px; Spanish, French, German and Russian also cover 320/430/1024px. The three new languages cover enlarged web text and reduced motion. Final catalog characters were checked against all five bundled Inter weights, and representative screenshots were inspected.

Tests cover saved/default choices, literal legacy data, localized sharing/notifications, drafts, clocks, notice lifetimes and real pending/playing audio. The [implementation plan](.ai-factory/plans/feature-additional-languages.md) records source identity and evidence. Native device/accessibility/notification acceptance and independent native-speaker review remain pending; exports do not verify them.

Duration-wheel checks on November 6, 2026 passed lint/typecheck, **103 Node tests**, and Android/iOS/web exports. The full browser run passed **118/119** cases; the unchanged stopwatch journey hit its 45-second limit, then passed alone in **26.1 seconds** without code or timeout changes. Thus all 119 cases have passing results across the full run and rerun, rather than one clean full run. The 15 picker scenarios cover real mouse/touch scrolling, cancellation, zero/bounds, disabled clocks, no-op completion/audio, legacy persistence, concurrent notices, fifty-action editing, translations and layouts. Representative screenshots were inspected, including enlarged web text; no dependency was added.

Notification implementation checks on November 6, 2026 passed lint/typecheck, all **89 Node tests**, all **104 browser scenarios** in one full run (4.7 minutes), fresh Android/iOS/web exports, the SDK compatibility check, and **21/21 Expo Doctor checks**. Five existing Expo packages were aligned to recommended SDK-57 patches through `npx expo install --fix`. Isolated Android CNG verified the exact-alarm permission and byte-identical copies of all four notification resources; iOS config introspection confirmed no microphone or background audio/remote-notification mode. These checks do not establish native delivery.

Earlier multilingual checks on November 6, 2026 passed lint, typecheck, all 59 Node tests and all 95 browser scenarios in one complete run (4.6 minutes). Fresh Android/iOS/web exports also passed. Earlier Planning button checks passed lint, typecheck, all 51 core/coordinator/contrast tests, and 44 targeted browser scenarios: eight new interaction cases and 36 planning/theme/real-timer regressions. Light/dark screenshots were inspected at 320/390px. The previous full run on November 5 passed all 60 then-existing browser scenarios (10.5 minutes) and fresh Android/iOS/web exports; the full suite and exports were not repeated for this style change. Tests retain 45-second limits and no retries.

Four regressions using real browser timers first reproduced `Illegal invocation` during preview playback, failed audio loading, countdown pause, and schedule pause. All four pass after wrapping `clearTimeout` in the three hook adapters. The new tests use Chrome's actual timers and media player; preview tests serve the committed Classic WAV bytes directly to isolate local Metro asset-transfer latency, including an explicit failed-load/retry case. Existing checks still fetch and decode all four effects from the development server. Fake-clock tests retain deterministic duration and race coverage.

An earlier verification run passed 55/56 browser scenarios because repeated compressed Metro bundle loads exhausted the stopwatch journey's time limit; a 90-second diagnostic also timed out. Playwright now requests uncompressed responses from the local development server on port 8091. This affects test traffic only and resolves that verification failure.

Coverage includes both palettes at 320/390/430/1024px, saved/legacy preferences, pending/playing alerts during theme changes, independent activities, modal completion/Stop, mute/blocked/stale playback, silent catch-up, and decoding all four effects. Each palette checks 31 foreground/surface contrast pairs; all 12 sound/duration combinations retain controller boundary coverage. Representative screenshots were visually inspected. The earlier baseline passed all 21 Expo Doctor checks; that historical theme refresh added no dependencies.

Exporting JavaScript/Hermes bundles does not replace physical-phone testing. The limited Android delivery checks now completed are recorded in the [background guide](docs/background-notifications.md#builds-and-verification). Other native acceptance remains pending: audible choices/durations and Stop, silent mode/audio routing, schedule keyboard behavior, press gestures/haptics, wake lock, cold-launch appearance/status/navigation bars, Cyrillic/diacritic rendering, large text, translated VoiceOver/TalkBack announcements, selected-language relaunch and independent native-speaker review. Notification checks still needed include Android 33+ denial/retry, exact-access changes, all sound/mute/channel combinations, foreground suppression, cancellation/replacement, native cold/warm/stale taps with retained drafts, Doze, recents, reboot and iOS Focus/silent/lock-screen behavior. The earlier runs had no connected device; current Android build/OS-delivery evidence does not establish iOS or store-release readiness.

Wheel-specific native acceptance also remains pending: slow drags/flings, snapping/endpoints, parent scrolling, immediate Start/Apply, interruption/return, list focus restoration, VoiceOver/TalkBack adjustment, native font scaling and reduced motion. Browser touch emulation and enlarged web text do not establish these results. The Android permission-request and iOS date-precision findings now have code/regression fixes; the remaining platform checks are recorded in the [background guide](docs/background-notifications.md#builds-and-verification).

During installation, `npm audit` reported vulnerabilities in transitive Expo dependencies and development tools, including `decode-uri-component` and `zod`. Available compatible updates were applied; no migrations to other major SDK versions were forced. The audit must be reassessed before a public release.

## Project Structure

```text
src/app/          Screens and Expo Router navigation
src/components/   Dials, duration wheels, schedule editor/run card, shared alerts, sheets, settings
src/context/      Shared state, theme, interaction motion, haptic feedback, and screen wake lock
src/core/         Pure timing, notification projection, language/sound registries, notices, validation
src/i18n/         Six typed catalogs (ro/en/ru/es/fr/de), plurals, dates, and sharing
src/hooks/        Persistence, timing/audio owners, notification scheduling, and platform adapters
src/audio/        Bundled playback map and native notification sound names
modules/          Android access probe and bounded completion alarm/audio module
tests/            Logic and UI tests
assets/           Original sound patterns, legacy Classic copy, icons, and splash screen
assets/audio/notifications/ Four 15-second system notification clips
scripts/          Reproducible notification sound generator
```

## Documentation

| Document | Contents |
|---|---|
| [Background notifications](docs/background-notifications.md) | Phone setup, behavior, limits and verification |
| [Backups and import](docs/backups.md) | Portable saved data, confirmation, limits and recovery |
| [Repository map](AGENTS.md) | Entry points and authoritative Expo workflow |
| [Project description](.ai-factory/DESCRIPTION.md) | Stack, persistence, and known follow-ups |
| [Architecture](.ai-factory/ARCHITECTURE.md) | Modules, timing, playback, and data flow |
