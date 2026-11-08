import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initialData, restoreData } from '../src/core/stopwatch.ts';
import { LANGUAGES } from '../src/core/language.ts';
import { configureTimer, startTimer, pauseTimer, resumeTimer, resetTimer, completeTimer } from '../src/core/timer.ts';
import { startSchedule, reconcileSchedule } from '../src/core/planning.ts';
import { NOTIFICATION_PREFIX, notificationData } from '../src/core/notifications.ts';
import { createNotificationCoordinator } from '../src/hooks/notificationCoordinator.ts';
import { notificationContent } from '../src/i18n/notificationContent.ts';
import { projectNotificationEvents } from '../src/core/notifications.ts';
import type { NativeNotification, NotificationCapability, NotificationDescriptor, SystemNotificationAdapter } from '../src/hooks/notificationTypes.ts';
import { emptyNotificationDelivery } from '../src/hooks/notificationReadiness.ts';

function fixture(platform: 'android' | 'ios' = 'ios') {
  const f = { data: initialData(), now: 1000, hydration: 'loaded' as 'loading' | 'loaded' | 'failed', id: 0, active: true,
    pending: new Map<string, NativeNotification>(), presented: [] as NativeNotification[], scheduled: [] as { identifier: string; descriptor: NotificationDescriptor }[],
    cancelled: [] as string[], dismissed: [] as string[], warnings: [] as string[],
    capability: { status: 'granted', canSchedule: true, canAsk: false, soundAllowed: true } as NotificationCapability,
    delivery: { ...emptyNotificationDelivery(platform), ...(platform === 'android'
      ? { exactAlarm: 'granted' as const, channel: 'available' as const, channelSound: 'audible' as const } : {}) } };
  f.data.timer = startTimer(configureTimer(f.data.timer, 10000), f.now, 'timer');
  const native: SystemNotificationAdapter = {
    platform, delivery: async () => f.delivery,
    supported: true, exactAlarmSettings: true, prepare: async () => {}, permission: async () => f.capability,
    requestPermission: async () => f.capability,
    pending: async () => [...f.pending.values()], presented: async () => f.presented,
    schedule: async (identifier, descriptor) => {
      f.scheduled.push({ identifier, descriptor });
      f.pending.set(identifier, { identifier, data: notificationData(descriptor.event, descriptor.fingerprint) });
      return identifier;
    },
    cancel: async (identifier) => { f.cancelled.push(identifier); f.pending.delete(identifier); },
    dismiss: async (identifier) => { f.dismissed.push(identifier); },
    listen: () => () => {}, lastResponse: async () => null, clearResponse: async () => {}, openSettings: async () => {},
  };
  const createController = () => createNotificationCoordinator({ getSnapshot: () => f.data, getHydration: () => f.hydration,
    native, now: () => f.now, createId: () => `${++f.id}`, isActive: () => f.active, changed: () => {}, warn: (operation) => f.warnings.push(operation) });
  return { f, native, controller: createController(), createController };
}

test('OS reconciliation reuses equal requests and isolates timer pause from planning', async () => {
  const { f, controller } = fixture();
  f.data.planning.schedules = [{ id: 's', name: 'Study', steps: [{ id: 'a', name: 'Work', durationMs: 20000 }] }];
  f.data.planning = startSchedule(f.data.planning, 's', f.now, 'sequence');
  f.pending.set('foreign', { identifier: 'foreign', data: {} });
  await controller.reconcile(); await controller.reconcile();
  assert.equal(f.scheduled.length, 2); assert.equal(f.cancelled.length, 0);
  f.data.timer = pauseTimer(f.data.timer, 2000); await controller.reconcile();
  assert.deepEqual(f.cancelled, [f.scheduled[0].identifier]);
  assert.ok(f.pending.has('foreign')); assert.ok(f.pending.has(f.scheduled[1].identifier));
  f.data.timer = resumeTimer(f.data.timer, 5000); await controller.reconcile();
  assert.equal(f.scheduled.at(-1)!.descriptor.event.runId, 'timer');
  assert.equal(f.scheduled.at(-1)!.descriptor.event.dueAt, 14000);
});

