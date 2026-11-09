import assert from 'node:assert/strict';
import { test } from 'node:test';
import { duplicateSchedule, repeatSequence, scheduleFromTemplate } from '../src/core/planningTools.ts';
import { initialPlanning, startSchedule, reconcileSchedule, type Schedule } from '../src/core/planning.ts';
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
