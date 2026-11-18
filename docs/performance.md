[← Backups and Import](backups.md) · [Back to README](../README.md)

# Performance

CRONO keeps display work local and bounds repeated storage, notification and list work. The changes preserve the Studio design, selected wheel inertia, saved-data format and timestamp-based timing. They reduce verified redundant work. A limited release-build comparison on Redmi covers ordinary navigation and Settings; broader interaction and large-data measurements remain pending. Neither browser checks nor that limited phone sample establish that all physical freezes are resolved.

## What changed

| Area | Behavior |
|---|---|
| Shared state | Routes read immutable branches from the existing accepted store. Stable action/status contexts avoid subscribing every control to unrelated playback and notification changes. |
| Clock displays | Unfocused routes and covered presentation scopes stop their display intervals. Visible displays refresh at their previous cadence and reread current time on reveal. Global timer, schedule and audio owners remain active independently. |
| Persistence | A non-renewing 32 ms foreground task defers JSON encoding. There is at most one active write and one latest pending snapshot. Accepted state transitions and their subscribers remain synchronous. |
| Notifications | Relevant immutable inputs build one indexed projection. Fresh hydration, deadlines, consumption and lifecycle guards still apply after asynchronous calls. Unrelated updates skip native policy encoding. |
| Android policy | Policy changes and pruning pending registrations commit together atomically, retaining the old state if storage fails. Individual event registration still performs its own native I/O. |
| Lap lists | Stopwatch and long History details virtualize lap rows with one scroll owner, preserving statistics, ordering and variable-height text. History details with up to 50 laps keep their compact presentation. |
| Planning editor | Validation and dirty summaries follow actual draft changes. Temporary duration choices reuse unchanged draft calculations, rows and native wheel columns. |

There is no new dependency, telemetry, stored motion setting, or routine frame/payload logging. Timer and Planning wheels retain their existing slow glide, exact selection, cancellation and Start/Apply guards.

## Acceptance and durable storage

`update(action)` returns the accepted in-memory state immediately. This result does **not** confirm that AsyncStorage has finished writing. Only snapshots waiting to be written are coalesced; effective domain transitions and completion subscribers are never skipped. Each remaining JSON encoding still runs synchronously when the scheduled task executes; large records may therefore need further profiling.

Leaving the active app, browser `pagehide` and owner disposal flush already accepted work. An unchanged loaded snapshot needs no duplicate write. Failures retain the existing storage warning; failed initial hydration blocks persistence rather than replacing unread data. Abrupt process termination can still interrupt pending work. The app has no storage-read recovery flow yet.

The version-1 JSON object and `@crono/app-v1` key are unchanged. Maximum supported history can still exceed Android AsyncStorage's per-entry read limit; this change does not split storage or reduce the session/lap limits. Keep performance fixtures separate from personal data and avoid writing the maximum-size stress fixture to a phone.

## Reproducible automated checks

Use Node.js 24 LTS or later, the committed npm lockfile and locally installed Google Chrome. From the repository root:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e -- tests/e2e/performance.spec.ts
npm run test:e2e
npm run export -- --output-dir .expo/performance-export
```

The default browser configuration uses port 8091. When another preview is running there, use a separate exported preview and Playwright configuration with its own port; preserve the user's existing server. Use a fresh export directory after application changes. Discovery (`--list`) and actual execution results must be recorded separately.

The registered performance scenarios check hidden display work, bounded 1,000-lap rendering with real scrolling, and temporary editing of a 50-action schedule. Node tests cover deferred/ordered storage, hydration failure, notification races and unchanged-policy work. Native ledger tests run through `:crono-completion-alerts:testDebugUnitTest` in the existing isolated generated Android project. Do not create a root native project just to run that task.

Measured deterministic work bounds for the same scenarios:

| Probe | Before | After |
|---|---:|---:|
| Notification fingerprints for 51 events, initial reconciliation | 5,253 | 51 |
| Notification fingerprints, unchanged reconciliation | 5,253 | 0 |
| Hidden stopwatch DOM updates over 800 ms | 25 | 0 |
| Whole-draft encodings for four temporary duration choices | 8 | 0 |
| Native policy change pruning 51 pending events | 52 writes | 1 atomic write |

These are operation counts from Node, browser or JVM probes, not phone response-time measurements. The [implementation plan](../.ai-factory/plans/feature-app-performance.md) records executed checks, source identities, corrected test assumptions and remaining acceptance.

## Limited Redmi observations

The final release APK was installed over the existing app on Redmi Note 9 / Android 12, retaining its UID, first-install timestamp and saved language. No uninstall, data clear, synthetic record, manual clock start/pause, preference or device-policy change was used in this comparison.

Each build ran five warm-up cycles and ten measured cycles of Timer → Planning → History → Stopwatch → Settings → Close, with 650 ms after each tap. Terminal tab/sheet states were checked separately. Android's [gfxinfo frame counters](https://developer.android.com/tools/dumpsys) reported:

| OS frame metric | Baseline | Optimized build |
|---|---:|---:|
| Frames rendered | 1,141 | 1,136 |
| Median frame bucket | 12 ms | 16 ms |
| p95 frame bucket | 53 ms | 65 ms |
| Janky frames | 148 (12.97%) | 151 (13.29%) |

This pair does **not** demonstrate faster ordinary navigation. Battery temperature was 32.6–32.9°C before and 33.4–33.6°C afterward; the ordering and background system load were not controlled across repeated pairs. These are rendering metrics, not input-to-visible latency or a result for wheel settlement, active concurrent clocks or large drafts.

The slowest captured interaction was Settings opening. A separate short trace found long native mounting and window-relayout spans on the Android UI thread. Both native windows already had hardware acceleration enabled. A separate four-second scheduler sample recorded work on JavaScript, UI and render threads; function-level JavaScript attribution and heavy-data acceptance remain open; the app has no permanent tracing or extra logging enabled.

## Comparing phone builds

Use release-mode APKs built from recorded source inputs, with the same package/signing identity and comparable data. Record the phone model, Android version, APK checksum and build mode; a Metro development session is not comparable to a release build. Preserve saved data during installation and use detached synthetic drafts for editing checks.

For each baseline/final build:

1. Warm each journey five times, then collect at least ten comparable runs. Test tab switches, Settings/sheet opening, Start/Pause, multi-column wheel settlement and a 50-action editor. Include typical data and a safe large-lap fixture separately.
2. Record input-to-visible response p50, p95 and maximum, plus dropped/long frame counts. Capture short traces around reproducible stalls; do not record personal schedule text or session payloads.
3. Keep device refresh rate, thermal state and power policy comparable. Separate first launch, warm interactions and background return. Check Reduce motion and concurrent activities independently.
4. Confirm foreground/Home/lock timing and notification policy where affected. Smoothness evidence does not establish the separately deferred minute-long acoustic, accessibility or iOS checks.

The plan's warm-interaction p95 target of 100 ms is an engineering comparison target, not a latency promise or a hardware-independent CI threshold. The limited frame sample above does not measure that response-time target; broader native response and large-data checks remain pending.

Individual Android registration I/O and maximum-entry storage remain follow-up candidates. Further changes should follow a measured dominant cost rather than introducing another timing store or changing wheel physics.

## See Also

- [README and setup](../README.md)
- [Background and lock-screen notifications](background-notifications.md)
- [Backups and import](backups.md)