test('a late registration after pause is cancelled by its exact physical ID', async () => {
  const { f, native, controller } = fixture();
  const original = native.schedule; let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let entered!: () => void; const started = new Promise<void>((resolve) => { entered = resolve; });
  native.schedule = async (...args) => { entered(); await pending; return original(...args); };
  const work = controller.reconcile(); await started;
  f.data.timer = pauseTimer(f.data.timer, 2000); void controller.reconcile(); release(); await work;
  assert.equal(f.pending.size, 0); assert.deepEqual(f.cancelled, [f.scheduled[0].identifier]);
  assert.equal(controller.getState().status, 'ready');
});

test('failed hydration never reads or removes an existing valid OS schedule', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  const identifier = f.scheduled[0].identifier; f.hydration = 'failed';
  let reads = 0; native.pending = async () => { reads++; return []; };
  f.data = initialData(); await controller.reconcile(true);
  assert.equal(reads, 0); assert.ok(f.pending.has(identifier)); assert.equal(f.cancelled.length, 0);
});

test('schedule failures are surfaced and retried only on a new reconciliation', async () => {
  const { f, native, controller } = fixture(); const original = native.schedule; let calls = 0;
  native.schedule = async () => { calls++; throw new Error('unavailable'); };
  await controller.reconcile(); assert.equal(calls, 1); assert.equal(controller.getState().status, 'failed');
  assert.deepEqual(f.warnings, ['schedule']);
  native.schedule = original; await controller.reconcile();
  assert.equal(f.pending.size, 1); assert.equal(controller.getState().status, 'ready');
});

test('disposing leaves armed requests intact but cancels an in-flight stale result', async () => {
  const { f, controller } = fixture(); await controller.reconcile(); controller.dispose();
  assert.equal(f.pending.size, 1);
  const other = fixture(); let release!: () => void; let entered!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const original = other.native.schedule;
  other.native.schedule = async (...args) => { entered(); await gate; return original(...args); };
  const work = other.controller.reconcile(); await started; other.controller.dispose(); release(); await work;
  assert.equal(other.f.pending.size, 0);
  assert.ok(other.f.cancelled[0].startsWith(NOTIFICATION_PREFIX));
});

test('fifty cumulative actions plus a timer retain future registrations through real catch-up', async () => {
  const { f, controller } = fixture();
  f.data.planning.schedules = [{ id: 's', name: 'Учёба · Școală', steps: Array.from({ length: 50 }, (_, i) => ({ id: `a${i}`, name: `Action ${i}`, durationMs: 1000 })) }];
  f.data.planning = startSchedule(f.data.planning, 's', f.now, 'max');
  await controller.reconcile(); assert.equal(f.scheduled.length, 51);
  assert.equal(f.scheduled.filter(({ descriptor }) => descriptor.event.kind === 'schedule-complete').length, 1);
  const timer = f.scheduled.find(({ descriptor }) => descriptor.event.owner === 'timer')!;
  const simultaneous = f.scheduled.find(({ descriptor }) => descriptor.event.owner === 'planning' && descriptor.event.dueAt === timer.descriptor.event.dueAt);
  assert.ok(simultaneous); assert.notEqual(timer.identifier, simultaneous.identifier);
  f.now = 4500; f.data.planning = reconcileSchedule(f.data.planning, f.now).state;
  await controller.reconcile();
  assert.equal(f.scheduled.length, 51); assert.equal(f.cancelled.length, 3); assert.equal(f.pending.size, 48);
  assert.equal(f.data.planning.run!.stepIndex, 3);
  assert.equal(f.data.planning.run!.deadlineAt, 5000);
});

