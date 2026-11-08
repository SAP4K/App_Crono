import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteSchedule, initialPlanning, MAX_NAME_LENGTH, MAX_SCHEDULES, MAX_STEPS, readSchedule, restorePlanning, saveSchedule } from '../src/core/planning.ts';
import type { Schedule } from '../src/core/planning.ts';
import { calendarDateTimestamp, dateKeyFromParts, datePartsFromKey, localDateKey, matchesScheduleDate, type ScheduleCalendar } from '../src/core/planningCalendar.ts';
import { projectNotificationEvents } from '../src/core/notifications.ts';
import { initialData, restoreData } from '../src/core/stopwatch.ts';
import { pauseSchedule, reconcileSchedule, resetSchedule, resumeSchedule, scheduleRemaining, startSchedule } from '../src/core/planning.ts';

const schedule = (id = 'study'): Schedule => ({ id, name: 'Studiu', steps: [
  { id: 'work', name: 'Învață', durationMs: 2000 }, { id: 'break', name: 'Pauză', durationMs: 1000 },
] });

test('saved schedules validate names, counts, IDs, and per-action duration bounds', () => {
  assert.equal(readSchedule({ ...schedule(), name: '  Studiu  ' })?.name, 'Studiu');
  for (const name of ['', '  ', 'a'.repeat(MAX_NAME_LENGTH + 1), null]) assert.equal(readSchedule({ ...schedule(), name }), null);
  for (const steps of [[], Array(MAX_STEPS + 1).fill(schedule().steps[0]), [schedule().steps[0], schedule().steps[0]]]) {
    assert.equal(readSchedule({ ...schedule(), steps }), null);
  }
  for (const durationMs of [0, 999, 1001, 86400000, Infinity, '1000']) {
    assert.equal(readSchedule({ ...schedule(), steps: [{ ...schedule().steps[0], durationMs }] }), null);
  }
  assert.ok(readSchedule({ ...schedule(), steps: [{ id: 'max', name: 'Lung', durationMs: 86399000 }] }));
  assert.equal(readSchedule({ ...schedule(), id: '  ' }), null);
});

test('schedule CRUD retains ordering, limits additions, and returns original state for no-ops', () => {
  let state = saveSchedule(initialPlanning(), schedule());
  assert.equal(saveSchedule(state, schedule()), state);
  state = saveSchedule(state, { ...schedule(), steps: [...schedule().steps].reverse() });
  assert.equal(state.schedules[0].steps[0].id, 'break');
  for (let i = 1; i < MAX_SCHEDULES; i++) state = saveSchedule(state, schedule('plan-' + i));
  assert.equal(saveSchedule(state, schedule('overflow')), state);
  assert.equal(deleteSchedule(state, 'missing'), state);
  const next = deleteSchedule(state, 'study');
  assert.equal(next.schedules.length, MAX_SCHEDULES - 1);
  assert.equal(state.schedules.length, MAX_SCHEDULES);
});

test('restoration filters corrupt and duplicate templates without discarding valid peers', () => {
  const restored = restorePlanning({ schedules: [null, schedule(), { ...schedule('bad'), steps: [] }, schedule(), schedule('second')] });
  assert.deepEqual(restored.schedules.map((item) => item.id), ['study', 'second']);
  assert.deepEqual(restorePlanning(null), initialPlanning());
});

test('calendar rules normalize weekly choices and validate exact civil dates', () => {
  assert.deepEqual(readSchedule({ ...schedule(), calendar: { kind: 'weekly', weekdays: [7, 1, 4, 1] } })?.calendar,
    { kind: 'weekly', weekdays: [1, 4, 7] });
  for (const weekdays of [[], [0], [1, 8], [1.5], ['4'], new Array(1)]) {
    assert.equal(readSchedule({ ...schedule(), calendar: { kind: 'weekly', weekdays } }), null);
  }
  for (const date of ['2027-02-29', '1900-02-29', '2026-04-31', '2026-00-10', '2026-11-00', '2026-2-09', '0000-01-01', '10000-01-01', '2026-11-05\n']) {
    assert.equal(calendarDateTimestamp(date), null);
    assert.equal(readSchedule({ ...schedule(), calendar: { kind: 'once', date } }), null);
  }
  for (const date of ['0001-01-01', '0099-12-31', '2000-02-29', '2028-02-29', '9999-12-31']) {
    assert.equal(new Date(calendarDateTimestamp(date)!).toISOString().slice(0, 10), date);
    assert.deepEqual(readSchedule({ ...schedule(), calendar: { kind: 'once', date } })?.calendar, { kind: 'once', date });
  }
});

