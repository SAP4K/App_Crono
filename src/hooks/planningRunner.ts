import type { AppData } from '../core/stopwatch.ts';
import { pauseSchedule, reconcileSchedule, resetSchedule, resumeSchedule, startSchedule } from '../core/planning.ts';
import type { PlanningState, ScheduleBoundary } from '../core/planning.ts';
import type { AlertPlayback } from './alertPlayback.ts';

type Adapters = {
  getSnapshot: () => AppData;
  update: (action: (previous: AppData) => AppData) => { changed: boolean; data: AppData };
  alerts: Pick<AlertPlayback, 'request' | 'cancelOwner' | 'suspendOwner'>;
  isActive: () => boolean; now: () => number; createId: () => string;
  notify: (event: ScheduleBoundary) => void;
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel: (handle: ReturnType<typeof setTimeout>) => void;
};

export function createPlanningRunner(a: Adapters) {
  let disposed = false;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let scheduledKey = '';
  let soundingRun: string | null = null;

  function clearSchedule() {
    generation++;
    if (pending !== null) a.cancel(pending);
    pending = null; scheduledKey = '';
  }

  function stopSound(lifecycle = false) {
    soundingRun = null;
    if (lifecycle && a.alerts.suspendOwner) a.alerts.suspendOwner('planning'); else a.alerts.cancelOwner('planning');
  }

  function announce(event: ScheduleBoundary, soundAllowed: boolean) {
    a.notify(event);
    if (!soundAllowed || !a.isActive() || !a.getSnapshot().preferences.timerSound) return;
    const { preferences } = a.getSnapshot();
    const allowed = () => {
      const latest = a.getSnapshot(); const run = latest.planning.run;
      return !disposed && a.isActive() && latest.preferences.timerSound && run?.runId === event.runId
        && (event.kind === 'schedule-complete' ? run.status === 'completed' : run.status === 'running' && run.stepIndex === event.stepIndex + 1);
    };
    const accepted = a.alerts.request({ owner: 'planning', eventId: event.eventId, runId: event.runId, kind: event.kind, dueAt: event.dueAt,
      soundId: preferences.alertSoundId, durationSeconds: preferences.alertDurationSeconds, allowed });
    if (accepted) soundingRun = event.runId;
  }

  function reconcile(reason: 'hydrate' | 'foreground' | 'update' | 'deadline' = 'update') {
    if (disposed) return;
    const current = a.getSnapshot(); const run = current.planning.run;
    if (soundingRun && (!current.preferences.timerSound || run?.runId !== soundingRun || run.status === 'paused')) stopSound();
    if (!a.isActive()) { clearSchedule(); stopSound(true); return; }
    if (run?.status !== 'running') { clearSchedule(); return; }
    const now = a.now();
    if (run.deadlineAt !== null && run.deadlineAt <= now) {
      clearSchedule();
      let events: ScheduleBoundary[] = [];
      const result = a.update((previous) => {
        const latest = previous.planning.run;
        if (latest?.runId !== run.runId || latest.stepIndex !== run.stepIndex || latest.deadlineAt !== run.deadlineAt) return previous;
        const transition = reconcileSchedule(previous.planning, now);
        events = transition.events;
        return transition.state === previous.planning ? previous : { ...previous, planning: transition.state };
      });
      const event = events.at(-1);
      if (result.changed && event) announce(event, reason !== 'hydrate' && reason !== 'foreground');
      if (result.changed) reconcile(reason);
      return;
    }
    const key = `${run.runId}:${run.stepIndex}:${run.deadlineAt}`;
    if (pending !== null && scheduledKey === key) return;
    clearSchedule(); scheduledKey = key;
    const ticket = generation;
    pending = a.schedule(() => {
      if (disposed || generation !== ticket) return;
      pending = null; reconcile('deadline');
    }, Math.max(0, run.deadlineAt! - now));
  }

  function act(transition: (state: PlanningState, now: number) => PlanningState): boolean {
    if (disposed) return false;
    const now = a.now();
    const result = a.update((previous) => {
      const next = transition(previous.planning, now);
      return next === previous.planning ? previous : { ...previous, planning: next };
    });
    if (!result.changed) return false;
    stopSound(); clearSchedule(); reconcile();
    return true;
  }

  return {
    reconcile,
    activate: () => { disposed = false; },
    start: (id: string, replace = false) => act((state, now) => startSchedule(state, id, now, a.createId(), replace)),
    pause: () => { reconcile('deadline'); return act(pauseSchedule); },
    resume: () => act(resumeSchedule),
    reset: () => act(resetSchedule),
    dispose: () => { disposed = true; clearSchedule(); stopSound(true); },
  };
}

export type PlanningControls = ReturnType<typeof createPlanningRunner>;
