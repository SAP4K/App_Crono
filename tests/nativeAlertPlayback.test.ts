import assert from 'node:assert/strict';
import test from 'node:test';
import { initialData } from '../src/core/stopwatch.ts';
import { createNativeAlertPlayback } from '../src/hooks/nativeAlertPlayback.ts';
import type { CompletionNative, NativePlaybackSnapshot } from '../src/hooks/completionAlerts.types.ts';
import type { CompletionRequest } from '../src/core/completionAlerts.ts';
import { configureTimer, startTimer, pauseTimer, resumeTimer, completeTimer } from '../src/core/timer.ts';

const request: CompletionRequest = { owner: 'timer', kind: 'timer-complete', eventId: 'timer:run', runId: 'run', dueAt: 1000, soundId: 'bell', durationSeconds: 60 };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function fixture() {
  const f = { data: initialData(), hydration: 'loaded', active: true, warnings: 0, requests: [] as CompletionRequest[], stops: [] as unknown[],
    policies: [] as unknown[], listener: null as ((value: NativePlaybackSnapshot) => void) | null,
    snapshot: { status: 'idle', request: null, generation: 0, revision: 0, error: false, startedAt: null, remainingMs: 0 } as NativePlaybackSnapshot };
  const native: CompletionNative = {
    protocolVersion: 1, capableAsync: async () => true, upsertAsync: async () => null, pendingAsync: async () => [], presentedAsync: async () => [],
    cancelAsync: async () => {}, dismissAsync: async () => {}, lastResponseAsync: async () => null, clearResponseAsync: async () => {},
    snapshotAsync: async () => f.snapshot,
    requestPlaybackAsync: async (value) => {
      f.requests.push(value); f.snapshot = { status: 'playing', request: value, generation: f.snapshot.generation + 1,
        revision: f.snapshot.revision + 1, error: false, startedAt: 1000, remainingMs: value.durationSeconds * 1000 };
      f.listener?.(f.snapshot); return true;
    },
    stopPlaybackAsync: async (owner, key, generation) => {
      f.stops.push({ owner, key, generation });
      if (f.snapshot.request && (!owner || owner === f.snapshot.request.owner) && (!key || key === `${f.snapshot.request.eventId}@${f.snapshot.request.dueAt}`)
        && (generation === null || generation === f.snapshot.generation)) {
        f.snapshot = { status: 'idle', request: null, generation: f.snapshot.generation + 1, revision: f.snapshot.revision + 1, error: false, startedAt: null, remainingMs: 0 };
        f.listener?.(f.snapshot);
      }
    },
    setPolicyAsync: async (value) => { f.policies.push(value); },
    addListener: (_event, listener) => { f.listener = listener as (value: NativePlaybackSnapshot) => void; return { remove: () => { f.listener = null; } }; },
  };
  const controller = createNativeAlertPlayback({ native, getSnapshot: () => f.data, getHydration: () => f.hydration,
    isActive: () => f.active, changed: () => {}, warn: () => { f.warnings++; } });
  controller.activate();
  return { f, native, controller };
}

test('native completion remains owned while backgrounded or detached; Stop is explicit', async () => {
  const { f, controller } = fixture(); await flush();
  assert.ok(controller.request({ ...request, allowed: () => f.active })); await flush();
  f.active = false; controller.suspendOwner?.('timer');
  assert.equal(f.stops.length, 0); assert.equal(controller.getState().status, 'playing');
  controller.dispose(); await flush(); assert.equal(f.stops.length, 0);
  f.active = true; controller.activate(); await flush(); assert.equal(controller.getState().status, 'playing');
  controller.stop(); await flush(); assert.equal(f.snapshot.status, 'idle');
});

test('closing preview controls cannot cancel a pending timer or an independent owner', async () => {
  const { f, native, controller } = fixture(); await flush();
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  const original = native.requestPlaybackAsync;
  native.requestPlaybackAsync = async (value) => { const accepted = await original(value); await gate; return accepted; };
  controller.request({ ...request, allowed: () => true }); await flush();
  controller.cancelOwner('preview'); controller.cancelOwner('planning'); release(); await flush();
  assert.equal(f.stops.length, 0); assert.equal(controller.getState().status, 'playing');
});

