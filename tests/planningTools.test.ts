import assert from 'node:assert/strict';
import { test } from 'node:test';
import { duplicateSchedule, PLANNING_TEMPLATES, repeatSequence, scheduleFromTemplate, type PlanningTemplateId } from '../src/core/planningTools.ts';
import { MAX_STEPS, initialPlanning, startSchedule, reconcileSchedule, type Schedule } from '../src/core/planning.ts';
import { validDuration } from '../src/core/timer.ts';
import { initialData } from '../src/core/stopwatch.ts';
import { projectNotificationEvents } from '../src/core/notifications.ts';

const source: Schedule = { id: 'plan', name: 'Study', calendar: { kind: 'weekly', weekdays: [1, 3] },
  steps: [{ id: 'a', name: 'Work', durationMs: 1000 }, { id: 'b', name: 'Rest', durationMs: 2000 }] };

test('duplicates preserve source/calendar/text and require independent identities', () => {
  const before = JSON.stringify(source);
  const copy = duplicateSchedule(source, { id: 'copy', stepIds: ['c', 'd'], name: 'Study copy' })!;
  assert.equal(copy.id, 'copy'); assert.deepEqual(copy.calendar, source.calendar);
  assert.notEqual(copy.calendar, source.calendar); assert.deepEqual(copy.steps.map((step) => step.name), ['Work', 'Rest']);
  assert.equal(JSON.stringify(source), before);
  for (const options of [{ id: 'plan', stepIds: ['c', 'd'], name: 'copy' }, { id: 'copy', stepIds: ['a', 'd'], name: 'copy' },
    { id: 'copy', stepIds: ['c', 'c'], name: 'copy' }, { id: 'copy', stepIds: ['c'], name: 'copy' }]) {
    assert.equal(duplicateSchedule(source, options), null);
  }
});