test('locale and sound change content without changing clocks; unrelated preferences cause no churn', async () => {
  const { f, controller } = fixture(); await controller.reconcile();
  const clocks = JSON.stringify([f.data.timer, f.data.planning]);
  f.data.preferences = { ...f.data.preferences, theme: 'dark', haptics: false, keepAwake: false, alertDurationSeconds: 30 };
  await controller.reconcile(); assert.equal(f.scheduled.length, 1); assert.equal(f.cancelled.length, 0);
  const startingLanguage = f.data.preferences.language;
  const otherLanguages = LANGUAGES.map(({ id }) => id).filter((id) => id !== startingLanguage);
  for (const language of [...otherLanguages, startingLanguage]) {
    f.data.preferences.language = language; await controller.reconcile();
    assert.equal(f.pending.size, 1);
    assert.equal(f.scheduled.at(-1)!.descriptor.event.dueAt, 11000);
  }
  for (const alertSoundId of ['bell', 'digital', 'gong', 'classic'] as const) {
    f.data.preferences.alertSoundId = alertSoundId; await controller.reconcile();
    assert.match(f.scheduled.at(-1)!.descriptor.channelId, new RegExp(alertSoundId));
  }
  f.data.preferences.timerSound = false; await controller.reconcile();
  assert.equal(f.scheduled.at(-1)!.descriptor.sound, false); assert.equal(f.pending.size, 1);
  assert.equal(new Set(f.scheduled.map(({ identifier }) => identifier)).size, f.scheduled.length);
  assert.equal(JSON.stringify([f.data.timer, f.data.planning]), clocks);
});

test('rapid Spanish French German updates discard delayed registrations without permission or event changes', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  const first = f.scheduled[0], gate = deferred<void>(), entered = deferred<void>(), schedule = native.schedule;
  let prompts = 0; native.requestPermission = async () => { prompts++; return f.capability; };
  native.schedule = async (...args) => { entered.resolve(); await gate.promise; return schedule(...args); };
  f.data.preferences.language = 'es'; const work = controller.reconcile(); await entered.promise;
  f.data.preferences.language = 'fr'; void controller.reconcile();
  f.data.preferences.language = 'de'; void controller.reconcile(); gate.resolve(); await work;
  const latest = f.scheduled.at(-1)!;
  assert.equal(f.pending.size, 1); assert.ok(f.pending.has(latest.identifier));
  assert.notEqual(latest.identifier, first.identifier);
  assert.deepEqual(latest.descriptor.event, first.descriptor.event);
  assert.equal(latest.descriptor.channelId, first.descriptor.channelId);
  assert.equal(JSON.parse(latest.descriptor.fingerprint)[0], notificationContent(latest.descriptor.event, f.data.preferences).fingerprint);
  assert.notEqual(latest.descriptor.fingerprint, first.descriptor.fingerprint);
  assert.deepEqual(f.cancelled, [first.identifier, f.scheduled[1].identifier]);
  assert.equal(prompts, 0);
  f.now = 12000;
  for (const language of ['es', 'fr', 'de'] as const) { f.data.preferences.language = language; await controller.reconcile(); }
  assert.equal(f.pending.size, 0); assert.equal(f.scheduled.length, 3);
});

test('new languages preserve opt-out and muted state and never request denied permissions', async () => {
  for (const language of ['es', 'fr', 'de'] as const) {
    const { f, native, controller } = fixture(); let prompts = 0;
    native.requestPermission = async () => { prompts++; return f.capability; };
    f.data.preferences.language = language; f.data.preferences.timerSound = false;
    await controller.reconcile();
    assert.equal(f.scheduled[0].descriptor.sound, false);
    assert.equal(f.scheduled[0].descriptor.channelId, 'crono.alerts.silent.v1');
    f.data.preferences.systemNotifications = false; await controller.reconcile(); assert.equal(f.pending.size, 0);
    f.data.preferences.systemNotifications = true;
    f.capability = { status: 'denied', canSchedule: false, canAsk: false, soundAllowed: false };
    await controller.reconcile(true); assert.equal(f.pending.size, 0); assert.equal(prompts, 0);
    assert.equal(f.data.preferences.timerSound, false);
  }
});

