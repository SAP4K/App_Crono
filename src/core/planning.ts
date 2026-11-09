import { readScheduleCalendar, type ScheduleCalendar } from './planningCalendar.ts';
import { validDuration } from './timer.ts';

export const MAX_SCHEDULES = 20;
export const MAX_STEPS = 50;
export const MAX_NAME_LENGTH = 80;
export type ScheduleStep = { id: string; name: string; durationMs: number };
export type Schedule = { id: string; name: string; steps: ScheduleStep[]; calendar?: ScheduleCalendar };
export type ScheduleRun = {
  runId: string;
  scheduleId: string;
  scheduleName: string;
  steps: ScheduleStep[];
  status: 'running' | 'paused' | 'completed';
  stepIndex: number;
  remainingMs: number;
  deadlineAt: number | null;
};
export type PlanningState = { schedules: Schedule[]; run: ScheduleRun | null };
export const initialPlanning = (): PlanningState => ({ schedules: [], run: null });
export type ScheduleBoundary = {
  eventId: string; runId: string; stepIndex: number; stepName: string;
  kind: 'schedule-step' | 'schedule-complete'; dueAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export const validId = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 100;

function readName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

export function readScheduleSteps(value: unknown): ScheduleStep[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_STEPS) return null;
  const ids = new Set<string>();
  const steps: ScheduleStep[] = [];
  for (const item of value) {
    if (!isRecord(item) || !validId(item.id) || ids.has(item.id) || !validDuration(item.durationMs)) return null;
    const name = readName(item.name);
    if (!name) return null;
    ids.add(item.id); steps.push({ id: item.id, name, durationMs: item.durationMs });
  }
  return steps;
}

export function readSchedule(value: unknown, { recoverInvalidCalendar = false } = {}): Schedule | null {
  if (!isRecord(value) || !validId(value.id)) return null;
  const name = readName(value.name);
  const steps = readScheduleSteps(value.steps);
  if (!name || !steps) return null;
  const schedule = { id: value.id, name, steps };
  if (value.calendar === undefined) return schedule;
  const calendar = readScheduleCalendar(value.calendar);
  if (calendar) return { ...schedule, calendar };
  return recoverInvalidCalendar ? schedule : null;
}

export function isProtectedSchedule(state: PlanningState, id: string): boolean {
  return state.run?.scheduleId === id && state.run.status !== 'completed';
}

export function saveSchedule(state: PlanningState, value: unknown): PlanningState {
  const schedule = readSchedule(value);
  if (!schedule || isProtectedSchedule(state, schedule.id)) return state;
  const index = state.schedules.findIndex((item) => item.id === schedule.id);
  if (index < 0) return state.schedules.length >= MAX_SCHEDULES ? state : { ...state, schedules: [...state.schedules, schedule] };
  if (JSON.stringify(state.schedules[index]) === JSON.stringify(schedule)) return state;
  return { ...state, schedules: state.schedules.map((item, i) => i === index ? schedule : item) };
}

export function deleteSchedule(state: PlanningState, id: string): PlanningState {
  if (isProtectedSchedule(state, id) || !state.schedules.some((item) => item.id === id)) return state;
  return { schedules: state.schedules.filter((item) => item.id !== id), run: state.run?.scheduleId === id ? null : state.run };
}

export function restorePlanning(value: unknown): PlanningState {
  const state = initialPlanning();
  if (!isRecord(value)) return state;
  if (Array.isArray(value.schedules)) for (const item of value.schedules) {
    const schedule = readSchedule(item, { recoverInvalidCalendar: true });
    if (schedule && !state.schedules.some((saved) => saved.id === schedule.id)) state.schedules.push(schedule);
    if (state.schedules.length === MAX_SCHEDULES) break;
  }
  state.run = restoreScheduleRun(value.run);
  return state;
}

