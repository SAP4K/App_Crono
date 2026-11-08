import assert from 'node:assert/strict';
import test from 'node:test';
import { initialData } from '../src/core/stopwatch.ts';
import { startTimer, configureTimer, resetTimer, pauseTimer, resumeTimer } from '../src/core/timer.ts';
import type { CompletionPolicy } from '../src/core/completionAlerts.ts';
import { createNativeAlertPlayback } from '../src/hooks/nativeAlertPlayback.ts';
import { notificationData } from '../src/core/notifications.ts';
import { completionNotificationAdapter } from '../src/hooks/completionNotificationAdapter.ts';
import { createNotificationCoordinator } from '../src/hooks/notificationCoordinator.ts';
import { emptyNotificationDelivery } from '../src/hooks/notificationReadiness.ts';
import type { CompletionNative } from '../src/hooks/completionAlerts.types.ts';
import type { NativeNotification, SystemNotificationAdapter } from '../src/hooks/notificationTypes.ts';

function fixture() {
  const f = { data: initialData(), capable: true, id: 0, warnings: [] as string[], nativeCalls: [] as string[], ordinaryCalls: [] as string[],
    ordinary: new Map<string, NativeNotification>(), extended: new Map<string, NativeNotification>(),
    listeners: new Map<string, (value: unknown) => void>() };
  f.data.timer = startTimer(configureTimer(f.data.timer, 10000), 1000, 'run');
  const base: SystemNotificationAdapter = {
    platform: 'android', supported: true, exactAlarmSettings: true,
    delivery: async () => ({ ...emptyNotificationDelivery('android'), exactAlarm: 'granted', channel: 'available', channelSound: 'audible' }),
    prepare: async () => {}, permission: async () => ({ status: 'granted', canSchedule: true, canAsk: false, soundAllowed: true }),
    requestPermission: async () => null,
    pending: async () => [...f.ordinary.values()], presented: async () => [],
    schedule: async (identifier, descriptor) => { f.ordinaryCalls.push(identifier); f.ordinary.set(identifier, { identifier, data: notificationData(descriptor.event, descriptor.fingerprint) }); return identifier; },
    cancel: async (identifier) => { f.ordinary.delete(identifier); }, dismiss: async () => {},
    listen: () => () => {}, lastResponse: async () => null, clearResponse: async () => {}, openSettings: async () => {},
  };
  const native: CompletionNative = {
    protocolVersion: 1, capableAsync: async () => f.capable,
    upsertAsync: async (identifier, descriptor) => { f.nativeCalls.push(identifier); f.extended.set(identifier, { identifier, data: notificationData(descriptor.event, descriptor.fingerprint) }); return identifier; },
    pendingAsync: async () => [...f.extended.values()], presentedAsync: async () => [], cancelAsync: async (identifier) => { f.extended.delete(identifier); },
    dismissAsync: async () => {}, requestPlaybackAsync: async () => false, stopPlaybackAsync: async () => {}, setPolicyAsync: async () => {},
    snapshotAsync: async () => ({ status: 'idle', request: null, generation: 0, revision: 0, error: false, startedAt: null, remainingMs: 0 }),
    lastResponseAsync: async () => null, clearResponseAsync: async () => {},
    addListener: (event, listener) => { f.listeners.set(event, listener as (value: unknown) => void); return { remove: () => { f.listeners.delete(event); } }; },
  };
  const adapter = completionNotificationAdapter(base, native, () => f.warnings.push('capability'));
  const controller = createNotificationCoordinator({ native: adapter, getSnapshot: () => f.data, getHydration: () => 'loaded',
    now: () => 1000, isActive: () => true, createId: () => `${++f.id}`, changed: () => {}, warn: (operation) => f.warnings.push(operation) });
  return { f, base, native, adapter, controller };
}

test('actual composed adapter migrates transports and rearms native duration without duplicate SDK sound', async () => {
  const { f, controller } = fixture();
  await controller.reconcile(); assert.equal(f.nativeCalls.length, 1); assert.equal(f.ordinaryCalls.length, 0);
  f.data = { ...f.data, preferences: { ...f.data.preferences, alertDurationSeconds: 15 } };
  await controller.reconcile(); assert.equal(f.nativeCalls.length, 2); assert.equal(f.extended.size, 1);
  f.capable = false; await controller.reconcile(true);
  assert.equal(f.extended.size, 0); assert.equal(f.ordinary.size, 1);
  assert.equal(f.data.timer.deadlineAt, 11000);
  f.capable = true; await controller.reconcile(true);
  assert.equal(f.ordinary.size, 0); assert.equal(f.extended.size, 1);
});