test('the literal legacy snapshot projects no retrospective alert and retains clocks/history/false settings', async () => {
  const { f, controller } = fixture();
  const legacy = JSON.parse(readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  f.data = restoreData(JSON.stringify(legacy)); const before = JSON.stringify(f.data);
  await controller.reconcile();
  assert.equal(f.scheduled.length, 0); assert.equal(JSON.stringify(f.data), before);
  assert.deepEqual(f.data.stopwatch, legacy.stopwatch); assert.deepEqual(f.data.sessions, legacy.sessions);
  assert.equal(f.data.preferences.systemNotifications, true); assert.equal(f.data.preferences.timerSound, false);
  f.data.timer = startTimer(configureTimer(f.data.timer, 1000), f.now, 'new'); await controller.reconcile();
  assert.equal(f.scheduled.length, 1); assert.equal(f.scheduled[0].descriptor.sound, false);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('a stale initial permission query cannot remove valid requests while a user permission query is pending', async () => {
  const { f, native, controller } = fixture();
  const descriptor = notificationContent(projectNotificationEvents(f.data, f.now)[0], f.data.preferences);
  const identifier = NOTIFICATION_PREFIX + 'previous-session';
  f.pending.set(identifier, { identifier, data: notificationData(descriptor.event, JSON.stringify([descriptor.fingerprint, 'date-v2', 'not-required'])) });
  const initial = deferred<NotificationCapability>(), gesture = deferred<NotificationCapability>(); let queries = 0;
  native.permission = () => { queries++; return queries === 1 ? initial.promise : queries === 2 ? gesture.promise : Promise.resolve(f.capability); };
  const first = controller.reconcile(); const request = controller.requestPermission();
  initial.resolve(f.capability); await first;
  await controller.reconcile();
  assert.deepEqual(f.cancelled, []); assert.ok(f.pending.has(identifier));
  gesture.resolve(f.capability); await request;
  assert.equal(f.scheduled.length, 0); assert.equal(controller.getState().status, 'ready');
});

test('an elapsed pending request cannot be revived by clock rollback in the same session', async () => {
  const { f, controller } = fixture(); await controller.reconcile();
  f.now = 11000; await controller.reconcile(); assert.equal(f.pending.size, 0);
  f.now = 10000; await controller.reconcile();
  assert.equal(f.scheduled.length, 1); assert.equal(f.pending.size, 0);
});

test('failed cancellation blocks replacements for its owner while preserving the independent owner', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  const old = f.scheduled[0].identifier, cancel = native.cancel;
  native.cancel = async () => { throw new Error('blocked'); };
  f.data.timer = resumeTimer(pauseTimer(f.data.timer, 2000), 5000);
  f.data.planning.schedules = [{ id: 's', name: 'Plan', steps: [{ id: 'a', name: 'A', durationMs: 20000 }] }];
  f.data.planning = startSchedule(f.data.planning, 's', f.now, 'sequence');
  await controller.reconcile();
  assert.equal(controller.getState().status, 'failed'); assert.ok(f.pending.has(old));
  assert.deepEqual(f.scheduled.map(({ descriptor }) => descriptor.event.owner), ['timer', 'planning']);
  assert.deepEqual(f.warnings, ['cancel']);
  native.cancel = cancel; await controller.reconcile();
  assert.equal(controller.getState().status, 'ready'); assert.equal(f.pending.size, 2);
  assert.equal(f.scheduled.at(-1)!.descriptor.event.dueAt, 14000);
});

test('inventory and channel failures retain armed requests, use bounded retries and recover explicitly', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  const pending = native.pending; let reads = 0;
  native.pending = async () => { reads++; throw new Error('inventory unavailable'); };
  await controller.reconcile(); assert.equal(reads, 1); assert.equal(f.cancelled.length, 0);
  assert.equal(controller.getState().status, 'failed');
  native.pending = pending; native.prepare = async () => { throw new Error('channel unavailable'); };
  f.data.preferences.language = 'en'; await controller.reconcile();
  assert.equal(f.pending.size, 1); assert.equal(f.cancelled.length, 0);
  assert.equal(controller.getState().status, 'failed'); assert.deepEqual(f.warnings, ['inventory', 'channels']);
  native.prepare = async () => {}; await controller.reconcile();
  assert.equal(f.pending.size, 1); assert.equal(controller.getState().status, 'ready');
});

test('a rejected registration that persisted natively is cleaned by the supplied exact ID', async () => {
  const { f, native, controller } = fixture(); const schedule = native.schedule;
  native.schedule = async (...args) => { await schedule(...args); throw new Error('late native error'); };
  await controller.reconcile(); assert.equal(controller.getState().status, 'failed');
  assert.equal(f.pending.size, 0); assert.deepEqual(f.cancelled, [f.scheduled[0].identifier]);
});

test('rapid ro to en to ru to ro changes cannot cancel the final unique registration', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  const first = f.scheduled[0].identifier, gate = deferred<void>(), entered = deferred<void>(), schedule = native.schedule;
  native.schedule = async (...args) => { entered.resolve(); await gate.promise; return schedule(...args); };
  f.data.preferences.language = 'en'; const work = controller.reconcile(); await entered.promise;
  f.data.preferences.language = 'ru'; void controller.reconcile();
  f.data.preferences.language = 'ro'; void controller.reconcile(); gate.resolve(); await work;
  assert.equal(f.pending.size, 1); assert.equal(f.scheduled.length, 3);
  const latest = f.scheduled.at(-1)!;
  assert.notEqual(latest.identifier, first); assert.ok(f.pending.has(latest.identifier));
  assert.deepEqual(f.cancelled, [first, f.scheduled[1].identifier]);
  assert.equal(latest.descriptor.fingerprint, f.scheduled[0].descriptor.fingerprint);
});