const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function restoreScheduleRun(value: unknown): ScheduleRun | null {
  if (!isRecord(value) || !validId(value.runId) || !validId(value.scheduleId)) return null;
  const steps = readScheduleSteps(value.steps);
  const scheduleName = readName(value.scheduleName);
  if (!steps || !scheduleName || typeof value.stepIndex !== 'number' || !Number.isInteger(value.stepIndex)
    || value.stepIndex < 0 || value.stepIndex >= steps.length || !validTime(value.remainingMs)
    || value.remainingMs > steps[value.stepIndex].durationMs) return null;
  const running = value.status === 'running' && value.remainingMs > 0 && validTime(value.deadlineAt);
  const paused = value.status === 'paused' && value.remainingMs > 0 && value.deadlineAt === null;
  const completed = value.status === 'completed' && value.remainingMs === 0 && value.deadlineAt === null && value.stepIndex === steps.length - 1;
  if (!running && !paused && !completed) return null;
  const futureDuration = steps.slice(value.stepIndex + 1).reduce((sum, step) => sum + step.durationMs, 0);
  if (running && !validTime((value.deadlineAt as number) + futureDuration)) return null;
  return { runId: value.runId, scheduleId: value.scheduleId, scheduleName, steps,
    status: value.status as ScheduleRun['status'], stepIndex: value.stepIndex,
    remainingMs: value.remainingMs, deadlineAt: value.deadlineAt as number | null };
}

export function scheduleRemaining(run: ScheduleRun, now: number): number {
  return run.status === 'running' && run.deadlineAt !== null
    ? Math.max(0, Math.min(run.remainingMs, run.deadlineAt - now)) : run.remainingMs;
}

export function startSchedule(state: PlanningState, id: string, now: number, runId: string, replace = false): PlanningState {
  const template = state.schedules.find((item) => item.id === id);
  if (!template || !validTime(now) || !validId(runId) || state.run?.runId === runId
    || (state.run && state.run.status !== 'completed' && !replace)) return state;
  const duration = template.steps[0].durationMs;
  if (!validTime(now + template.steps.reduce((sum, step) => sum + step.durationMs, 0))) return state;
  return { ...state, run: { runId, scheduleId: id, scheduleName: template.name,
    steps: template.steps.map((step) => ({ ...step })), status: 'running', stepIndex: 0,
    remainingMs: duration, deadlineAt: now + duration } };
}

export function reconcileSchedule(state: PlanningState, now: number): { state: PlanningState; events: ScheduleBoundary[] } {
  let run = state.run;
  const events: ScheduleBoundary[] = [];
  if (!validTime(now)) return { state, events };
  while (run?.status === 'running' && run.deadlineAt !== null && run.deadlineAt <= now) {
    const final = run.stepIndex === run.steps.length - 1;
    const dueAt = run.deadlineAt;
    events.push({ eventId: `planning:${run.runId}:${run.stepIndex}`, runId: run.runId,
      stepIndex: run.stepIndex, stepName: run.steps[run.stepIndex].name,
      kind: final ? 'schedule-complete' : 'schedule-step', dueAt });
    if (final) run = { ...run, status: 'completed', remainingMs: 0, deadlineAt: null };
    else {
      const next = run.stepIndex + 1;
      run = { ...run, stepIndex: next, remainingMs: run.steps[next].durationMs, deadlineAt: dueAt + run.steps[next].durationMs };
    }
  }
  return { state: run === state.run ? state : { ...state, run }, events };
}

export function pauseSchedule(state: PlanningState, now: number): PlanningState {
  if (!validTime(now)) return state;
  const reconciled = reconcileSchedule(state, now).state;
  const run = reconciled.run;
  return run?.status !== 'running' ? reconciled
    : { ...reconciled, run: { ...run, status: 'paused', remainingMs: scheduleRemaining(run, now), deadlineAt: null } };
}

export function resumeSchedule(state: PlanningState, now: number): PlanningState {
  const run = state.run;
  const remaining = run ? run.remainingMs + run.steps.slice(run.stepIndex + 1).reduce((sum, step) => sum + step.durationMs, 0) : 0;
  return run?.status !== 'paused' || !validTime(now) || !validTime(now + remaining) ? state
    : { ...state, run: { ...run, status: 'running', deadlineAt: now + run.remainingMs } };
}

export function resetSchedule(state: PlanningState): PlanningState {
  return state.run === null ? state : { ...state, run: null };
}
