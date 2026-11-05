# Architecture: Layered Architecture for CRONO

## Overview

CRONO is a single Expo application organized by technical responsibility. Screens and reusable UI consume shared state through React Context. A persistence hook owns hydration and ordered writes. Pure TypeScript functions define independent stopwatch/countdown/schedule operations, sound preferences, and stored-data validation.

This document adapts Layered Architecture to the existing mobile codebase. The pure core is shared by presentation and state management; accessing that core for calculations or formatting is part of the current design. Persistence remains behind the shared state API.

## Decision Rationale

- **Project type:** A local timekeeping application with stopwatch, timer, planning, and history screens.
- **Stack:** Expo SDK 57, React Native, React, TypeScript, Expo Router, and AsyncStorage.
- **Existing structure:** Technical folders already separate UI, shared state, persistence, and core logic.
- **Key factor:** Keep deterministic timing logic testable while retaining straightforward mobile development.
- **Scope:** Document and extend the current design. Team size and future scaling requirements have not been specified.

## Folder Structure

```text
src/
├── app/
│   ├── _layout.tsx           # Composition root, providers, shell, and tabs
│   ├── index.tsx             # Stopwatch route
│   ├── timer.tsx             # Countdown editor and controls
│   ├── planning.tsx          # Saved schedules, editor, and run replacement
│   └── history.tsx           # History, session details, and sharing
├── components/
│   ├── StopwatchFace.tsx     # Dial and local display refresh
│   ├── TimerFace.tsx         # Local foreground countdown refresh
│   ├── TimerCompletionNotice.tsx # Persistent completion in shell/sheets
│   ├── PlanningRunCard.tsx   # Schedule controls and local display refresh
│   ├── ScheduleEditorSheet.tsx # Explicit save/discard and virtualized actions
│   ├── ScheduleStepRow.tsx   # Controlled action name/duration/reorder fields
│   ├── PlanningNotice.tsx    # Current boundary/final event feedback
│   ├── TimingNotices.tsx    # Shared timer/planning notices and playback Stop
│   ├── LapList.tsx           # Lap rows and statistics
│   ├── Sheet.tsx             # Modal and confirmation primitives
│   ├── SettingsSheet.tsx     # User preferences
│   └── Icon.tsx              # Shared SVG icons
├── context/
│   ├── CronoContext.tsx      # Shared state, global runners/audio, mobile feedback
│   └── ThemeContext.tsx      # Saved palette and platform appearance
├── hooks/
│   ├── useStopwatch.ts       # Local storage and state updates
│   ├── timerCompletion.ts    # Framework-free injected completion coordinator
│   ├── useTimerCompletion.ts # Global readiness/lifecycle adapter
│   ├── planningRunner.ts     # Injected schedule coordinator and controls
│   ├── usePlanningRunner.ts  # Readiness/lifecycle bridge and boundary feedback
│   ├── alertPlayback.ts      # Injected arbitration, duration, cancellation
│   ├── useAlertPlayback.ts   # One shared playback lifecycle and preview
│   ├── useAlertSound.ts      # Explicit native player creation/release
│   ├── useAlertSound.web.ts  # Source-bound browser media promise/errors
│   ├── appActivity.ts        # Shared foreground lifecycle adapter
│   └── createTimingId.ts     # Runtime IDs outside pure transitions
├── audio/
│   └── sources.ts            # Static sound asset requires, outside the core
├── core/
│   ├── stopwatch.ts          # App data, stopwatch, history, validation
│   ├── timer.ts              # Pure countdown model and validation
│   ├── planning.ts           # Schedule CRUD, snapshots, cumulative transitions
│   └── sounds.ts             # Pure sound/duration catalog and validation
└── theme.ts                 # Shared visual tokens
tests/
├── stopwatch.test.ts         # Core logic tests
├── timer.test.ts             # Countdown boundaries/transitions
├── timerCompletion.test.ts   # Coordination, cancellation, and audio races
├── theme.test.ts             # Text/surface contrast
├── sounds.test.ts            # Preferences and actual PCM pattern validation
├── planning.test.ts          # Template/run validation and pure transitions
├── alertPlayback.test.ts     # All choices, timing, priority, and cancellation
├── planningRunner.test.ts    # Global execution and lifecycle coordination
├── fixtures/                 # Literal pre-planning version-1 saved data
└── e2e/                     # Stopwatch, theme, timer, sounds, and planning
assets/audio/                # Retained Classic WAV plus bell/digital/gong
```

## Dependency Rules

