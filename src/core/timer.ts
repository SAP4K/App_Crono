export const DEFAULT_TIMER_MS = 5 * 60 * 1000;
export const MAX_TIMER_MS = 86_399_000;
export type TimerState = {
  status: 'idle' | 'running' | 'paused' | 'completed';
  durationMs: number;
  remainingMs: number;
  deadlineAt: number | null;
  runId: string | null;
};

export function validDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    && value >= 1000 && value <= MAX_TIMER_MS && value % 1000 === 0;
}

export function initialTimer(durationMs = DEFAULT_TIMER_MS): TimerState {
  const duration = validDuration(durationMs) ? durationMs : DEFAULT_TIMER_MS;
  return { status: 'idle', durationMs: duration, remainingMs: duration, deadlineAt: null, runId: null };
}

export function remainingTime(timer: TimerState, now = Date.now()): number {
  return timer.status === 'running' && timer.deadlineAt !== null
    ? Math.max(0, Math.min(timer.remainingMs, timer.deadlineAt - now))
    : timer.remainingMs;
}

export function configureTimer(timer: TimerState, durationMs: number): TimerState {
  if (!validDuration(durationMs) || timer.status === 'running' || timer.status === 'paused') return timer;
  if (timer.status === 'idle' && timer.durationMs === durationMs) return timer;
  return initialTimer(durationMs);
}

export function startTimer(timer: TimerState, now: number, runId: string): TimerState {
  if (timer.status !== 'idle' && timer.status !== 'completed') return timer;
  if (!Number.isSafeInteger(now) || now < 0 || !runId || runId.length > 100) return timer;
  return { ...timer, status: 'running', remainingMs: timer.durationMs, deadlineAt: now + timer.durationMs, runId };
}

export function completeTimer(timer: TimerState, now = Date.now()): TimerState {
  return timer.status === 'running' && remainingTime(timer, now) === 0
    ? { ...timer, status: 'completed', remainingMs: 0, deadlineAt: null }
    : timer;
}

export function pauseTimer(timer: TimerState, now = Date.now()): TimerState {
  if (timer.status !== 'running') return timer;
  const remainingMs = remainingTime(timer, now);
  return remainingMs === 0 ? completeTimer(timer, now)
    : { ...timer, status: 'paused', remainingMs, deadlineAt: null };
}

export function resumeTimer(timer: TimerState, now = Date.now()): TimerState {
  return timer.status !== 'paused' ? timer
    : { ...timer, status: 'running', deadlineAt: now + timer.remainingMs };
}

export function resetTimer(timer: TimerState): TimerState {
  return timer.status === 'idle' ? timer : initialTimer(timer.durationMs);
}

export function restoreTimer(value: unknown): TimerState {
  const fallback = initialTimer();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fallback;
  const v = value as Record<string, unknown>;
  if (!validDuration(v.durationMs) || typeof v.remainingMs !== 'number'
    || !Number.isSafeInteger(v.remainingMs) || v.remainingMs < 0 || v.remainingMs > v.durationMs) return fallback;
  const identity = typeof v.runId === 'string' && v.runId.length > 0 && v.runId.length <= 100;
  const idle = v.status === 'idle' && v.runId === null && v.deadlineAt === null && v.remainingMs === v.durationMs;
  const running = v.status === 'running' && identity && v.remainingMs > 0
    && typeof v.deadlineAt === 'number' && Number.isSafeInteger(v.deadlineAt) && v.deadlineAt >= 0;
  const paused = v.status === 'paused' && identity && v.remainingMs > 0 && v.deadlineAt === null;
  const completed = v.status === 'completed' && identity && v.remainingMs === 0 && v.deadlineAt === null;
  if (!idle && !running && !paused && !completed) return fallback;
  return { status: v.status as TimerState['status'], durationMs: v.durationMs, remainingMs: v.remainingMs,
    deadlineAt: v.deadlineAt as number | null, runId: v.runId as string | null };
}

export function formatRemaining(milliseconds: number): string {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
}

export function parseDuration(hours: string, minutes: string, seconds: string): number | null {
  const fields = [hours, minutes, seconds];
  if (fields.some((field) => !/^\d{1,2}$/.test(field))) return null;
  const [h, m, s] = fields.map(Number);
  if (h > 23 || m > 59 || s > 59) return null;
  const duration = (h * 3600 + m * 60 + s) * 1000;
  return validDuration(duration) ? duration : null;
}
