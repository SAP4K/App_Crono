import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialData } from '../src/core/stopwatch.ts';
import { startTimer, configureTimer, pauseTimer, resumeTimer } from '../src/core/timer.ts';
import { startSchedule } from '../src/core/planning.ts';
import { notificationData, notificationEventKey, ownedNotificationData, projectNotificationEvents, readNotificationData, NOTIFICATION_PREFIX } from '../src/core/notifications.ts';
import { notificationCapability } from '../src/hooks/notificationTypes.ts';
import { notificationContent } from '../src/i18n/notificationContent.ts';
import { systemNotifications as webNotifications } from '../src/hooks/systemNotifications.web.ts';

function running() {
  const data = initialData();
  data.timer = startTimer(configureTimer(data.timer, 1000), 1000, 'timer');
  data.planning.schedules = [{ id: 's', name: 'Учёба · Școală', steps: [1000, 2000, 3000].map((durationMs, i) => ({ id: `a${i}`, name: `Etapa ${i}`, durationMs })) }];
  data.planning = startSchedule(data.planning, 's', 1000, 'sequence');
  return data;
}

test('future notifications use cumulative deadlines with one final event and independent timer', () => {
  const data = running(); const before = JSON.stringify(data);
  const events = projectNotificationEvents(data, 1500);
  assert.deepEqual(events.map(({ kind, dueAt }) => [kind, dueAt]), [['schedule-step', 2000], ['timer-complete', 2000], ['schedule-step', 4000], ['schedule-complete', 7000]]);
  assert.deepEqual(projectNotificationEvents(data, 4000).map(({ kind, dueAt }) => [kind, dueAt]), [['schedule-complete', 7000]]);
  assert.deepEqual(projectNotificationEvents(data, 7000), []);
  assert.equal(JSON.stringify(data), before);
});

test('notification projection respects opt-out paused states and same-run resumed deadline', () => {
  const data = running(); const original = projectNotificationEvents(data, 1100).find(({ owner }) => owner === 'timer')!;
  data.timer = pauseTimer(data.timer, 1200);
  assert.equal(projectNotificationEvents(data, 1300).filter(({ owner }) => owner === 'timer').length, 0);
  data.timer = resumeTimer(data.timer, 5000);
  const resumed = projectNotificationEvents(data, 5000).find(({ owner }) => owner === 'timer')!;
  assert.equal(resumed.eventId, original.eventId); assert.notEqual(notificationEventKey(resumed), notificationEventKey(original));
  data.preferences.systemNotifications = false; assert.deepEqual(projectNotificationEvents(data, 5000), []);
  assert.deepEqual(projectNotificationEvents(initialData(), 0), []);
  assert.deepEqual(projectNotificationEvents(running(), NaN), []);
});

test('a one-action run emits only completion and fifty actions plus timer stay bounded', () => {
  const data = running();
  data.planning.schedules[0].steps = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, name: `${i}`, durationMs: 86399000 }));
  data.planning = startSchedule({ ...data.planning, run: null }, 's', 0, 'max');
  const events = projectNotificationEvents(data, 0);
  assert.equal(events.length, 51); assert.equal(events.filter(({ kind }) => kind === 'schedule-complete').length, 1);
  data.planning.schedules[0].steps = data.planning.schedules[0].steps.slice(0, 1);
  data.planning = startSchedule({ ...data.planning, run: null }, 's', 0, 'one');
  assert.deepEqual(projectNotificationEvents(data, 3000).map(({ kind }) => kind), ['schedule-complete']);
});

test('notification payload validation requires owned namespace and coherent bounded semantic IDs', () => {
  for (const event of projectNotificationEvents(running(), 1500)) {
    const data = notificationData(event, 'content');
    assert.deepEqual(readNotificationData(data), data);
    assert.deepEqual(ownedNotificationData(NOTIFICATION_PREFIX + 'id', data), data);
    assert.equal(ownedNotificationData('foreign', data), null);
    for (const patch of [{ version: 2 }, { app: 'other' }, { dueAt: Infinity }, { runId: '' }, { eventId: 'wrong' }, { fingerprint: 'x'.repeat(4001) }]) {
      assert.equal(readNotificationData({ ...data, ...patch }), null);
    }
  }
  const event = projectNotificationEvents(running(), 1500).find(({ owner }) => owner === 'planning')!;
  for (const stepIndex of [-1, 50, 1.5, '0']) assert.equal(readNotificationData({ ...notificationData(event, ''), stepIndex }), null);
});

test('notification permissions distinguish undetermined denied and granular iOS capabilities', () => {
  const unknown = { status: 'undetermined', granted: false, canAskAgain: true };
  assert.equal(notificationCapability(unknown).canAsk, true);
  assert.equal(notificationCapability({ ...unknown, status: 'denied' }).canAsk, false);
  assert.equal(notificationCapability({ ...unknown, status: 'granted', granted: true }).canSchedule, true);
  const ios = { status: 2, allowsAlert: true, allowsSound: true, allowsDisplayOnLockScreen: true };
  assert.equal(notificationCapability({ ...unknown, ios }).status, 'granted');
  for (const status of [3, 4]) assert.equal(notificationCapability({ ...unknown, ios: { ...ios, status } }).status, 'limited');
  const limited = notificationCapability({ ...unknown, ios: { ...ios, allowsSound: false } });
  assert.equal(limited.canSchedule, true); assert.equal(limited.soundAllowed, false); assert.equal(limited.status, 'limited');
  assert.equal(notificationCapability({ ...unknown, granted: true, ios: { ...ios, status: 1 } }).canSchedule, false);
});

test('localized notification content retains user names and sound policy independent of duration', () => {
  const data = running(); const event = projectNotificationEvents(data, 1500).find(({ owner }) => owner === 'planning')!;
  for (const language of ['ro', 'en', 'ru'] as const) for (const alertSoundId of ['classic', 'bell', 'digital', 'gong'] as const) {
    const preferences = { ...data.preferences, language, alertSoundId };
    const content = notificationContent(event, preferences);
    assert.ok(content.body.includes(event.stepName!)); assert.ok(content.body.includes(event.nextStepName!));
    assert.equal(content.fingerprint, notificationContent(event, { ...preferences, alertDurationSeconds: 30 }).fingerprint);
    const silent = notificationContent(event, { ...preferences, timerSound: false });
    assert.equal(silent.sound, false); assert.match(silent.channelId, /silent/);
    assert.notEqual(silent.fingerprint, content.fingerprint);
  }
});

test('web adapter reports unsupported without calling any browser permission API', async () => {
  assert.equal(webNotifications.supported, false);
  assert.equal((await webNotifications.permission()).status, 'unsupported');
  assert.equal((await webNotifications.requestPermission('ro')).canAsk, false);
  assert.deepEqual(await webNotifications.pending(), []);
  assert.deepEqual(await webNotifications.presented(), []);
  assert.equal(await webNotifications.lastResponse(), null);
});
