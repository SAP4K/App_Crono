import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTIFICATION_PREFIX, notificationData } from '../src/core/notifications.ts';
import { createNotificationResponseHandler, notificationRoute } from '../src/hooks/notificationResponses.ts';
import type { NativeNotificationResponse } from '../src/hooks/notificationTypes.ts';

const timer = (): NativeNotificationResponse => ({ identifier: NOTIFICATION_PREFIX + 'tap', defaultAction: true,
  data: notificationData({ owner: 'timer', kind: 'timer-complete', eventId: 'timer:old-run', runId: 'old-run', dueAt: 123 }, 'content') });

test('cold responses wait for storage/fonts/router readiness; live/initial duplicates navigate once', () => {
  const routes: string[] = [], consumed: string[] = [];
  const handler = createNotificationResponseHandler({ navigate: (route) => routes.push(route), consume: (id) => consumed.push(id), warn: assert.fail });
  handler.accept(timer()); handler.setReady(false); assert.equal(routes.length, 0);
  handler.setReady(true); handler.accept(timer()); handler.setReady(true);
  assert.deepEqual(routes, ['/timer']); assert.equal(consumed.length, 2);
  const planning = { ...timer(), identifier: NOTIFICATION_PREFIX + 'plan', data: notificationData({ owner: 'planning', kind: 'schedule-complete',
    eventId: 'planning:deleted:2', runId: 'deleted', dueAt: 123, stepIndex: 2 }, 'old') };
  handler.accept(planning); assert.deepEqual(routes, ['/timer', '/planning']);
});

test('external responses cannot select arbitrary routes or actions and malformed owned responses are consumed', () => {
  const valid = timer();
  assert.equal(notificationRoute({ ...valid, data: { ...(valid.data as object), url: 'https://bad.invalid', route: '/history' } }), '/timer');
  for (const response of [
    { ...valid, identifier: 'foreign' }, { ...valid, defaultAction: false }, { ...valid, data: null },
    ...[{ version: 2 }, { owner: 'other' }, { kind: 'schedule-step' }, { eventId: 'timer:mismatch' }, { stepIndex: 0 }]
      .map((patch) => ({ ...valid, data: { ...(valid.data as object), ...patch } })),
  ]) assert.equal(notificationRoute(response), null);
  const consumed: string[] = [];
  const handler = createNotificationResponseHandler({ navigate: assert.fail, consume: (id) => consumed.push(id), warn: assert.fail });
  handler.accept({ ...valid, data: {} }); handler.accept({ ...valid, identifier: 'foreign' });
  assert.deepEqual(consumed, [valid.identifier]);
});

test('a navigation failure retains the buffered response for a later ready retry', () => {
  let fails = true, warnings = 0, consumed = 0;
  const routes: string[] = [];
  const handler = createNotificationResponseHandler({ navigate: (route) => { if (fails) throw new Error('not mounted'); routes.push(route); },
    consume: () => consumed++, warn: () => warnings++ });
  handler.setReady(true); handler.accept(timer());
  assert.equal(warnings, 1); assert.equal(consumed, 0);
  fails = false; handler.setReady(true); assert.deepEqual(routes, ['/timer']); assert.equal(consumed, 1);
});
