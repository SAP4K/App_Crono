import assert from 'node:assert/strict';
import { test } from 'node:test';
import { durationMilliseconds, durationParts, wheelIndex } from '../src/core/durationPicker.ts';
import { MAX_TIMER_MS } from '../src/core/timer.ts';

test('wheel durations retain second precision and the existing valid duration bounds', () => {
  for (const milliseconds of [1000, 59000, 60000, 63000, 3599000, 3600000, MAX_TIMER_MS]) {
    assert.equal(durationMilliseconds(durationParts(milliseconds)), milliseconds);
  }
  assert.deepEqual(durationParts(63000), { hours: 0, minutes: 1, seconds: 3 });
  assert.deepEqual(durationParts(MAX_TIMER_MS), { hours: 23, minutes: 59, seconds: 59 });
});

test('zero and malformed wheel parts cannot start or save a duration', () => {
  const zero = { hours: 0, minutes: 0, seconds: 0 };
  assert.equal(durationMilliseconds(zero), null);
  for (const part of [{ hours: 24 }, { minutes: 60 }, { seconds: -1 }, { seconds: 1.5 }, { minutes: NaN }, { hours: Infinity }]) {
    assert.equal(durationMilliseconds({ ...zero, ...part }), null);
  }
  for (const value of [-1000, NaN, Infinity, 1, MAX_TIMER_MS + 1000]) assert.deepEqual(durationParts(value), zero);
});

test('wheel snapping rounds to the nearest row and contains native overscroll', () => {
  assert.equal(wheelIndex(43, 44, 59), 1);
  assert.equal(wheelIndex(65, 44, 59), 1);
  assert.equal(wheelIndex(66, 44, 59), 2);
  assert.equal(wheelIndex(-90, 44, 59), 0);
  assert.equal(wheelIndex(10000, 44, 23), 23);
  assert.equal(wheelIndex(59 * 60, 60, 59), 59);
});

test('invalid layout measurements cannot produce NaN or out-of-range wheel positions', () => {
  for (const [offset, height, max] of [[NaN, 44, 59], [Infinity, 44, 59], [22, 0, 59], [22, NaN, 59], [22, -1, 59], [22, 44, -1], [22, 44, 1.5]]) {
    assert.equal(wheelIndex(offset, height, max), 0);
  }
});