test('first-use permission is gesture-only and coalesced; a dialog outliving expiry cannot notify retrospectively', async () => {
  const { f, native, controller } = fixture();
  f.capability = { status: 'unknown', canSchedule: false, canAsk: true, soundAllowed: false };
  const gate = deferred<NotificationCapability>(), entered = deferred<void>(); let prompts = 0;
  native.requestPermission = async () => { prompts++; entered.resolve(); return gate.promise; };
  await controller.reconcile(); assert.equal(prompts, 0);
  const one = controller.requestPermission(), two = controller.requestPermission(); await entered.promise;
  assert.equal(prompts, 1); f.now = 12000;
  f.capability = { status: 'granted', canSchedule: true, canAsk: false, soundAllowed: true }; gate.resolve(f.capability);
  await Promise.all([one, two]); assert.equal(f.scheduled.length, 0);
  f.capability = { status: 'denied', canSchedule: false, canAsk: false, soundAllowed: false };
  await controller.requestPermission(true); assert.equal(prompts, 1);
});

test('Android requestable denial prompts on a gesture once, with explicit retry after refusal', async () => {
  const { f, native, controller } = fixture();
  f.capability = { status: 'denied', canSchedule: false, canAsk: true, soundAllowed: false };
  let prompts = 0;
  native.requestPermission = async () => { prompts++; return f.capability; };
  await controller.reconcile(true);
  assert.equal(prompts, 0, 'hydration/refresh must never prompt');
  await controller.requestPermission();
  assert.equal(prompts, 1, 'an accepted start can request denied/requestable permission');
  await controller.requestPermission();
  assert.equal(prompts, 1, 'a refusal suppresses repeated implicit prompts');
  await controller.requestPermission(true);
  assert.equal(prompts, 2, 'explicit Settings retry remains available');
  f.capability = { ...f.capability, canAsk: false };
  await controller.requestPermission(true);
  assert.equal(prompts, 2, 'permanent denial needs system Settings');
});

test('a permission read outliving the Home handoff cannot launch a background prompt', async () => {
  const { f, native, controller } = fixture();
  f.capability = { status: 'denied', canSchedule: false, canAsk: true, soundAllowed: false };
  const gate = deferred<NotificationCapability>(); let prompts = 0;
  native.permission = () => gate.promise;
  native.requestPermission = async () => { prompts++; return f.capability; };
  const work = controller.requestPermission(); f.active = false;
  gate.resolve(f.capability); await work;
  await controller.requestPermission(true); assert.equal(prompts, 0);
  f.active = true; await controller.requestPermission(); assert.equal(prompts, 1);
});

test('limited iOS permission is requested only by an explicit Settings gesture', async () => {
  const { f, native, controller } = fixture();
  f.capability = { status: 'limited', canSchedule: true, canAsk: true, soundAllowed: false };
  let prompts = 0;
  native.requestPermission = async () => { prompts++; return f.capability; };
  await controller.reconcile(true); await controller.requestPermission();
  assert.equal(prompts, 0);
  await controller.requestPermission(true); assert.equal(prompts, 1);
});

test('Android cold hydration rearms persisted requests once, without treating inventory as proof of an armed alarm', async () => {
  const { f, controller, createController } = fixture('android');
  await controller.reconcile(); const old = f.scheduled[0]; controller.dispose();
  const restarted = createController(); await restarted.reconcile(true);
  assert.deepEqual(f.cancelled, [old.identifier]);
  assert.equal(f.pending.size, 1); assert.equal(f.scheduled.length, 2);
  assert.deepEqual(f.scheduled[1].descriptor.event, old.descriptor.event);
  await restarted.reconcile(true); await restarted.reconcile();
  assert.equal(f.scheduled.length, 2, 'unchanged refresh does not churn requests');
});

