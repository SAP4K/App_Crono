import { MAX_STEPS, readSchedule, readScheduleSteps, validId, type Schedule, type ScheduleStep } from './planning.ts';

export const PLANNING_TEMPLATES = {
  focus: [25 * 60000, 5 * 60000],
  workout: [5 * 60000, 20 * 60000, 5 * 60000],
  pomodoro: [25 * 60000, 5 * 60000, 25 * 60000, 5 * 60000, 25 * 60000, 5 * 60000, 25 * 60000, 15 * 60000],
  study: [45 * 60000, 10 * 60000, 45 * 60000, 10 * 60000],
  meditation: [60000, 8 * 60000, 60000],
  morning: [5 * 60000, 10 * 60000, 10 * 60000, 15 * 60000],
  stretching: [2 * 60000, 6 * 60000, 2 * 60000],
  activeBreak: [2 * 60000, 2 * 60000, 60000],
} as const;
export type PlanningTemplateId = keyof typeof PLANNING_TEMPLATES;

export function duplicateSchedule(source: Schedule, options: { id: string; stepIds: string[]; name: string }): Schedule | null {
  if (options.id === source.id || options.stepIds.length !== source.steps.length
    || options.stepIds.some((id) => source.steps.some((step) => step.id === id))) return null;
  return readSchedule({ ...source, id: options.id, name: options.name,
    steps: source.steps.map((step, index) => ({ ...step, id: options.stepIds[index] })) });
}

export function repeatSequence(source: ScheduleStep[], cycles: number, extraIds: string[]): ScheduleStep[] | null {
  const steps = readScheduleSteps(source);
  if (!steps || ![2, 3, 4].includes(cycles) || steps.length * cycles > MAX_STEPS
    || extraIds.length !== steps.length * (cycles - 1)) return null;
  const used = new Set(steps.map(({ id }) => id));
  for (const id of extraIds) {
    if (!validId(id) || used.has(id)) return null;
    used.add(id);
  }
  return Array.from({ length: cycles }, (_, cycle) => steps.map((step, index) => ({ ...step,
    id: cycle === 0 ? step.id : extraIds[(cycle - 1) * steps.length + index],
  }))).flat();
}

export function scheduleFromTemplate(options: {
  template: PlanningTemplateId; id: string; stepIds: string[]; name: string; stepNames: readonly string[];
}): Schedule | null {
  const durations = PLANNING_TEMPLATES[options.template];
  if (!durations || options.stepIds.length !== durations.length || options.stepNames.length !== durations.length) return null;
  return readSchedule({ id: options.id, name: options.name, steps: durations.map((durationMs, index) => ({
    id: options.stepIds[index], name: options.stepNames[index], durationMs,
  })) });
}
