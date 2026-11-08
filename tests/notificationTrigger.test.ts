import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notificationTriggerDate } from '../src/hooks/notificationTrigger.ts';

test('iOS registration never truncates before the semantic deadline; Android retains milliseconds', () => {
  for (const dueAt of [1000, 1001, 1499, 1999, 2000, 1_799_999_999_123]) {
    const ios = notificationTriggerDate('ios', dueAt, dueAt - 1)!;
    assert.ok(ios >= dueAt); assert.ok(ios - dueAt < 1000);
    assert.equal(Math.trunc(ios / 1000) * 1000, ios, 'the installed Swift conversion cannot move this date earlier');
    assert.equal(notificationTriggerDate('android', dueAt, dueAt - 1), dueAt);
  }
});

test('rounding cannot revive elapsed deadlines, invalid dates, or delayed preparation', () => {
  for (const platform of ['ios', 'android'] as const) {
    for (const dueAt of [1001, 1000, 0, -1, NaN, Infinity, 1001.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(notificationTriggerDate(platform, dueAt, 1001), null);
    }
    assert.equal(notificationTriggerDate(platform, 1001, 1000), platform === 'ios' ? 2000 : 1001);
    assert.equal(notificationTriggerDate(platform, 1001, 1500), null, 'expired during preparation, even though the rounded date would be future');
    assert.equal(notificationTriggerDate(platform, 2000, NaN), null);
  }
  assert.equal(notificationTriggerDate('ios', Number.MAX_SAFE_INTEGER, 1), null);
});