test('Android exact-access changes replace both owners without moving semantic deadlines', async () => {
  const { f, controller } = fixture('android');
  f.delivery.exactAlarm = 'denied';
  f.data.planning.schedules = [{ id: 's', name: 'Study', steps: [{ id: 'a', name: 'Work', durationMs: 20000 }] }];
  f.data.planning = startSchedule(f.data.planning, 's', f.now, 'sequence');
  const snapshot = JSON.stringify(f.data);
  await controller.reconcile(); const initial = [...f.scheduled];
  f.delivery = { ...f.delivery, exactAlarm: 'granted' }; await controller.reconcile(true);
  assert.equal(f.pending.size, 2); assert.equal(f.scheduled.length, 4);
  assert.deepEqual(f.cancelled, initial.map(({ identifier }) => identifier));
  assert.deepEqual(f.scheduled.slice(2).map(({ descriptor }) => descriptor.event), initial.map(({ descriptor }) => descriptor.event));
  assert.equal(JSON.stringify(f.data), snapshot);
  await controller.reconcile(true); assert.equal(f.scheduled.length, 4);
  f.delivery = { ...f.delivery, exactAlarm: 'denied' }; await controller.reconcile(true);
  assert.equal(f.scheduled.length, 6); assert.equal(f.pending.size, 2);
});

test('failed optional access reads leave existing alarms intact and expose unknown capability', async () => {
  const { f, native, controller } = fixture('android'); await controller.reconcile();
  const original = native.delivery, id = f.scheduled[0].identifier;
  native.delivery = async () => { throw Error('access unavailable'); };
  await controller.reconcile(true);
  assert.ok(f.pending.has(id)); assert.deepEqual(f.cancelled, []); assert.equal(f.scheduled.length, 1);
  assert.equal(controller.getState().delivery.exactAlarm, 'unknown');
  assert.equal(controller.getState().status, 'ready'); assert.deepEqual(f.warnings, ['delivery']);
  native.delivery = original; await controller.reconcile(true); assert.equal(f.scheduled.length, 1);
});

test('late capability observations cannot revive a paused run or an opted-out request', async () => {
  const { f, native, controller } = fixture('android'); await controller.reconcile();
  const gate = deferred<ReturnType<typeof emptyNotificationDelivery>>(), entered = deferred<void>();
  const original = native.delivery;
  native.delivery = async () => { entered.resolve(); return gate.promise; };
  const work = controller.reconcile(true); await entered.promise;
  f.data.timer = pauseTimer(f.data.timer, 2000); f.data.preferences.systemNotifications = false;
  void controller.reconcile(); native.delivery = original;
  gate.resolve({ ...f.delivery, exactAlarm: 'denied' }); await work;
  assert.equal(f.pending.size, 0); assert.equal(f.scheduled.length, 1);
  assert.notEqual(controller.getState().delivery.exactAlarm, 'denied');
});

test('a user-blocked channel remains blocked without changing IDs or losing the native request', async () => {
  const { f, controller } = fixture('android'); await controller.reconcile();
  const first = f.scheduled[0]; f.delivery = { ...f.delivery, channel: 'blocked', channelSound: 'silent' };
  await controller.reconcile(true);
  assert.equal(f.scheduled.length, 1); assert.ok(f.pending.has(first.identifier));
  assert.equal(controller.getState().delivery.channel, 'blocked');
});

test('a deadline crossed in native preparation skips registration without a false failure', async () => {
  const { f, native, controller } = fixture();
  let attempts = 0;
  native.schedule = async () => { attempts++; f.now = 12000; return null; };
  await controller.reconcile();
  assert.equal(f.pending.size, 0); assert.equal(controller.getState().status, 'ready');
  assert.deepEqual(f.warnings, []);
  f.now = 1000; await controller.reconcile();
  assert.equal(attempts, 1, 'clock rollback cannot revive the skipped completion');
});

