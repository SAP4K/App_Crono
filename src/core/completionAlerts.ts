import { validId } from './planning.ts';
import { ALERT_DURATIONS, SOUND_CHOICES } from './sounds.ts';
import type { AlertDuration, SoundId } from './sounds.ts';
import type { AppData } from './stopwatch.ts';

export const COMPLETION_PROTOCOL = 1;
export const MAX_COMPLETION_RECEIPTS = 256;
export type CompletionKind = 'preview' | 'timer-complete' | 'schedule-complete' | 'schedule-step';
export type CompletionRequest = {
  owner: 'timer' | 'planning' | 'preview'; kind: CompletionKind; eventId: string; runId: string;
  dueAt: number; soundId: SoundId; durationSeconds: AlertDuration;
};
const ranks: Record<CompletionKind, number> = { preview: 0, 'schedule-step': 1, 'schedule-complete': 2, 'timer-complete': 3 };
export function completionWins(current: Pick<CompletionRequest, 'kind' | 'dueAt'>, incoming: Pick<CompletionRequest, 'kind' | 'dueAt'>): boolean {
  if (incoming.kind === 'preview') return current.kind === 'preview';
  return current.kind === 'preview' || incoming.dueAt > current.dueAt
    || (incoming.dueAt === current.dueAt && ranks[incoming.kind] >= ranks[current.kind]);
}
export function playbackRemaining(startedAt: number, seconds: AlertDuration, now: number): number {
  return Math.max(0, seconds * 1000 - Math.max(0, now - startedAt));
}
export function readCompletionRequest(value: unknown): CompletionRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const d = value as Record<string, unknown>;
  if (!validId(d.runId) || !Number.isSafeInteger(d.dueAt) || (d.dueAt as number) < 0
    || !SOUND_CHOICES.some(({ id }) => id === d.soundId) || !ALERT_DURATIONS.includes(d.durationSeconds as AlertDuration)) return null;
  const valid = d.owner === 'timer' ? d.kind === 'timer-complete' && d.eventId === `timer:${d.runId}`
    : d.owner === 'planning' ? (d.kind === 'schedule-step' || d.kind === 'schedule-complete')
      && typeof d.eventId === 'string' && d.eventId.startsWith(`planning:${d.runId}:`)
      && /^(?:[0-9]|[1-4][0-9])$/.test(d.eventId.slice(`planning:${d.runId}:`.length))
      : d.owner === 'preview' && d.kind === 'preview' && d.eventId === `preview:${d.runId}`;
  if (!valid) return null;
  return { owner: d.owner as CompletionRequest['owner'], kind: d.kind as CompletionKind, eventId: d.eventId as string,
    runId: d.runId as string, dueAt: d.dueAt as number, soundId: d.soundId as SoundId, durationSeconds: d.durationSeconds as AlertDuration };
}
export type CompletionPolicy = {
  soundEnabled: boolean; backgroundEnabled: boolean; soundId: SoundId; durationSeconds: AlertDuration;
  timerRunId: string | null; planningRunId: string | null; timerPaused: boolean; planningPaused: boolean;
  timerCompleted: boolean; planningCompleted: boolean;
  events: { eventId: string; dueAt: number }[];
};
export function completionFingerprint(fingerprint: string, native: boolean, seconds: AlertDuration): string {
  return native ? JSON.stringify([fingerprint, 'completion-v1', seconds]) : fingerprint;
}
export function completionPolicy(data: AppData, previous?: CompletionPolicy): CompletionPolicy {
  const timer = data.timer, run = data.planning.run;
  const events: CompletionPolicy['events'] = [];
  if (timer.status === 'running' && timer.runId && timer.deadlineAt !== null) {
    events.push({ eventId: `timer:${timer.runId}`, dueAt: timer.deadlineAt });
  } else if (timer.status === 'completed' && previous?.timerRunId === timer.runId && !previous.timerPaused) {
    events.push(...previous.events.filter(({ eventId }) => eventId === `timer:${timer.runId}`));
  }
  if (run?.status === 'running' && run.deadlineAt !== null) {
    // All boundaries share one timeline, so advancing a step does not revoke
    // its currently ringing alert. Pause/resume shifts the whole timeline.
    let dueAt = run.deadlineAt - run.steps.slice(0, run.stepIndex + 1).reduce((sum, step) => sum + step.durationMs, 0);
    for (const [index, step] of run.steps.entries()) {
      dueAt += step.durationMs;
      if (Number.isSafeInteger(dueAt) && dueAt >= 0) events.push({ eventId: `planning:${run.runId}:${index}`, dueAt });
    }
  } else if (run?.status === 'completed' && previous?.planningRunId === run.runId && !previous.planningPaused) {
    events.push(...previous.events.filter(({ eventId }) => eventId.startsWith(`planning:${run.runId}:`)));
  }
  return { soundEnabled: data.preferences.timerSound, backgroundEnabled: data.preferences.systemNotifications,
    soundId: data.preferences.alertSoundId, durationSeconds: data.preferences.alertDurationSeconds,
    timerRunId: timer.runId, planningRunId: run?.runId ?? null,
    timerPaused: timer.status === 'paused', planningPaused: run?.status === 'paused',
    timerCompleted: timer.status === 'completed', planningCompleted: run?.status === 'completed', events };
}
