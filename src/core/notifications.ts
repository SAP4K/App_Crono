import { MAX_STEPS, validId } from './planning.ts';
import type { AppData } from './stopwatch.ts';

export const NOTIFICATION_PREFIX = 'crono.notifications.v1.';
export type NotificationKind = 'timer-complete' | 'schedule-step' | 'schedule-complete';
export type NotificationEvent = {
  owner: 'timer' | 'planning'; kind: NotificationKind; eventId: string; runId: string; dueAt: number;
  stepIndex?: number; scheduleName?: string; stepName?: string; nextStepName?: string;
};
export type NotificationData = {
  app: 'crono'; version: 1; owner: 'timer' | 'planning'; kind: NotificationKind;
  eventId: string; runId: string; dueAt: number; stepIndex?: number; fingerprint: string;
};

const validTimestamp = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function projectNotificationEvents(data: AppData, now: number): NotificationEvent[] {
  if (!data.preferences.systemNotifications || !validTimestamp(now)) return [];
  const events: NotificationEvent[] = [];
  const timer = data.timer;
  if (timer.status === 'running' && validId(timer.runId) && validTimestamp(timer.deadlineAt) && timer.deadlineAt > now) {
    events.push({ owner: 'timer', kind: 'timer-complete', eventId: `timer:${timer.runId}`, runId: timer.runId, dueAt: timer.deadlineAt });
  }
  const run = data.planning.run;
  if (run?.status === 'running' && validId(run.runId) && validTimestamp(run.deadlineAt)
    && Number.isInteger(run.stepIndex) && run.stepIndex >= 0 && run.stepIndex < run.steps.length && run.steps.length <= MAX_STEPS) {
    let dueAt = run.deadlineAt;
    for (let index = run.stepIndex; index < run.steps.length; index++) {
      if (index > run.stepIndex) dueAt += run.steps[index].durationMs;
      if (!validTimestamp(dueAt)) break;
      if (dueAt <= now) continue;
      const final = index === run.steps.length - 1;
      events.push({ owner: 'planning', kind: final ? 'schedule-complete' : 'schedule-step',
        eventId: `planning:${run.runId}:${index}`, runId: run.runId, dueAt, stepIndex: index,
        scheduleName: run.scheduleName, stepName: run.steps[index].name, nextStepName: final ? undefined : run.steps[index + 1].name });
    }
  }
  return events.sort((a, b) => a.dueAt - b.dueAt || a.eventId.localeCompare(b.eventId));
}

// A resume keeps semantic identity but moves its due time.
export const notificationEventKey = (event: Pick<NotificationEvent, 'eventId' | 'dueAt'>) => `${event.eventId}@${event.dueAt}`;

export function notificationData(event: NotificationEvent, fingerprint: string): NotificationData {
  return { app: 'crono', version: 1, owner: event.owner, kind: event.kind, eventId: event.eventId,
    runId: event.runId, dueAt: event.dueAt, ...(event.stepIndex === undefined ? {} : { stepIndex: event.stepIndex }), fingerprint };
}

export function readNotificationData(value: unknown): NotificationData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.app !== 'crono' || data.version !== 1 || !validId(data.runId) || !validTimestamp(data.dueAt)
    || typeof data.fingerprint !== 'string' || data.fingerprint.length > 4000) return null;
  if (data.owner === 'timer') {
    if (data.kind !== 'timer-complete' || data.eventId !== `timer:${data.runId}` || data.stepIndex !== undefined) return null;
  } else if (data.owner === 'planning') {
    if ((data.kind !== 'schedule-step' && data.kind !== 'schedule-complete') || typeof data.stepIndex !== 'number'
      || !Number.isInteger(data.stepIndex) || data.stepIndex < 0 || data.stepIndex >= MAX_STEPS
      || data.eventId !== `planning:${data.runId}:${data.stepIndex}`) return null;
  } else return null;
  return { app: 'crono', version: 1, owner: data.owner, kind: data.kind, eventId: data.eventId as string,
    runId: data.runId, dueAt: data.dueAt, ...(data.stepIndex === undefined ? {} : { stepIndex: data.stepIndex as number }), fingerprint: data.fingerprint };
}

export function ownedNotificationData(identifier: string, value: unknown): NotificationData | null {
  return identifier.startsWith(NOTIFICATION_PREFIX) ? readNotificationData(value) : null;
}