test('a literal legacy snapshot can start future silent alerts without changing history, false preferences or old deadlines', async () => {
  const { f, controller } = fixture('android');
  const raw = readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  f.data = restoreData(raw);
  const saved = JSON.stringify([f.data.stopwatch, f.data.sessions, f.data.preferences]);
  await controller.reconcile(); assert.equal(f.pending.size, 0, 'completed legacy timer is not replayed');
  f.data = { ...f.data, timer: startTimer(configureTimer(resetTimer(f.data.timer), 10000), f.now, 'legacy-future') };
  await controller.reconcile();
  const registration = f.scheduled[0]; assert.equal(f.pending.size, 1);
  assert.equal(registration.descriptor.event.dueAt, 11000);
  assert.equal(registration.descriptor.sound, false); assert.match(registration.descriptor.channelId, /silent/);
  f.now = 12000;
  f.data = { ...f.data, timer: completeTimer(f.data.timer, f.now) }; await controller.reconcile();
  assert.equal(f.pending.size, 0); assert.equal(f.scheduled.length, 1);
  assert.equal(JSON.stringify([f.data.stopwatch, f.data.sessions, f.data.preferences]), saved);
});

test('delivered and duplicate receipt metadata are consumed; reset dismisses only the replaced owned run', async () => {
  const { f, controller } = fixture(); await controller.reconcile();
  const delivered = [...f.pending.values()][0]; f.pending.clear(); f.presented = [delivered, { identifier: 'foreign', data: {} }];
  await controller.reconcile(); controller.received(delivered); await controller.reconcile();
  assert.equal(f.scheduled.length, 1); assert.deepEqual(f.dismissed, []);
  f.data.timer = initialData().timer; await controller.reconcile();
  assert.deepEqual(f.dismissed, [delivered.identifier]);
});

test('permission revocation during a registration removes its late result before reporting ready', async () => {
  const { f, native, controller } = fixture(); const gate = deferred<void>(), entered = deferred<void>(), schedule = native.schedule;
  native.schedule = async (...args) => { entered.resolve(); await gate.promise; return schedule(...args); };
  const work = controller.reconcile(); await entered.promise;
  f.capability = { status: 'denied', canSchedule: false, canAsk: false, soundAllowed: false };
  void controller.reconcile(true); gate.resolve(); await work;
  assert.equal(f.pending.size, 0); assert.equal(f.cancelled.length, 1);
  assert.equal(controller.getState().capability.status, 'denied'); assert.equal(controller.getState().status, 'ready');
});

test('late inventory is ignored after failed hydration and foreign namespace data is never removed', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  const owned = [...f.pending.values()][0]; f.pending.set('foreign', { ...owned, identifier: 'foreign' });
  f.pending.set(NOTIFICATION_PREFIX + 'malformed', { identifier: NOTIFICATION_PREFIX + 'malformed', data: {} });
  const gate = deferred<NativeNotification[]>(), entered = deferred<void>();
  native.pending = async () => { entered.resolve(); return gate.promise; };
  const work = controller.reconcile(); await entered.promise;
  f.hydration = 'failed'; f.data = initialData(); gate.resolve([...f.pending.values()]); await work;
  assert.equal(f.cancelled.length, 0); assert.equal(f.pending.size, 3);
});

test('delayed native cancellation keeps the resumed deadline and independent schedule armed', { timeout: 1000 }, async () => {
  const { f, native, controller } = fixture();
  f.data.planning.schedules = [{ id: 's', name: 'Study', steps: [{ id: 'a', name: 'Work', durationMs: 20000 }] }];
  f.data.planning = startSchedule(f.data.planning, 's', f.now, 'sequence');
  await controller.reconcile();
  const originalTimer = f.scheduled.find(({ descriptor }) => descriptor.event.owner === 'timer')!;
  const originalPlanning = f.scheduled.find(({ descriptor }) => descriptor.event.owner === 'planning')!;
  const cancel = native.cancel, entered = deferred<void>(), release = deferred<void>();
  native.cancel = async (identifier) => { entered.resolve(); await release.promise; return cancel(identifier); };

  f.now = 2000; f.data.timer = pauseTimer(f.data.timer, f.now);
  const work = controller.reconcile(); await entered.promise;
  f.now = 5000; f.data.timer = resumeTimer(f.data.timer, f.now);
  const expected = JSON.stringify(f.data);
  void controller.reconcile(); release.resolve(); await work;

  const resumed = f.scheduled.find(({ descriptor }) => descriptor.event.owner === 'timer' && descriptor.event.dueAt === 14000)!;
  assert.ok(resumed, 'The resumed timer must use its new deadline');
  assert.equal(resumed.descriptor.event.runId, originalTimer.descriptor.event.runId);
  assert.notEqual(resumed.identifier, originalTimer.identifier);
  assert.deepEqual(f.cancelled, [originalTimer.identifier]);
  assert.deepEqual(new Set(f.pending.keys()), new Set([resumed.identifier, originalPlanning.identifier]));
  assert.equal(f.scheduled.length, 3, 'The independent schedule must retain its original registration');
  assert.equal(JSON.stringify(f.data), expected, 'Native reconciliation must not mutate clock state');
  assert.equal(controller.getState().status, 'ready'); assert.deepEqual(f.warnings, []);
});