test('repeating a sequence preserves first-cycle IDs, order and unique bounded occurrences', () => {
  const steps = repeatSequence(source.steps, 4, ['c', 'd', 'e', 'f', 'g', 'h'])!;
  assert.deepEqual(steps.map(({ name }) => name), ['Work', 'Rest', 'Work', 'Rest', 'Work', 'Rest', 'Work', 'Rest']);
  assert.deepEqual(steps.map(({ id }) => id), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  const data = initialData(); data.planning = startSchedule({ ...initialPlanning(), schedules: [{ ...source, steps }] }, source.id, 0, 'run');
  const events = projectNotificationEvents(data, 0);
  assert.equal(events.length, 8); assert.equal(new Set(events.map((event) => event.eventId)).size, 8);
  assert.deepEqual(events.map(({ dueAt }) => dueAt), [1000, 3000, 4000, 6000, 7000, 9000, 10000, 12000]);
  assert.equal(events.filter((event) => event.kind === 'schedule-complete').length, 1);
  const complete = reconcileSchedule(data.planning, 12000);
  assert.equal(complete.state.run!.status, 'completed'); assert.equal(complete.events.length, 8);
});

test('repetition rejects invalid counts, reused IDs and overflow without truncation', () => {
  for (const count of [0, 1, 1.5, 5, NaN]) assert.equal(repeatSequence(source.steps, count, ['c', 'd']), null);
  for (const ids of [['c'], ['c', 'c'], ['a', 'd']]) assert.equal(repeatSequence(source.steps, 2, ids), null);
  const steps = Array.from({ length: 25 }, (_, index) => ({ ...source.steps[0], id: `original${index}` }));
  assert.equal(repeatSequence(steps, 2, steps.map((_, index) => `copy${index}`))!.length, 50);
  assert.equal(repeatSequence(steps, 3, Array.from({ length: 50 }, (_, index) => `copy${index}`)), null);
});

test('template metadata produces validated localized drafts without live or saved state', () => {
  const draft = scheduleFromTemplate({ template: 'focus', id: 'new', stepIds: ['x', 'y'], name: 'Concentrare', stepNames: ['Lucru', 'Pauză'] })!;
  assert.deepEqual(draft.steps.map(({ durationMs }) => durationMs), [1500000, 300000]);
  assert.equal(draft.name, 'Concentrare'); assert.equal(draft.calendar, undefined);
  assert.equal(scheduleFromTemplate({ template: 'workout', id: 'new', stepIds: ['x'], name: 'Workout', stepNames: ['One'] }), null);
});

test('the eight built-ins retain their intended order, durations and independent editable copies', () => {
  const expected = {
    focus: [25, 5], workout: [5, 20, 5], pomodoro: [25, 5, 25, 5, 25, 5, 25, 15],
    study: [45, 10, 45, 10], meditation: [1, 8, 1], morning: [5, 10, 10, 15],
    stretching: [2, 6, 2], activeBreak: [2, 2, 1],
  };
  assert.deepEqual(Object.keys(PLANNING_TEMPLATES), Object.keys(expected));
  const before = JSON.stringify(PLANNING_TEMPLATES);
  for (const template of Object.keys(expected) as PlanningTemplateId[]) {
    const durations = expected[template].map((minutes) => minutes * 60000);
    assert.deepEqual([...PLANNING_TEMPLATES[template]], durations, template);
    assert.ok(durations.length > 0 && durations.length <= MAX_STEPS);
    assert.ok(durations.every(validDuration));
    const options = { template, id: 'one', name: 'My schedule', stepNames: durations.map((_, index) => `Action ${index + 1}`),
      stepIds: durations.map((_, index) => `one-${index}`) };
    const first = scheduleFromTemplate(options)!;
    const second = scheduleFromTemplate({ ...options, id: 'two', stepIds: durations.map((_, index) => `two-${index}`) })!;
    assert.deepEqual(first.steps.map((step) => step.durationMs), durations);
    assert.equal(first.calendar, undefined); assert.notEqual(first.steps, second.steps);
    const secondBefore = JSON.stringify(second);
    first.name = 'Edited'; first.steps[0].name = 'Edited action'; first.steps[0].durationMs = 1000;
    assert.equal(JSON.stringify(second), secondBefore);
    assert.equal(JSON.stringify(PLANNING_TEMPLATES), before);
    for (const invalid of [
      { ...options, stepIds: [] }, { ...options, stepNames: [] },
      { ...options, stepIds: durations.map(() => 'duplicate') }, { ...options, name: ' ' },
      { ...options, stepNames: durations.map(() => '') },
      { ...options, stepNames: durations.map(() => 'x'.repeat(81)) },
    ]) assert.equal(scheduleFromTemplate(invalid), null, template);
  }
});

test('Pomodoro projects eight cumulative boundaries and completes once after its final long break', () => {
  const schedule = scheduleFromTemplate({ template: 'pomodoro', id: 'pomodoro', name: 'Pomodoro',
    stepIds: Array.from({ length: 8 }, (_, index) => `action-${index}`),
    stepNames: ['Focus 1', 'Break', 'Focus 2', 'Break', 'Focus 3', 'Break', 'Focus 4', 'Long break'] })!;
  const data = initialData();
  data.planning = startSchedule({ ...initialPlanning(), schedules: [schedule] }, schedule.id, 1000, 'pomodoro-run');
  const deadlines = [25, 30, 55, 60, 85, 90, 115, 130].map((minutes) => 1000 + minutes * 60000);
  const events = projectNotificationEvents(data, 1000);
  assert.deepEqual(events.map((event) => event.dueAt), deadlines);
  assert.equal(new Set(events.map((event) => event.eventId)).size, 8);
  assert.deepEqual(events.map((event) => event.kind), [...Array(7).fill('schedule-step'), 'schedule-complete']);
  for (const [index, dueAt] of deadlines.entries()) {
    const transition = reconcileSchedule(data.planning, dueAt);
    assert.equal(transition.events.length, 1);
    assert.equal(transition.events[0].kind, index === 7 ? 'schedule-complete' : 'schedule-step');
    data.planning = transition.state;
    assert.equal(data.planning.run!.stepIndex, Math.min(index + 1, 7));
  }
  assert.equal(data.planning.run!.status, 'completed');
  assert.deepEqual(reconcileSchedule(data.planning, deadlines[7] + 60000).events, []);
});
