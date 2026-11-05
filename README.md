# CRONO

A stopwatch and countdown app for **iOS and Android**, built with React Native, Expo SDK 57, and TypeScript. A web version is also available for previews.

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
- Save sessions, view details, share results, and delete sessions with confirmation.
- Keep the latest 50 sessions, with up to 1,000 laps per session.
- Run an independent countdown alongside the stopwatch, with pause/resume and a completion sound.
- Choose a light or dark theme and save that preference across launches.
- Restore the active stopwatch, countdown, laps, and settings after closing and reopening the app.
- Haptic feedback and screen wake lock on mobile, each with its own setting.
- Romanian interface, bundled fonts, and no account or dedicated backend required.

Tap **Pauză → Salvează sesiunea** (Pause → Save session) to keep your result and prepare a new stopwatch session. In **Istoric** (History), tap a session to view its details and share it. On the web, results are copied to the clipboard if the browser does not support native sharing.

## Theme and Timer

Open the gear button (**Setări**) and enable **Mod întunecat** for dark mode. Light is the default. Your manual choice is saved and takes priority over the phone/browser appearance. Older saved data or an invalid theme preference falls back to light while retaining valid stopwatch/history data. The first interactive screen uses the restored theme; the native launch image appears before saved settings can load.

Open **Timer** to configure **Ore / Minute / Secunde** (hours/minutes/seconds), then press **Pornește**. The default is five minutes; valid durations range from `00:00:01` to `23:59:59`. Pause/resume keeps the remaining time; reset requires confirmation while running or paused. Reset before editing an active duration. After completion, use **Repornește** to start again. Countdown runs do not create stopwatch history entries.

**Sunet temporizator** in settings defaults on and is saved independently. Completion plays a short effect only while the app is open and active. If the timer expires in the background, while locked, or while closed, it shows the expired state silently on return. No background alarm or notification is scheduled. Completion remains visible even inside an open settings/details/confirmation dialog.

The effect is an original generated three-tone PCM WAV bundled at `assets/audio/timer-complete.wav`; it needs no external media service. Native playback respects silent mode and mixes with other audio. Browsers can block automatic playback; a visible Romanian notice explains an unavailable sound, and the timer still completes. No microphone permission is requested.

## How Time Is Measured

The stopwatch calculates the difference between timestamps instead of accumulating interval ticks. Time spent in the background or with the phone locked is therefore included when you return. The display refreshes approximately every 32 ms; this does not guarantee measurement accuracy. Manually changing the device clock may affect the current session.

The countdown uses an absolute deadline, with a local display refresh every 200 ms. Positive fractions round up to the next displayed second. Pausing freezes the exact remaining milliseconds. Device clock changes can affect the countdown too.

Data is stored locally using AsyncStorage. Uninstalling the app or clearing browser data removes the history. Haptic feedback and screen wake lock settings apply only to mobile devices. With **Ecran mereu activ** enabled, the screen stays awake in the foreground while either clock runs.

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

The feature validation passed 31 core/coordinator/contrast tests and 20 browser scenarios, plus lint, typecheck, all-platform export, and all 21 Expo Doctor checks. Browser scenarios cover saved themes, legacy data, both clocks, scheduled completion in dialogs, muted/blocked playback, background return, and decoding the shipped effect. The final browser run used the exported web build on port 8091 because development-server bundle responses were slow on the validation host.

Exporting JavaScript/Hermes bundles for Android and iOS does not replace physical-phone testing. Audible output, silent mode/audio routing, native wake lock, cold-launch appearance/status/navigation bars, and locked/background transitions remain unverified on devices. No signed APK/IPA builds or app store releases have been produced.

During installation, `npm audit` reported vulnerabilities in transitive Expo dependencies and development tools, including `decode-uri-component` and `zod`. Available compatible updates were applied; no migrations to other major SDK versions were forced. The audit must be reassessed before a public release.

## Project Structure

```text
src/app/          Screens and Expo Router navigation
src/components/   Stopwatch/timer dials, completion feedback, laps, sheets, and settings
src/context/      Shared state, theme, haptic feedback, and screen wake lock
src/core/         Pure stopwatch/countdown logic and data validation
src/hooks/        Serialized persistence, completion coordination, and platform audio
tests/            Logic and UI tests
assets/           Original completion sound, icons, and splash screen
```
