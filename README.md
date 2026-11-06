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

When developing on Windows, you can run the app on a physical iPhone using Expo Go. The iOS Simulator and local iOS builds require macOS and Xcode.

## Features

- Start, pause, and resume; reset with confirmation.
- Time displayed to hundredths of a second, with hours shown automatically for long sessions.
- Individual lap durations and cumulative times, with the fastest laps highlighted and average lap times displayed.
- Save the latest 50 sessions with up to 1,000 laps each, view details, share results, and delete with confirmation.
- Run an independent countdown with pause/resume and a completion sound; save multiple action schedules and run one sequence automatically alongside both clocks.
- Choose from four bundled sounds with 5, 15, or 30 seconds of playback, preview, and Stop controls.
- Choose white/blue light or navy/blue dark mode and save that preference across launches.
- Restore the active stopwatch, countdown, schedule, laps, and settings after closing and reopening the app.
- Haptic feedback and screen wake lock on mobile, each with its own setting.
- Romanian, English, and Russian interfaces, bundled fonts, and no account or dedicated backend required.

Tap **Pauză → Salvează sesiunea** (Pause → Save session) to keep your result and prepare a new stopwatch session. In **Istoric** (History), tap a session to view its details and share it. On the web, results are copied to the clipboard if the browser does not support native sharing.

## Language, Theme, Timer, and Sound

