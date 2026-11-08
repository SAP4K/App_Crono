import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyNotificationDelivery, notificationReadiness, readBackgroundAccess } from '../src/hooks/notificationReadiness.ts';
import type { NotificationDelivery } from '../src/hooks/notificationReadiness.ts';
import type { NotificationCapability } from '../src/hooks/notificationTypes.ts';

const granted: NotificationCapability = { status: 'granted', canSchedule: true, canAsk: false, soundAllowed: true };
const android: NotificationDelivery = { platform: 'android', exactAlarm: 'granted', battery: 'optimized', channel: 'available', channelSound: 'audible' };
const input = { hydration: 'loaded', enabled: true, status: 'ready' as const, capability: granted, delivery: android, soundEnabled: true };

test('registration, permissions and native restrictions remain independent', () => {
  assert.equal(notificationReadiness(input), 'registered', 'battery optimization alone is not a failure');
  assert.equal(notificationReadiness({ ...input, enabled: false }), 'off');
  assert.equal(notificationReadiness({ ...input, hydration: 'failed' }), 'storage');
  assert.equal(notificationReadiness({ ...input, status: 'pending' }), 'pending');
  assert.equal(notificationReadiness({ ...input, status: 'failed' }), 'failed');
  for (const canAsk of [true, false]) {
    assert.equal(notificationReadiness({ ...input, capability: { ...granted, status: 'denied', canSchedule: false, canAsk } }), canAsk ? 'permission-needed' : 'permission-blocked');
  }
  assert.equal(notificationReadiness({ ...input, delivery: { ...android, channel: 'blocked' } }), 'channel-blocked');
  assert.equal(notificationReadiness({ ...input, delivery: { ...android, exactAlarm: 'denied' } }), 'exact-denied');
  assert.equal(notificationReadiness({ ...input, delivery: emptyNotificationDelivery('android') }), 'unknown');
  assert.equal(notificationReadiness({ ...input, delivery: { ...android, channelSound: 'silent' } }), 'sound-disabled');
  assert.equal(notificationReadiness({ ...input, soundEnabled: false, delivery: { ...android, channelSound: 'silent' } }), 'registered');
  assert.equal(notificationReadiness({ ...input, capability: { ...granted, status: 'limited', soundAllowed: false } }), 'limited');
  assert.equal(notificationReadiness({ ...input, delivery: emptyNotificationDelivery('ios') }), 'registered');
  assert.equal(notificationReadiness({ ...input, delivery: { ...android, extendedSound: false } }), 'short-sound');
  assert.equal(notificationReadiness({ ...input, delivery: { ...android, extendedSound: 'unknown' } }), 'unknown');
  assert.equal(notificationReadiness({ ...input, delivery: { ...android, extendedSound: true } }), 'registered');
  assert.equal(notificationReadiness({ ...input, soundEnabled: false, delivery: { ...android, extendedSound: false } }), 'registered');
  for (const status of ['unsupported', 'unavailable'] as const) {
    assert.equal(notificationReadiness({ ...input, capability: { ...granted, status, canSchedule: false } }), status);
  }
});

test('optional missing, malformed and failed probes cannot invent a grant or block scheduling', async () => {
  let warnings = 0; const warn = () => { warnings++; };
  assert.deepEqual(await readBackgroundAccess(null, warn), { exactAlarm: 'unknown', battery: 'unknown' });
  assert.equal(warnings, 0);
  assert.deepEqual(await readBackgroundAccess(async () => ({ exactAlarm: 'granted', battery: 'optimized' }), warn), { exactAlarm: 'granted', battery: 'optimized' });
  assert.deepEqual(await readBackgroundAccess(async () => ({ exactAlarm: true, battery: true }), warn), { exactAlarm: 'unknown', battery: 'unknown' });
  assert.deepEqual(await readBackgroundAccess(async () => { throw Error('probe'); }, warn), { exactAlarm: 'unknown', battery: 'unknown' });
  assert.equal(warnings, 1);
  assert.deepEqual(await readBackgroundAccess(async () => ({ exactAlarm: 'not-required', battery: 'not-applicable' }), warn), { exactAlarm: 'not-required', battery: 'not-applicable' });
});