test('weekly rules recur across weeks and calendar boundaries while a fixed date matches once', () => {
  const weekly: ScheduleCalendar = { kind: 'weekly', weekdays: [1, 4, 7] };
  for (const date of ['2026-03-22', '2026-03-29', '2026-04-05', '2026-10-26', '2026-11-02', '2026-11-05', '2026-11-09']) {
    assert.equal(matchesScheduleDate(weekly, date), true);
  }
  for (const date of ['2026-11-04', '2026-11-06', '2026-02-29']) assert.equal(matchesScheduleDate(weekly, date), false);
  const once: ScheduleCalendar = { kind: 'once', date: '2026-11-05' };
  assert.equal(matchesScheduleDate(once, '2026-11-05'), true);
  for (const date of ['2026-11-04', '2026-11-06', '2026-11-12']) assert.equal(matchesScheduleDate(once, date), false);
  assert.equal(matchesScheduleDate(undefined, '2026-11-05'), false);
  assert.equal(localDateKey(new Date(2026, 10, 5, 23, 59)), '2026-11-05');
  assert.equal(localDateKey(new Date(2027, 0, 1, 0, 1)), '2027-01-01');
});

test('calendar fields accept unpadded day and month and reject incomplete or impossible dates', () => {
  assert.deepEqual(datePartsFromKey('2028-02-29'), { day: '29', month: '02', year: '2028' });
  assert.equal(dateKeyFromParts({ day: '5', month: '2', year: '2028' }), '2028-02-05');
  for (const day of ['', '0', '30', '5x', '05 ']) {
    assert.equal(dateKeyFromParts({ day, month: '2', year: '2028' }), null);
  }
  assert.equal(dateKeyFromParts({ day: '5', month: '2', year: '28' }), null);
});

test('calendar mode changes preserve schedule identity and normalize no-op saves', () => {
  const weekly = saveSchedule(initialPlanning(), { ...schedule(), calendar: { kind: 'weekly', weekdays: [4, 1, 4] } });
  assert.equal(saveSchedule(weekly, { ...schedule(), calendar: { kind: 'weekly', weekdays: [1, 4] } }), weekly);
  assert.equal(saveSchedule(weekly, { ...schedule(), calendar: { kind: 'once', date: '2026-02-30' } }), weekly);
  assert.equal(saveSchedule(weekly, { ...schedule(), calendar: null }), weekly);
  const once = saveSchedule(weekly, { ...schedule(), calendar: { kind: 'once', date: '2026-11-05' } });
  assert.deepEqual(once.schedules[0], { ...schedule(), calendar: { kind: 'once', date: '2026-11-05' } });
  const manual = saveSchedule(once, { ...schedule(), calendar: undefined });
  assert.deepEqual(manual.schedules, [schedule()]);
});

test('v1 hydration preserves legacy actions and the run when calendar metadata is corrupt', () => {
  const legacy = startSchedule(saveSchedule(initialPlanning(), schedule()), 'study', 1000, 'run');
  const data = {
    ...initialData(),
    planning: { ...legacy, schedules: [
      ...legacy.schedules,
      { ...schedule('corrupt'), calendar: { kind: 'weekly', weekdays: [8] } },
      { ...schedule('weekly'), calendar: { kind: 'weekly', weekdays: [4, 1, 4] } },
      { ...schedule('once'), calendar: { kind: 'once', date: '2028-02-29' } },
    ] },
  };
  const restored = restoreData(JSON.stringify(data), 1000);
  assert.equal(restored.version, 1);
  assert.deepEqual(restored.planning.schedules, [
    schedule(), schedule('corrupt'),
    { ...schedule('weekly'), calendar: { kind: 'weekly', weekdays: [1, 4] } },
    { ...schedule('once'), calendar: { kind: 'once', date: '2028-02-29' } },
  ]);
  assert.deepEqual(restored.planning.run, legacy.run);
  assert.deepEqual(restoreData(JSON.stringify(restored), 1000), restored);
});

test('calendar edits preserve active-run protection and its notification projection', () => {
  const planning = startSchedule(saveSchedule(saveSchedule(initialPlanning(), schedule()), schedule('second')), 'study', 1000, 'run');
  const calendar: ScheduleCalendar = { kind: 'once', date: '2026-11-05' };
  assert.equal(saveSchedule(planning, { ...schedule(), calendar }), planning);
  const edited = saveSchedule(planning, { ...schedule('second'), calendar });
  assert.notEqual(edited, planning);
  assert.equal(edited.run, planning.run);
  const expected = projectNotificationEvents({ ...initialData(), planning }, 1100);
  assert.ok(expected.length > 0);
  assert.deepEqual(projectNotificationEvents({ ...initialData(), planning: edited }, 1100), expected);
});