| Module | Allowed dependencies and responsibilities |
|---|---|
| `src/app/` | Compose UI, use context actions, call pure core helpers, and define Expo Router navigation |
| `src/components/` | Render UI using props, theme, pure core helpers, and shared context when needed |
| `src/context/` | Compose persistence, global timing runners, shared audio, notices, mobile feedback, and a derived theme provider |
| `src/hooks/` | Manage state, lifecycle, persistence, timing coordinators, playback arbitration, and platform audio adapters |
| `src/core/` | Use JavaScript/TypeScript primitives and other pure core functions |
| `src/audio/` | Map pure sound IDs to static bundled assets; consumed by platform transports |
| `src/theme.ts` | Export visual constants without depending on application modules |

- Keep platform/storage dependencies outside the pure core.
- Keep reads and writes to local storage in the persistence layer; UI actions use the shared `update` API.
- Keep dependencies directed toward shared lower-level functionality. Core modules do not import hooks, context, components, or routes.
- Keep reusable modules outside `src/app/`; components and hooks do not import screen implementations.
- Use the existing relative import style. Additional abstraction layers should solve a concrete problem before being introduced.

## Data Flow and Communication

```mermaid
flowchart TD
    Routes["Routes: src/app"] --> UI["Reusable UI"]
    Routes --> Context["CronoContext"]
    Routes --> Core["Pure timing/schedule cores"]
    UI --> Core
    UI --> Context
    Context --> Hook["useStopwatch"]
    Context --> Device["Haptics and screen wake lock"]
    Context --> Completion["Timer and planning coordinators"]
    Completion --> Core
    Completion --> Hook
    Completion --> Playback["One alert playback controller"]
    Context --> Playback
    Playback --> Audio["Source-bound native/web transports"]
    Audio --> Assets["Static bundled sound map"]
    UI --> Theme["Derived ThemeContext"]
    Theme --> Context
    Hook --> Core
    Hook --> Storage["AsyncStorage"]
```

### Startup

`_layout.tsx` composes fonts, safe areas, `CronoProvider`, then `ThemeProvider`. Crono owns one `useStopwatch` instance, timer/planning coordinators, and one shared audio controller. Storage hydration passes JSON through `restoreData`. Interactive tabs wait for both fonts and storage; native splash release also follows those gates. The native launch image precedes saved-data hydration and does not promise the saved theme.

The current error path also becomes ready after a failed read. Its potential to overwrite existing data is an open defect recorded in [DESCRIPTION.md](DESCRIPTION.md), not a guarantee of safe recovery.

### User Actions and Persistence

Screens call `update(previous => next)` through `useCrono`. Core functions compute stopwatch transitions; the hook retains the latest state in a ref, updates React state, and queues its serialized snapshot. The write queue preserves action order. Lifecycle events request another snapshot when the app leaves the active state.

Countdown actions use `useCrono().timerControls`; planning execution uses `useCrono().planning.controls`. Both coordinators apply pure transitions through that same `update` API. Its `{ changed, data }` result allows side effects only after an accepted update; `getSnapshot()` supplies fresh state for asynchronous guards. Template CRUD also uses shared functional updates. No additional storage owner is created.

Version 1 and the storage key remain unchanged. Optional independently restored fields include timer, theme, sound ID/duration, and `{ schedules, run }` planning data. The legacy `timerSound` flag controls automatic alerts for both timer and planning. Missing new fields default independently while preserving valid clocks/history and false preferences. Schedule restoration filters invalid templates separately from rejecting an incoherent run snapshot.

A schedule run snapshots its source ID/name/ordered actions. A running or paused source template is protected, while other templates remain editable. Starting another schedule requires confirmed atomic replacement; reset clears only the run. Boundaries use run/index identities and cumulative deadlines. Limits are 20 templates, 50 actions each, 80-character trimmed names, and one second to 23:59:59 per action. These bounds do not resolve the existing oversized-history storage finding.

The current storage unit is the complete `AppData` object at `@crono/app-v1`. Changes to that layout need an explicit compatibility and migration plan; splitting storage is follow-up implementation work.

### Display and Device Behavior

`StopwatchFace` owns a local timestamp and refreshes the display approximately every 32 ms while running. It derives the elapsed value from the core and listens for app-state changes. Its display refresh does not update the shared persisted object.

`TimerFace` refreshes locally every 200 ms in the foreground. The pure core derives remaining time from the absolute deadline and uses ceiling-based seconds. The provider-level coordinator owns deadline/lifecycle scheduling across route changes. Schedule generations reject obsolete callbacks, including a pause/resume with the same run ID but a new deadline; audio guards recheck run ID, current state, mute, activity, and cancellation after preparation/seek. Accepted foreground completions announce once and may sound. Overdue hydration/background return completes silently; completed hydration does not replay. The bounded in-memory deduplication set is not a second persisted store.