test('an ambiguous native failure never falls back to another audible transport', async () => {
  const { f, native, controller } = fixture(); const original = native.upsertAsync;
  native.upsertAsync = async (...args) => { await original(...args); throw new Error('Bridge rejected after persistence'); };
  await controller.reconcile();
  assert.equal(f.extended.size, 0); assert.equal(f.ordinaryCalls.length, 0);
  assert.equal(controller.getState().status, 'failed'); assert.deepEqual(f.warnings, ['schedule']);
});

test('a delayed actual native registration is cleaned after accepted reset', async () => {
  const { f, native, controller } = fixture();
  let release!: () => void; let entered!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; }); const ready = new Promise<void>((resolve) => { entered = resolve; });
  const original = native.upsertAsync;
  native.upsertAsync = async (...args) => { entered(); await gate; return original(...args); };
  const work = controller.reconcile(); await ready;
  f.data = { ...f.data, timer: resetTimer(f.data.timer) }; void controller.reconcile(); release(); await work;
  assert.equal(f.extended.size, 0); assert.equal(f.ordinary.size, 0);
});

test('unknown capability retains an already armed native request', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile(); const id = [...f.extended.keys()][0];
  native.capableAsync = async () => { throw new Error('probe'); }; await controller.reconcile(true);
  assert.ok(f.extended.has(id)); assert.equal(f.nativeCalls.length, 1); assert.equal(f.ordinaryCalls.length, 0);
  assert.equal(controller.getState().delivery.extendedSound, 'unknown');
});

test('native Open validates ownership, ignores Stop actions and detaches subscriptions', async () => {
  const { f, adapter, native, controller } = fixture(); await controller.reconcile();
  const received: unknown[] = [], responses: unknown[] = [];
  const stop = adapter.listen((item) => received.push(item), (item) => responses.push(item));
  const item = [...f.extended.values()][0];
  f.listeners.get('received')!({ identifier: 'foreign', data: {} });
  f.listeners.get('received')!(item);
  f.listeners.get('response')!({ ...item, defaultAction: false });
  f.listeners.get('response')!({ ...item, defaultAction: true });
  assert.equal(received.length, 1); assert.equal(responses.length, 1);
  let cleared: string | null = null; native.clearResponseAsync = async (id) => { cleared = id; };
  await adapter.clearResponse(item.identifier); assert.equal(cleared, item.identifier);
  stop(); assert.equal(f.listeners.size, 0);
});

test('accepted pause/resume invalidation reaches native while OS inventory reconciliation is blocked', async () => {
  const { f, native, controller } = fixture(); await controller.reconcile();
  let acknowledge!: () => void; let policyEntered!: () => void;
  const ack = new Promise<void>((resolve) => { acknowledge = resolve; });
  const started = new Promise<void>((resolve) => { policyEntered = resolve; });
  const policies: CompletionPolicy[] = [];
  native.setPolicyAsync = async (policy) => { policies.push(policy); if (policies.length === 1) { policyEntered(); await ack; } };
  const playback = createNativeAlertPlayback({ native, getSnapshot: () => f.data, getHydration: () => 'loaded',
    isActive: () => true, changed: () => {}, warn: () => f.warnings.push('playback') });
  playback.activate(); await started;
  f.data = { ...f.data, timer: pauseTimer(f.data.timer, 2000) }; void playback.syncPolicy();
  let releaseInventory!: () => void; let inventoryEntered!: () => void;
  const inventory = new Promise<void>((resolve) => { releaseInventory = resolve; });
  const reading = new Promise<void>((resolve) => { inventoryEntered = resolve; });
  const read = native.pendingAsync;
  native.pendingAsync = async () => { inventoryEntered(); await inventory; return read(); };
  const reconcile = controller.reconcile(); await reading;
  f.data = { ...f.data, timer: resumeTimer(f.data.timer, 5000) };
  const policy = playback.syncPolicy(); void controller.reconcile(); acknowledge(); await policy;
  assert.equal(f.nativeCalls.length, 1);
  assert.deepEqual(policies.at(-1)?.events, [{ eventId: 'timer:run', dueAt: 14000 }]);
  assert.notDeepEqual(policies.at(-1)?.events, policies[0].events);
  releaseInventory(); await reconcile;
  assert.equal(([...f.extended.values()][0].data as { dueAt: number }).dueAt, 14000);
  assert.equal(f.ordinaryCalls.length, 0);
  playback.dispose(); controller.dispose();
});