test('Stop invalidates a request accepted before a delayed bridge response', async () => {
  const { f, native, controller } = fixture(); await flush();
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  const original = native.requestPlaybackAsync;
  native.requestPlaybackAsync = async (value) => { const accepted = await original(value); await gate; return accepted; };
  controller.request({ ...request, allowed: () => true }); await flush(); controller.stop(); release(); await flush();
  assert.equal(f.snapshot.status, 'idle'); assert.equal(controller.getState().status, 'idle');
  assert.ok(f.stops.every((item) => (item as { key: string }).key === 'timer:run@1000'));
});

test('an older initial snapshot cannot replace a newer native event', async () => {
  const { f, native, controller } = fixture(); await flush(); controller.dispose();
  const old = f.snapshot; let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  native.snapshotAsync = async () => { await gate; return old; };
  controller.activate();
  f.snapshot = { ...f.snapshot, status: 'playing', request, generation: 2, revision: 3 };
  f.listener?.(f.snapshot); release(); await flush();
  assert.equal(controller.getState().status, 'playing'); assert.equal(controller.getState().request?.eventId, request.eventId);
});

test('failed hydration cannot push default policy into already armed native state', async () => {
  const { f, controller } = fixture(); await flush(); const count = f.policies.length;
  f.hydration = 'failed'; f.data = initialData(); await controller.syncPolicy();
  assert.equal(f.policies.length, count); assert.equal(controller.request({ ...request, allowed: () => true }), false);
});

test('native bridge failure is visible without starting a fallback player', async () => {
  const { f, native, controller } = fixture(); await flush();
  native.requestPlaybackAsync = async () => { throw new Error('transport'); };
  controller.request({ ...request, allowed: () => true }); await flush();
  assert.equal(controller.getState().error, 'sound-unavailable'); assert.equal(f.warnings, 1);
});

test('a native sound accepted before bridge rejection remains visible and stoppable', async () => {
  const { f, native, controller } = fixture(); await flush(); const original = native.requestPlaybackAsync;
  native.requestPlaybackAsync = async (value) => { await original(value); throw new Error('late rejection'); };
  controller.request({ ...request, allowed: () => true }); await flush();
  assert.equal(f.requests.length, 1); assert.equal(controller.getState().status, 'playing');
  controller.stop(); await flush(); assert.equal(f.snapshot.status, 'idle');
});

test('coalesced pause and resume push the new deadline before delayed inventory can reconcile', async () => {
  const { f, native, controller } = fixture(); await flush();
  let entered!: () => void; let release!: () => void;
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const before = f.policies.length;
  native.setPolicyAsync = async (policy) => { f.policies.push(policy); if (f.policies.length === before + 1) { entered(); await gate; } };
  f.data = { ...f.data, timer: startTimer(configureTimer(f.data.timer, 10000), 1000, 'run') };
  const first = controller.syncPolicy(); await ready;
  f.data = { ...f.data, timer: pauseTimer(f.data.timer, 2000) }; void controller.syncPolicy();
  f.data = { ...f.data, timer: resumeTimer(f.data.timer, 5000) }; void controller.syncPolicy();
  release(); await first;
  assert.equal(f.data.timer.deadlineAt, 14000);
  assert.equal(f.policies.length, before + 2);
  assert.notDeepEqual(f.policies.at(-1), f.policies[before]);
  assert.equal(f.stops.length, 0);
});

test('a completion while native acknowledgement is delayed retains its accepted playback boundary', async () => {
  const { f, native, controller } = fixture(); await flush();
  let entered!: () => void; let release!: () => void;
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const before = f.policies.length;
  native.setPolicyAsync = async (policy) => { f.policies.push(policy); if (f.policies.length === before + 1) { entered(); await gate; } };
  // Hold an earlier update so both running and completed snapshots coalesce.
  f.data = { ...f.data, preferences: { ...f.data.preferences, alertSoundId: 'bell' } };
  const work = controller.syncPolicy(); await ready;
  f.data = { ...f.data, timer: startTimer(configureTimer(f.data.timer, 1000), 1000, 'run') }; void controller.syncPolicy();
  f.data = { ...f.data, timer: completeTimer(f.data.timer, 2000) }; void controller.syncPolicy();
  release(); await work;
  const latest = f.policies.at(-1) as { events: unknown[]; timerCompleted: boolean };
  assert.equal(latest.timerCompleted, true);
  assert.deepEqual(latest.events, [{ eventId: 'timer:run', dueAt: 2000 }]);
});
