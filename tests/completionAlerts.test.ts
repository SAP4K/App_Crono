import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readCompletionRequest, completionWins, playbackRemaining, completionFingerprint, completionPolicy } from '../src/core/completionAlerts.ts';
import { initialData } from '../src/core/stopwatch.ts';
import { configureTimer, startTimer, completeTimer, pauseTimer, resumeTimer, resetTimer } from '../src/core/timer.ts';
import { startSchedule, reconcileSchedule, pauseSchedule, resumeSchedule } from '../src/core/planning.ts';

const request = { owner: 'timer', kind: 'timer-complete', eventId: 'timer:run', runId: 'run', dueAt: 1000,
  soundId: 'bell', durationSeconds: 60 };

test('native completion requests validate identity and a finite supported budget', () => {
  assert.deepEqual(readCompletionRequest(request), request);
  for (const durationSeconds of [5, 15, 30, 60]) assert.ok(readCompletionRequest({ ...request, durationSeconds }));
  for (const durationSeconds of [0, 61, Infinity, '60', null]) assert.equal(readCompletionRequest({ ...request, durationSeconds }), null);
  for (const patch of [{ eventId: 'timer:other' }, { runId: '' }, { soundId: 'unknown' }, { dueAt: NaN }, { owner: 'planning' }]) {
    assert.equal(readCompletionRequest({ ...request, ...patch }), null);
  }
});

test('literal native priority cases preserve one owner without queues', () => {
  const cases = JSON.parse(readFileSync(new URL('./fixtures/completion-alert-cases.json', import.meta.url), 'utf8'));
  for (const item of cases) assert.equal(completionWins(item.current, item.incoming), item.wins, item.name);
});

test('a minute expires from actual monotonic playback start and never resets on return', () => {
  assert.equal(playbackRemaining(2000, 60, 2000), 60000);
  assert.equal(playbackRemaining(2000, 60, 61999), 1);
  assert.equal(playbackRemaining(2000, 60, 62000), 0);
  assert.equal(playbackRemaining(2000, 60, 70000), 0);
});
test('only an extended native transport rearms on duration change', () => {
  assert.equal(completionFingerprint('clip', false, 15), completionFingerprint('clip', false, 60));
  assert.notEqual(completionFingerprint('clip', true, 15), completionFingerprint('clip', true, 60));
});

test('accepted timer policy changes on resume and preserves the completed minute only for the same run', () => {
  const data = initialData();
  data.timer = startTimer(configureTimer(data.timer, 10000), 1000, 'run');
  const original = completionPolicy(data);
  data.timer = resumeTimer(pauseTimer(data.timer, 2000), 5000);
  const resumed = completionPolicy(data, original);
  assert.deepEqual(original.events, [{ eventId: 'timer:run', dueAt: 11000 }]);
  assert.deepEqual(resumed.events, [{ eventId: 'timer:run', dueAt: 14000 }]);
  data.timer = completeTimer(data.timer, 14000);
  assert.deepEqual(completionPolicy(data, resumed).events, resumed.events);
  data.timer = resetTimer(data.timer);
  assert.deepEqual(completionPolicy(data, resumed).events, []);
});

test('schedule policy retains one timeline through natural advance and completion, but changes it on resume', () => {
  const data = initialData();
  const schedule = { id: 's', name: 'Study', steps: [1000, 2000].map((durationMs, i) => ({ id: `s${i}`, name: 'Action', durationMs })) };
  data.planning.schedules = [schedule];
  data.planning = startSchedule(data.planning, 's', 1000, 'plan');
  const first = completionPolicy(data);
  data.planning = reconcileSchedule(data.planning, 2000).state;
  const advanced = completionPolicy(data, first);
  assert.deepEqual(advanced.events, first.events);
  data.planning = resumeSchedule(pauseSchedule(data.planning, 2500), 5000);
  const resumed = completionPolicy(data, advanced);
  assert.deepEqual(resumed.events, [{ eventId: 'planning:plan:0', dueAt: 4500 }, { eventId: 'planning:plan:1', dueAt: 6500 }]);
  data.planning = reconcileSchedule(data.planning, 6500).state;
  assert.deepEqual(completionPolicy(data, resumed).events, resumed.events);
});
