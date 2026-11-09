import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeTimer, configureTimer, extendTimer, formatRemaining, initialTimer, MAX_TIMER_MS, parseDuration, pauseTimer, remainingTime, resetTimer, restoreTimer, resumeTimer, startTimer, validDuration } from '../src/core/timer.ts';

test('duration bounds and strict input parsing reject invalid configuration', () => {
  assert.equal(initialTimer().durationMs, 300000);
  for (const value of [1000, MAX_TIMER_MS]) assert.ok(validDuration(value));
  for (const value of [0, -1, 1001, Infinity, NaN, MAX_TIMER_MS + 1000, '1000']) assert.equal(validDuration(value), false);
  assert.equal(parseDuration('00', '05', '00'), 300000);
  assert.equal(parseDuration('23', '59', '59'), MAX_TIMER_MS);
  for (const fields of [['', '05', '00'], ['24','00','00'], ['00','60','00'], ['00','00','00'], ['00','1e','00'], ['-1','00','00'], ['00','1.5','00']]) {
    assert.equal(parseDuration(fields[0], fields[1], fields[2]), null);
  }
});

test('countdown pause, resume, deadline and restart use independent run identity', () => {
  const running = startTimer(initialTimer(5000), 1000, 'first');
  assert.equal(startTimer(running, 2000, 'second'), running);
  assert.equal(remainingTime(running, 2250), 3750);
  const paused = pauseTimer(running, 2250);
  assert.equal(remainingTime(paused, 9000), 3750);
  assert.equal(configureTimer(paused, 1000), paused);
  const resumed = resumeTimer(paused, 10000);
  assert.equal(resumed.runId, 'first');
  assert.equal(resumed.deadlineAt, 13750);
  assert.equal(completeTimer(resumed, 13749), resumed);
  const completed = pauseTimer(resumed, 13750);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.remainingMs, 0);
  assert.equal(completeTimer(completed, 20000), completed);
  assert.equal(startTimer(completed, 20000, 'second').runId, 'second');
  assert.deepEqual(resetTimer(completed), initialTimer(5000));
});

test('restoration validates coherent states and retains overdue running data', () => {
  const running = startTimer(initialTimer(1000), 0, 'run');
  for (const state of [initialTimer(), running, pauseTimer(running, 123), completeTimer(running, 1000)]) {
    assert.deepEqual(restoreTimer(JSON.parse(JSON.stringify(state))), state);
  }
  assert.equal(restoreTimer(running).status, 'running');
  for (const corrupt of [null, [], {}, { ...running, runId: '' }, { ...running, remainingMs: 0 }, { ...running, deadlineAt: NaN }, { ...running, durationMs: Infinity }]) {
    assert.deepEqual(restoreTimer(corrupt), initialTimer());
  }
  assert.equal(remainingTime(running, -5000), 1000);
  assert.equal(remainingTime(running, 999999), 0);
});

test('remaining-time display rounds positive fractions up and handles rollovers', () => {
  for (const [value, expected] of [[0,'00:00:00'],[1,'00:00:01'],[999,'00:00:01'],[1000,'00:00:01'],[1001,'00:00:02'],[60000,'00:01:00'],[3600000,'01:00:00'],[MAX_TIMER_MS,'23:59:59']] as const) {
    assert.equal(formatRemaining(value), expected);
  }
});

test('a minute extension preserves elapsed time, run identity and exact paused milliseconds', () => {
  const running = startTimer(initialTimer(5000), 1000, 'run');
  const extended = extendTimer(running, 2250);
  assert.deepEqual(extended, { status: 'running', durationMs: 65000, remainingMs: 63750, deadlineAt: 66000, runId: 'run' });
  assert.deepEqual(restoreTimer(extended), extended);
  const paused = extendTimer(pauseTimer(running, 2251), 10000);
  assert.equal(paused.remainingMs, 63749); assert.equal(paused.deadlineAt, null);
  assert.equal(resumeTimer(paused, 20000).deadlineAt, 83749);
  assert.deepEqual(resetTimer(extended), initialTimer(65000));
  assert.equal(startTimer(completeTimer(extended, 66000), 70000, 'restart').durationMs, 65000);
});

test('a minute extension rejects overflow, expiry and non-active states without mutation', () => {
  const running = startTimer(initialTimer(1000), 1000, 'run');
  for (const now of [2000, 2001, NaN, Infinity, -1, 1.5]) assert.equal(extendTimer(running, now), running);
  for (const timer of [initialTimer(), completeTimer(running, 2000), startTimer(initialTimer(MAX_TIMER_MS), 1000, 'max')]) {
    assert.equal(extendTimer(timer, 1500), timer);
  }
  const below = startTimer(initialTimer(MAX_TIMER_MS - 60000), 0, 'limit');
  assert.equal(extendTimer(below, 1).durationMs, MAX_TIMER_MS);
  const unsafe = { ...running, deadlineAt: Number.MAX_SAFE_INTEGER };
  assert.equal(extendTimer(unsafe, 1500), unsafe);
});
