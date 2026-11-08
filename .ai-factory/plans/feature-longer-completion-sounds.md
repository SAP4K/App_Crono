# Implementation Plan: Longer completion sounds

Branch: `feature/longer-completion-sounds`
Created: 2026-11-08
Parent: `feature/background-alert-reliability` at `f8b6f40797c1f58e43fd30edef9906f98fb77156` (PR #11 dependency).
Status: Implementation complete (7/7 tasks). Physical native acoustic acceptance remains pending as listed below.

## Original Request

Please extend the duration of the sound effects that play when the timer expires or when one of the steps in the plan is completed.

## Settings

- Mode: full (retained user preference).
- Testing: yes.
- Logging: minimal; warnings/errors only, no routine application logs or stored payloads.
- Docs: yes; update existing README and background notification guide.
- Duration assumption: use the previously recommended 15 seconds for system clips and the in-app default. The earlier optional questions were unanswered; this is an implementation assumption, not an explicit user selection.
- Preserve valid saved in-app selections of 5, 15 and 30 seconds.

## Requirements Reconciliation

Authority: current user request and repository AGENTS.md, then project rules/architecture; retain existing timing, mute and persistence contracts.

| Decision / supported combination | Source path and section | Verification evidence |
|---|---|---|
| Timer, intermediate action and final schedule alerts use longer sound; the final action and schedule produce one event | Original Request; `src/core/notifications.ts`; `src/hooks/alertPlayback.ts` | Existing notification/projection, playback and runner tests |
| System clips are 15 seconds for all four choices, independent of the foreground duration setting | Stated duration assumption; `src/audio/notificationSounds.ts` | PCM duration/activity tests and native resource byte comparison |
| Fresh/missing/invalid duration defaults to 15; existing valid 5/15/30 remains unchanged | `src/core/sounds.ts`; `src/core/stopwatch.ts` restoration | Literal legacy fixture and explicit saved-preference tests |
| In-app loops retain Stop, preview, priority, cancellation, and selected duration; schedules advance independently | `src/hooks/alertPlayback.ts`; `src/hooks/planningRunner.ts` | Playback/runner tests and browser sound scenarios |
| Muting still creates silent visual OS notifications; changing only foreground duration does not rearm OS requests | `src/i18n/notificationContent.ts`; notification coordinator tests | Existing muted payload/fingerprint/reconciliation coverage |
| Retain native filenames/channel IDs and original foreground assets | Android channel user-control contract; `src/audio/sources.ts` | Mapping tests, original sample validation, config/native resource inspection |
| Romanian default, all six catalogs, both themes and existing clocks/data preserved | AGENTS.md; `src/i18n/`; literal version-1 fixture | Catalog/core and relevant browser checks |
| Native assets require a rebuilt binary; registered duration does not prove audible delivery under OS restrictions | Expo SDK 57 notification docs; Apple sound contract | Isolated CNG/Android build; physical acoustic acceptance explicitly pending |

Meaning preservation: PASS — extends the existing sound behavior without changing timing or notification ownership.

## Technical Evidence

- Expo `~57.0.32`; matching [SDK 57 notifications documentation](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/#set-custom-notification-sounds) consulted before native configuration changes.
- [Apple notification sound documentation](https://developer.apple.com/documentation/usernotifications/unnotificationsound): custom sound must be shorter than 30 seconds; 15 seconds fits that constraint.
- [Android NotificationChannel](https://developer.android.com/reference/android/app/NotificationChannel): existing channels remain user-controlled; preserve resource names and stable name-based URIs.
- Original foreground patterns are 1.02/3 seconds. The shared owner already loops them for 5/15/30 seconds; native OS requests currently use the short clips once.
- No new dependencies, background worker, alarm service, schema/key migration or channel version is needed.

## Roadmap Linkage

Skipped: no configured roadmap artifact exists. No research artifact influences this plan.

## Command Evidence

Project CWD: `/mnt/d/app_crono` (`D:\App_Crono` for Windows npm/Node).
Initial catalog: `/tmp/crono-longer-sounds-command-catalog.json`, revision `0d9d5df7abcbf49cf66b655c67f2484b2d2d09b08d0d756209bc568589c9892f`.
Source `package.json` SHA256 `3027a28194cd4ba300988830df84946a198b5558cfd54eb437a0756bcf0cc38a`; lock SHA256 `fd6a7c8e60b7af3cdddf2ee0b1c4c941c4fc194beb647e9b0aab2338a2a99557`.
Command IDs: `package.json#/scripts/lint`, `/scripts/typecheck`, `/scripts/test`, `/scripts/test:e2e`, `/scripts/export`. Refresh after adding a generator script. Isolated CNG/Gradle invocations are inspected native build steps, not inferred catalog commands.

Refreshed after task 2: `/tmp/crono-longer-sounds-commands-updated.json`, revision `83b830b9241790cf4094917bc52e37083f75ef225a307fada67f7f784cf94960`; `package.json` SHA256 `a0c262468385fd99c5c4ec1c012c9354e6652c50e5abac9fdbdb4fc34a747f01`. Adds `package.json#/scripts/generate:notification-sounds`. Lockfile unchanged.

## Commit Plan

Suggested checkpoints only; this implementation invocation does not authorize committing/pushing.

- After tasks 1–3: `feat(audio): extend completion sound duration`.
- After tasks 4–7: `test(audio): cover longer alerts and document native playback`.

## Tasks

- [x] Task 1: Define duration and compatibility test contracts.
  Files: `tests/sounds.test.ts`, `tests/stopwatch.test.ts`.
  Require a 15-second fallback while preserving every explicit duration; validate four native WAVs with exact frame/header sizes, meaningful audio throughout and unclipped PCM. Preserve short foreground validation and stable channel names. Run the targeted tests to establish the expected failing contracts before implementation.
  Logging: test failures only; no application logging. Dependencies: none.

- [x] Task 2: Generate and bundle longer system sound resources.
  Files: `scripts/generate-notification-sounds.mjs`, `assets/audio/notifications/{notification_classic,bell,digital,gong}.wav`, `app.json`, `package.json`.
  Repeat the original motifs deterministically to exactly 15 seconds, with a clean final fade. Keep all original files and native resource basenames/channel IDs. Provide a reproducible local generator command, update plugin paths, refresh command discovery and verify regeneration is byte-identical.
  Logging: generator CLI result/errors only; no new runtime logging. Depends on 1.

- [x] Task 3: Update the default and localized Settings explanation.
  Files: `src/core/sounds.ts`, `src/i18n/{ro,en,ru,es,fr,de}.ts`.
  Default only missing/invalid duration to 15, retain the 5/15/30 selector and original playback owner. Explain selected foreground duration versus the 15-second system clip, subject to phone settings. Preserve mute, previews, Stop and timing identities.
  Logging: no new application logging; existing scoped warnings/errors remain. Depends on 2.

- [x] Task 4: Update browser and legacy regression coverage.
  Files: `tests/e2e/{sounds,localization,planningButtons,theme,realTimers}.spec.ts`, `tests/stopwatch.test.ts`, existing audio/notification/runner tests as justified. Real-timer compatibility cases seed explicit 5; the theme/real-media case exercises 15 with an appropriate assertion deadline.
  Update missing-field expectations to 15; prove valid saved 5 is retained, exercise a real duration change and default 15-second playback stopping. Retain literal legacy fixture bytes. Preserve mute/priority/cancellation, schedule advancement and duration-only OS reconciliation coverage.
  Logging: test diagnostics only. Depends on 3.

- [x] Task 5: Run registered checks and relevant browser flows.
  Commands: catalog lint, typecheck and full Node suite; relevant sound, timer, notification, language/legacy and theme/planning button cases through Playwright; native/web bundle export.
  Files: existing tests/source only if a demonstrated regression needs correction.
  Logging: bounded command diagnostics; retain exact failures/results. Depends on 4.
  Evidence: `/tmp/crono-longer-sounds-{lint,types,node,browser,export}.log`. The first npm-launched browser command failed during registration because Windows path casing loaded Playwright twice; direct invocation of the inspected installed CLI resolved the harness issue, with 149/149 passing and no application change. Literal legacy fixture and all original WAV bytes remain unchanged.

- [x] Task 6: Verify rebuilt native resources.
  Use the existing isolated Android build environment, apply SDK 57 CNG configuration there and build the preview-equivalent release APK. Compare the actual packaged WAV bytes with all four generated files; inspect iOS plugin resource configuration without claiming an iOS build. Leave generated native trees and build outputs outside the repository.
  Record artifact identity and clearly distinguish resource/build verification from physical acoustic testing. Do not clear user data, alter OS notification settings or claim an audible 15-second result from export/build evidence.
  Logging: build failures and summarized resource verification only. Depends on 5.
  Evidence: isolated SDK 57 CNG copied all four WAVs byte-identically. iOS config introspection references the new paths, with no microphone/background audio/remote-notification mode. Android release build passed in 8m49s (618 tasks). APK `9522740691370a4f92f0e44480999e956d2d85a05b3a848c33adf7827db68705` contains exactly one matching native resource for each clip. Source/config/assets/generator fingerprint: `dbff4699645c89980844317e86fe0cdf353c60318f06c6353694b30b9dbf19e6` (105 files). Package `ro.appcrono.mobile`, version `1.0.0`; signature matches the prior development certificate. Artifact: `/mnt/d/crono-android/Crono-1.0.0-longer-sounds-95227406.apk`. Not installed or acoustically tested in this implementation run. Logs/metadata: `/tmp/crono-longer-sounds-{prebuild,apk-build,apk-signature}.log`, `/tmp/crono-longer-sounds-apk.json`.

- [x] Task 7: Update existing documentation and factual project maps.
  Use `aif-docs` to update `README.md` and `docs/background-notifications.md`; maintain factual deltas in `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md` and `AGENTS.md` for the new assets/generator. Explain default vs saved selections, selected foreground duration vs one-shot system clip, native rebuild, mute/OS controls, short-step overlap and pending native acceptance.
  Logging: documentation/link-check diagnostics only. Depends on 6.
  Documentation: updated existing docs through `aif-docs`; retained existing document structure and historical verification qualifications. Meaning preservation: PASS. Commands match the refreshed catalog, 31 local links/anchors pass, and build evidence is distinguished from audible delivery. The architecture/description/AGENTS updates are limited to factual behavior and folder/entry-point deltas. No roadmap milestone was modified because the configured roadmap does not exist.

## Native Acceptance Still Required

Physical acoustic confirmation on Android and iOS: timer and intermediate/final schedule completion while on Home and locked; all four clips, existing-channel upgrade, mute/DND/user-overridden channels, overlapping short steps and notification dismissal. Do not mark these passed from PCM, browser, export or APK resource checks.