test('automatic advancement uses cumulative deadlines and emits the final action only once', () => {
  const initial = saveSchedule(initialPlanning(), { ...schedule(), steps: [...schedule().steps, { id: 'stretch', name: 'Mișcare', durationMs: 3000 }] });
  const started = startSchedule(initial, 'study', 1000, 'run-1');
  assert.equal(reconcileSchedule(started, 2999).state, started);
  const delayed = reconcileSchedule(started, 4500);
  assert.equal(delayed.state.run?.stepIndex, 2);
  assert.equal(delayed.state.run?.deadlineAt, 7000);
  assert.equal(scheduleRemaining(delayed.state.run!, 4500), 2500);
  assert.deepEqual(delayed.events.map((event) => event.dueAt), [3000, 4000]);
  const ended = reconcileSchedule(delayed.state, 7000);
  assert.equal(ended.state.run?.status, 'completed');
  assert.equal(ended.events.length, 1);
  assert.equal(ended.events[0].kind, 'schedule-complete');
  assert.deepEqual(reconcileSchedule(ended.state, 10000).events, []);
  const restarted = startSchedule(ended.state, 'study', 11000, 'run-2');
  assert.equal(restarted.run?.stepIndex, 0);
  assert.equal(restarted.run?.runId, 'run-2');
});

test('pause, restore, and resume retain fractional milliseconds; overdue pause reconciles first', () => {
  const started = startSchedule(saveSchedule(initialPlanning(), schedule()), 'study', 1000, 'run');
  const paused = pauseSchedule(started, 2234);
  assert.equal(paused.run?.remainingMs, 766);
  const restored = restorePlanning(JSON.parse(JSON.stringify(paused)));
  assert.deepEqual(restored, paused);
  const resumed = resumeSchedule(restored, 10000);
  assert.equal(resumed.run?.deadlineAt, 10766);
  assert.equal(reconcileSchedule(resumed, 10765).state.run?.stepIndex, 0);
  const atBoundary = pauseSchedule(resumed, 10766);
  assert.equal(atBoundary.run?.stepIndex, 1);
  assert.equal(atBoundary.run?.status, 'paused');
  assert.equal(atBoundary.run?.remainingMs, 1000);
  assert.equal(pauseSchedule(started, 999999).run?.status, 'completed');
});

test('one-action runs, template protection, confirmed replacement, and independent snapshots', () => {
  let state = saveSchedule(saveSchedule(initialPlanning(), schedule()), { id: 'single', name: 'Un pas', steps: [{ id: 'one', name: 'Respiră', durationMs: 1000 }] });
  state = startSchedule(state, 'single', 1000, 'one-run');
  assert.equal(saveSchedule(state, { ...state.schedules[1], name: 'Editat' }), state);
  assert.equal(deleteSchedule(state, 'single'), state);
  assert.equal(startSchedule(state, 'study', 1000, 'other'), state);
  const replaced = startSchedule(state, 'study', 1000, 'other', true);
  state.schedules[0].steps[0].name = 'Draft changed';
  assert.equal(replaced.run?.steps[0].name, 'Învață');
  const end = reconcileSchedule(state, 2000);
  assert.equal(end.events.length, 1);
  assert.equal(end.events[0].kind, 'schedule-complete');
  assert.equal(deleteSchedule(end.state, 'single').run, null);
  assert.equal(resetSchedule(replaced).schedules.length, 2);
});

test('corrupt execution snapshots are rejected independently of valid templates', () => {
  const started = startSchedule(saveSchedule(initialPlanning(), schedule()), 'study', 1000, 'run');
  for (const changes of [{ stepIndex: 99 }, { remainingMs: -1 }, { status: 'paused' }, { status: 'completed', remainingMs: 0, deadlineAt: null }, { steps: [] }]) {
    const restored = restorePlanning({ ...started, run: { ...started.run, ...changes } });
    assert.equal(restored.run, null);
    assert.equal(restored.schedules.length, 1);
  }
  assert.deepEqual(restorePlanning(started).run, started.run);
  assert.equal(startSchedule(started, 'study', 1, 'new'), started);
  assert.equal(startSchedule(initialPlanning(), 'missing', 0, 'new').run, null);
  assert.equal(pauseSchedule(started, NaN), started);
  assert.equal(startSchedule(resetSchedule(started), 'study', Number.MAX_SAFE_INTEGER - 2000, 'overflow').run, null);
  const paused = pauseSchedule(started, 1500);
  assert.equal(resumeSchedule(paused, Number.MAX_SAFE_INTEGER - 1500), paused);
  assert.equal(restorePlanning({ ...started, run: { ...started.run, deadlineAt: Number.MAX_SAFE_INTEGER } }).run, null);
});