test('delayed channel preparation uses the latest reset and replacement snapshot', { timeout: 1000 }, async () => {
  const { f, native, controller } = fixture();
  f.data.planning.schedules = [
    { id: 'old', name: 'Old plan', steps: [{ id: 'a', name: 'Work', durationMs: 20000 }] },
    { id: 'new', name: 'New plan', steps: [{ id: 'b', name: 'Rest', durationMs: 6000 }] },
  ];
  f.data.planning = startSchedule(f.data.planning, 'old', f.now, 'old-sequence');
  await controller.reconcile();
  const obsolete = f.scheduled.map(({ identifier }) => identifier);
  const entered = deferred<void>(), release = deferred<void>();
  native.prepare = async () => { entered.resolve(); await release.promise; };
  f.data.preferences.language = 'en';
  const work = controller.reconcile(); await entered.promise;

  f.now = 2000; f.data.timer = resetTimer(f.data.timer);
  f.data.planning = startSchedule(f.data.planning, 'new', f.now, 'replacement', true);
  const expected = JSON.stringify(f.data);
  void controller.reconcile(); release.resolve(); await work;

  assert.equal(f.scheduled.length, 3, 'Only the replacement run should receive a new registration');
  const replacement = f.scheduled.at(-1)!;
  assert.equal(replacement.descriptor.event.owner, 'planning');
  assert.equal(replacement.descriptor.event.runId, 'replacement');
  assert.equal(replacement.descriptor.event.dueAt, 8000);
  assert.deepEqual(new Set(f.cancelled), new Set(obsolete));
  assert.deepEqual([...f.pending.keys()], [replacement.identifier]);
  assert.equal(JSON.stringify(f.data), expected, 'Reset and replacement state must remain unchanged');
  assert.equal(controller.getState().status, 'ready'); assert.deepEqual(f.warnings, []);
});

test('late registration for a replaced run cannot remove its replacement request', { timeout: 1000 }, async () => {
  const { f, native, controller } = fixture();
  const schedule = native.schedule, entered = deferred<void>(), release = deferred<void>();
  native.schedule = async (...args) => {
    const identifier = await schedule(...args);
    entered.resolve(); await release.promise;
    return identifier;
  };
  const work = controller.reconcile(); await entered.promise;
  const obsolete = f.scheduled[0];
  assert.ok(f.pending.has(obsolete.identifier), 'Model native persistence before the registration promise settles');
  f.now = 2000;
  f.data.timer = startTimer(configureTimer(resetTimer(f.data.timer), 20000), f.now, 'replacement');
  const expected = JSON.stringify(f.data);
  void controller.reconcile(); release.resolve(); await work;

  assert.equal(f.scheduled.length, 2);
  const replacement = f.scheduled[1];
  assert.notEqual(replacement.identifier, obsolete.identifier);
  assert.equal(replacement.descriptor.event.runId, 'replacement');
  assert.equal(replacement.descriptor.event.dueAt, 22000);
  assert.deepEqual(f.cancelled, [obsolete.identifier]);
  assert.deepEqual([...f.pending.keys()], [replacement.identifier]);
  assert.equal(JSON.stringify(f.data), expected, 'A stale native result cannot alter the replacement timer');
  assert.equal(controller.getState().status, 'ready'); assert.deepEqual(f.warnings, []);
});