`PlanningRunCard` also refreshes locally every 200 ms in the foreground. The global planning runner advances against each preceding deadline, so callback delays do not extend the sequence. It reconciles multiple crossed actions in one accepted update and publishes only the latest boundary. Hydration and foreground catch-up are silent. The last action emits one final event; paused runs retain exact milliseconds. Generation and fresh-state guards reject stale callbacks without resetting the independent clocks.

`alertPlayback` owns one pending/playing request across timer, planning, and preview. Requests carry owner/event identity, deadline, kind, sound ID/duration, and a current-state guard. Live alerts replace previews; later live deadlines win. Exact ties prefer timer completion, then schedule completion, then action boundary. Sounds are never queued. All four patterns loop; the 5/15/30-second limit starts after playback starts, with a separate four-second startup timeout. Stop and owner cancellation invalidate pending callbacks; settings changes and backgrounding cancel playback. Closing Settings cancels only preview, and explicit preview can work while automatic alerts are muted.

Native audio uses SDK 57 `createAudioPlayer` for each accepted source and explicitly unsubscribes, pauses, and removes it on cancellation/error/unmount. Web uses `expo-asset`, a source-bound `Audio` element, looping, an observed play promise, and error listeners with cleanup. Both transports recheck validity after asynchronous preparation. Playback-only config disables microphone/recording/background behavior and respects native silent mode/mixing. Browser calls/decoding and exports do not prove audible native behavior.

`TimingNotices` composes timer completion, planning boundary/final feedback, and Stop in both shell and active sheets without closing them. Audio failures are scoped to the matching event/run, separate from generic session-save notices. A new event clears obsolete audio feedback. The schedule editor uses controlled drafts, explicit save/discard, and one keyboard-aware FlatList through Sheet's non-scrolling mode.

`ThemeContext` projects saved preferences into stable semantic palettes and cached styles, supplies the navigation theme, and synchronizes native Appearance/SystemUI and status-bar contrast. It has no independent persistence and does not key/remount routes or clock owners.

`CronoContext` owns transient notices and platform-guarded haptics and a single screen wake guard for the OR of running stopwatch, timer, and schedule states. Sharing remains in the history route, with separate mobile and browser paths. Keep mobile-only behavior and browser fallbacks explicit.

## Key Principles

1. **Pure calculations:** Keep timing, lap invariants, formatting, and stored-data validation independently testable.
2. **One shared state owner:** Use the existing provider and functional updates for clocks, planning, history, and preference changes.
3. **Local rendering state:** Keep ticking timestamps and modal visibility close to their consumers.
4. **Ordered persistence:** Preserve serialization order and treat storage failures as user-visible state.
5. **Mobile compatibility:** Respect safe areas, accessible controls, lifecycle cleanup, and runtime availability of native modules.
6. **Bounded data:** Respect the session/lap limits and account for serialized size when changing persistence.

## Code Organization Note

Extend the existing folders where practical. Refactor a boundary when the requested behavior needs it; unrelated modules can retain their current organization. Shared pure helpers may be imported directly by screens and components, while side effects remain in hooks, context, or explicit platform handlers.

## Code Examples

### Deterministic Core Behavior

The existing test structure can exercise timing without React or storage:

```ts
// In tests/stopwatch.test.ts
import assert from 'node:assert/strict';
import { elapsed, emptyStopwatch, pause, start } from '../src/core/stopwatch.ts';

const running = start(emptyStopwatch(), 1_000);
const stopped = pause(running, 2_500);

assert.equal(elapsed(stopped, 90_000), 1_500);
```

### UI Delegation Through the Shared State API

The stopwatch screen delegates transitions inside its event handler:

```ts
// In src/app/index.tsx, with update from useCrono and core functions imported
update((previous) => ({
  ...previous,
  stopwatch: previous.stopwatch.startedAt !== null
    ? pause(previous.stopwatch)
    : start(previous.stopwatch),
}));
```

The screen selects the action; core functions calculate the new stopwatch; the hook owns the resulting write.

## Anti-Patterns

- Incrementing accumulated duration on interval callbacks instead of deriving elapsed time from timestamps.
- Writing to AsyncStorage from a screen, row component, or display timer.
- Moving mutable React state or device APIs into `src/core/`.
- Updating shared persisted state on every display refresh.
- Treating a failed initial storage read as evidence that no history exists.
- Assuming a large single JSON entry is safe because the number of sessions is bounded.
- Moving reusable components or utilities into the route directory.
- Treating web tests or bundle exports as physical-device or signed-build validation.

## Related Context

- [DESCRIPTION.md](DESCRIPTION.md): features, stack, storage contract, and known follow-ups.
- [rules/base.md](rules/base.md): project conventions and validation commands.
- [../AGENTS.md](../AGENTS.md): Expo requirements and repository map.