Open the gear button (**Setări / Settings / Настройки**) and choose **Română**, **English**, or **Русский** under Language. Romanian is the default, including older data and unsupported saved choices; device/browser language is not detected. Your manual selection is saved and works offline. Labels, dates, plural phrases, accessible names, notices, and shared results use that choice. Existing schedule/action names and history remain unchanged; new default action names use the selected language. Switching language preserves clocks and pending/playing audio. The examples below use the default Romanian labels. To extend support, follow [Adding a language](AGENTS.md#adding-a-language).

Light mode uses white backgrounds and blue accents; dark mode uses navy backgrounds and lighter blue accents across the four tabs, controls, and sheets. Open the gear button (**Setări**) and enable **Mod întunecat** for dark mode. Light is the default. Your manual choice is saved and takes priority over the phone/browser appearance.

Older saved data or an invalid theme preference falls back to light while retaining valid stopwatch/history data. Changing the theme preserves active clocks, schedules, and alert playback. The first interactive screen uses the restored theme; the native launch image appears before saved settings can load. Launcher icons, favicon, and splash artwork retain their existing branding.

Open **Timer** to configure **Ore / Minute / Secunde** (hours/minutes/seconds), then press **Pornește**. The default is five minutes; valid durations range from `00:00:01` to `23:59:59`. Pause/resume keeps the remaining time; reset requires confirmation while running or paused. Reset before editing an active duration. After completion, use **Repornește** to start again. Countdown runs do not create stopwatch history entries.

In **Setări**, **Alerte sonore** controls automatic timer and schedule alerts and defaults on. Choose **Clasic**, **Clopoțel**, **Digital**, or **Gong** under **Sunet**, then **5 s**, **15 s**, or **30 s** under **Durata sunetului**. Clasic and 5 seconds are the defaults. The selected pattern loops for that duration after playback starts. **Ascultă sunetul** previews it even when automatic alerts are muted.

Use **Oprește sunetul**, available in the shell and open sheets, to silence playback without resetting an activity. Changing sound/duration or muting automatic alerts cancels current playback. Closing Settings stops its preview. A live alert replaces a preview; newer live deadlines replace older alerts. Exact ties prefer timer completion, then schedule completion, then an action boundary. Interrupted sounds are not queued.

Sounds play only while the app is open and active. Background, locked, or closed expiry is reconciled silently on return; no alarm or notification is scheduled. Completion remains visible inside open sheets. All four original PCM WAV patterns are bundled in `assets/audio/`, including the retained `timer-complete.wav`. Native playback respects silent mode and mixes with other audio. Browser autoplay can be blocked; visible feedback explains unavailable sound while timing still completes. No microphone permission is requested.

## Planning Example

Open **Planificare**, next to Timer, and tap **Orar nou**. Name it “Studiu”, set the first action to “Lucru” for 25 minutes, then use **Adaugă etapă** for “Pauză” lasting 5 minutes. Move actions with the arrow buttons and tap **Salvează orarul**, then **Pornește**. Planning controls fade and shrink slightly while pressed.

Actions advance automatically, with the selected sound at each foreground boundary. The last action and schedule ending produce one final alert. **Pauză / Continuă / Resetează / Repornește** control the run; reset retains the saved schedule. Starting another schedule confirms replacement. Running or paused schedules are protected from editing/deletion; other schedules remain editable. Closing an edited draft asks before discarding it.

Save up to 20 schedules, each with 1–50 ordered actions. Names allow 80 trimmed characters; each action lasts `00:00:01`–`23:59:59`. One schedule can run or pause at a time, independently of stopwatch and timer. Schedule runs do not add stopwatch history entries. These are duration sequences, without calendar or recurring scheduling.

## How Time Is Measured

The stopwatch calculates the difference between timestamps instead of accumulating interval ticks. Time spent in the background or with the phone locked is therefore included when you return. The display refreshes approximately every 32 ms; this does not guarantee measurement accuracy. Manually changing the device clock may affect the current session.

The countdown and schedule use absolute deadlines, with local foreground display refreshes every 200 ms. Schedule deadlines remain anchored to preceding actions; a delayed callback catches up without replaying every missed sound. Positive fractions round up to the next displayed second. Pausing freezes the exact remaining milliseconds. Device clock changes can affect both activities too.

Data is stored locally using AsyncStorage. Version 1 and `@crono/app-v1` are retained: older data defaults to Romanian, empty schedules, Clasic, and 5 seconds while preserving valid clocks, history, theme, and false preferences. A running schedule saves a snapshot of its actions. Uninstalling the app or clearing browser data removes local data. Haptic feedback and screen wake lock apply only to mobile. With **Ecran mereu activ** enabled, one wake guard covers any running stopwatch, timer, or schedule.

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

Expo Go can preview the interface, but native appearance/audio plugin changes require a rebuilt development or preview app for reliable verification. The playback-only configuration disables microphone/recording permissions and background playback.

Official documentation: [Expo Go and setup](https://docs.expo.dev/tutorial/create-your-first-app/), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Android/iOS builds](https://docs.expo.dev/build/introduction/).

## AI Factory

AI Factory **2.21.0** is installed globally and initialized for the Codex app in this project. The 33 skills are in `.agents/skills/`, the installation inventory is in `.ai-factory.json`, and settings are in `.ai-factory/config.yaml`.

Open the `D:\App_Crono` project in Codex. Skills can be invoked in a new message, for example `$aif-plan` to plan a new feature. The `$aif` command analyzes the project and updates its context. Project context is documented in [DESCRIPTION.md](.ai-factory/DESCRIPTION.md), [ARCHITECTURE.md](.ai-factory/ARCHITECTURE.md), and the [base rules](.ai-factory/rules/base.md); `AGENTS.md` maps the repository and preserves its Expo requirements.

```powershell
ai-factory --version
ai-factory update
```

Source: [lee-to/ai-factory](https://github.com/lee-to/ai-factory).

## Verification Status

Multilingual checks on November 6, 2026 passed lint, typecheck, all 59 Node tests and all 95 browser scenarios in one complete run (4.6 minutes). Fresh Android/iOS/web exports also passed. Earlier Planning button checks passed lint, typecheck, all 51 core/coordinator/contrast tests, and 44 targeted browser scenarios: eight new interaction cases and 36 planning/theme/real-timer regressions. Light/dark screenshots were inspected at 320/390px. The previous full run on November 5 passed all 60 then-existing browser scenarios (10.5 minutes) and fresh Android/iOS/web exports; the full suite and exports were not repeated for this style change. Tests retain 45-second limits and no retries.

Four regressions using real browser timers first reproduced `Illegal invocation` during preview playback, failed audio loading, countdown pause, and schedule pause. All four pass after wrapping `clearTimeout` in the three hook adapters. The new tests use Chrome's actual timers and media player; preview tests serve the committed Classic WAV bytes directly to isolate local Metro asset-transfer latency, including an explicit failed-load/retry case. Existing checks still fetch and decode all four effects from the development server. Fake-clock tests retain deterministic duration and race coverage.

An earlier verification run passed 55/56 browser scenarios because repeated compressed Metro bundle loads exhausted the stopwatch journey's time limit; a 90-second diagnostic also timed out. Playwright now requests uncompressed responses from the local development server on port 8091. This affects test traffic only and resolves that verification failure.

Coverage includes both palettes at 320/390/430/1024px, saved/legacy preferences, pending/playing alerts during theme changes, independent activities, modal completion/Stop, mute/blocked/stale playback, silent catch-up, and decoding all four effects. Each palette checks 31 foreground/surface contrast pairs; all 12 sound/duration combinations retain controller boundary coverage. Representative screenshots were visually inspected. The earlier baseline passed all 21 Expo Doctor checks; this theme refresh adds no dependencies.

Exporting JavaScript/Hermes bundles for Android and iOS does not replace physical-phone testing. Audible choices/durations and Stop, silent mode/audio routing, schedule keyboard behavior, press gestures/haptics, native wake lock, cold-launch appearance/status/navigation bars, and locked/background transitions remain pending on devices. Cyrillic/diacritic rendering, large text, translated VoiceOver/TalkBack announcements, selected-language relaunch, and independent native-speaker review also remain pending. No device was connected for this validation. No signed APK/IPA builds or app store releases have been produced.

During installation, `npm audit` reported vulnerabilities in transitive Expo dependencies and development tools, including `decode-uri-component` and `zod`. Available compatible updates were applied; no migrations to other major SDK versions were forced. The audit must be reassessed before a public release.

## Project Structure

```text
src/app/          Screens and Expo Router navigation
src/components/   Dials, schedule editor/run card, shared alerts, laps, sheets, and settings
src/context/      Shared state, theme, haptic feedback, and screen wake lock
src/core/         Pure timing, language/sound registries, semantic notices, and validation
src/i18n/         Typed Romanian/English/Russian catalogs, plurals, dates, and sharing
src/hooks/        Serialized persistence, global timing runners, and shared platform audio
src/audio/        Static bundled sound source map
tests/            Logic and UI tests
assets/           Four original sound patterns, icons, and splash screen
```

## Documentation

| Document | Contents |
|---|---|
| [Repository map](AGENTS.md) | Entry points and authoritative Expo workflow |
| [Project description](.ai-factory/DESCRIPTION.md) | Stack, persistence, and known follow-ups |
| [Architecture](.ai-factory/ARCHITECTURE.md) | Modules, timing, playback, and data flow |
