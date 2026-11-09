import type { TimerNotice } from '../core/notices.ts';
import type { AppData } from '../core/stopwatch.ts';
import { completeTimer, configureTimer, extendTimer, pauseTimer, remainingTime, resetTimer, resumeTimer, startTimer } from '../core/timer.ts';
import type { TimerState } from '../core/timer.ts';

export type TimerSoundEvent = { runId: string; dueAt: number };
export type TimerAudio = { play: (allowed: () => boolean, event?: TimerSoundEvent) => Promise<void>; stop: () => void; suspend?: () => void };
type Adapters = TimerAudio & {
  getSnapshot: () => AppData;
  update: (action: (previous: AppData) => AppData) => { changed: boolean; data: AppData };
  isActive: () => boolean;
  now: () => number;
  createId: () => string;
  notify: (message: TimerNotice) => void;
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel: (handle: ReturnType<typeof setTimeout>) => void;
};

export function createTimerCoordinator(a: Adapters) {
  let disposed = false;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let scheduledKey = '';
  let scheduleGeneration = 0;
  let audioGeneration = 0;
  let soundingRun: string | null = null;
  const handled = new Set<string>();

  function clearSchedule() {
    scheduleGeneration++;
    if (pending !== null) a.cancel(pending);
    pending = null;
    scheduledKey = '';
  }

  function stopSound(lifecycle = false) {
    if (lifecycle && a.suspend) { soundingRun = null; a.suspend(); return; }
    audioGeneration++;
    soundingRun = null;
    a.stop();
  }

  function announce(timer: TimerState, soundAllowed: boolean, dueAt: number) {
    if (!timer.runId || handled.has(timer.runId)) return;
    handled.add(timer.runId);
    // Only the most recent run can complete; keep deduplication bounded.
    if (handled.size > 2) handled.delete(handled.values().next().value!);
    a.notify('timer-complete');
    if (!soundAllowed || !a.isActive() || !a.getSnapshot().preferences.timerSound) return;
    soundingRun = timer.runId;
    const ticket = ++audioGeneration;
    const allowed = () => {
      const current = a.getSnapshot();
      return !disposed && ticket === audioGeneration && a.isActive() && current.preferences.timerSound
        && current.timer.status === 'completed' && current.timer.runId === timer.runId;
    };
    void a.play(allowed, { runId: timer.runId, dueAt }).catch((error) => {
      if (!allowed()) return;
      console.warn('[timer] Completion sound unavailable.', error);
      a.notify('timer-sound-unavailable');
    });
  }

  function apply(transition: (timer: TimerState) => TimerState, soundAllowed: boolean) {
    const dueAt = a.getSnapshot().timer.deadlineAt ?? a.now();
    const result = a.update((previous) => {
      const next = transition(previous.timer);
      return next === previous.timer ? previous : { ...previous, timer: next };
    });
    if (result.changed && result.data.timer.status === 'completed') announce(result.data.timer, soundAllowed, dueAt);
    return result;
  }

  function reconcile(reason: 'hydrate' | 'foreground' | 'update' | 'deadline' = 'update') {
    if (disposed) return;
    const current = a.getSnapshot();
    if (soundingRun && (!current.preferences.timerSound || current.timer.runId !== soundingRun || current.timer.status !== 'completed')) stopSound();
    if (!a.isActive()) { clearSchedule(); if (soundingRun) stopSound(true); return; }
    const timer = current.timer;
    if (timer.status !== 'running') { clearSchedule(); return; }
    const now = a.now();
    const remaining = remainingTime(timer, now);
    if (remaining === 0) {
      clearSchedule();
      apply((latest) => latest.runId === timer.runId && latest.deadlineAt === timer.deadlineAt
        ? completeTimer(latest, now) : latest, reason !== 'hydrate' && reason !== 'foreground');
      return;
    }
    const key = `${timer.runId}:${timer.deadlineAt}`;
    if (pending !== null && key === scheduledKey) return;
    clearSchedule();
    scheduledKey = key;
    const ticket = scheduleGeneration;
    pending = a.schedule(() => {
      if (disposed || ticket !== scheduleGeneration) return;
      pending = null;
      reconcile('deadline');
    }, remaining);
  }

  function act(transition: (timer: TimerState, now: number) => TimerState) {
    if (disposed) return;
    const now = a.now();
    stopSound();
    clearSchedule();
    apply((timer) => transition(timer, now), true);
    reconcile();
  }

  return {
    activate: () => { disposed = false; },
    reconcile, stopSound,
    configure: (durationMs: number) => act((timer) => configureTimer(timer, durationMs)),
    start: () => act((timer, now) => startTimer(timer, now, a.createId())),
    pause: () => act(pauseTimer),
    resume: () => act(resumeTimer),
    reset: () => act(resetTimer),
    extend: () => {
      if (disposed) return;
      const now = a.now();
      apply((timer) => extendTimer(timer, now), true);
      reconcile();
    },
    dispose: () => { disposed = true; clearSchedule(); stopSound(true); },
  };
}

export type TimerControls = ReturnType<typeof createTimerCoordinator>;
