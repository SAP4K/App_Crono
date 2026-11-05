import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialData } from '../src/core/stopwatch.ts';
import { startTimer } from '../src/core/timer.ts';
import { createTimerCoordinator } from '../src/hooks/timerCompletion.ts';
import type { TimerSoundEvent } from '../src/hooks/timerCompletion.ts';

function fixture(options: { accept?: boolean; play?: (guard: () => boolean) => Promise<void> } = {}) {
  let data = initialData(); let now = 1000; let active = true; let played = 0; let stopped = 0; let id = 0;
  const callbacks: (() => void)[] = []; const guards: (() => boolean)[] = []; const notices: string[] = [];
  const events: TimerSoundEvent[] = [];
  const coordinator = createTimerCoordinator({
    getSnapshot: () => data,
    update: (action) => { const next = options.accept === false ? data : action(data); const changed = next !== data; data = next; return { changed, data }; },
    isActive: () => active, now: () => now, createId: () => `run-${++id}`,
    notify: (message) => { notices.push(message); },
    play: async (guard, event) => { guards.push(guard); if (event) events.push(event); if (options.play) await options.play(guard); else if (guard()) played++; },
    stop: () => { stopped++; },
    schedule: (callback) => { callbacks.push(callback); return callbacks.length as unknown as ReturnType<typeof setTimeout>; },
    cancel: () => {},
  });
  return { coordinator, callbacks, guards, notices, events,
    get data() { return data; }, set data(value) { data = value; },
    set now(value: number) { now = value; }, set active(value: boolean) { active = value; },
    get played() { return played; }, get stopped() { return stopped; },
  };
}

test('completion is route-independent and duplicate callbacks cannot replay audio', () => {
  const f = fixture(); f.coordinator.configure(1000); f.coordinator.start(); f.now = 2000;
  f.callbacks.at(-1)!(); f.coordinator.reconcile(); f.callbacks[0]();
  assert.equal(f.data.timer.status, 'completed'); assert.equal(f.played, 1); assert.equal(f.notices.length, 1);
  assert.deepEqual(f.events, [{ runId: 'run-1', dueAt: 2000 }]);
  f.coordinator.reconcile('hydrate'); assert.equal(f.played, 1);
});

test('pause at deadline uses the same completion path and saved sound preference', () => {
  const f = fixture(); f.coordinator.configure(1000); f.coordinator.start(); f.now = 2000; f.coordinator.pause();
  assert.equal(f.data.timer.status, 'completed'); assert.equal(f.played, 1);
  f.coordinator.start(); f.data.preferences.timerSound = false; f.now = 3000; f.coordinator.reconcile('deadline');
  assert.equal(f.data.timer.status, 'completed'); assert.equal(f.played, 1);
});

test('background expiry and overdue hydration complete silently', () => {
  const f = fixture(); f.coordinator.configure(1000); f.coordinator.start(); f.active = false; f.now = 3000;
  f.callbacks.at(-1)!(); assert.equal(f.data.timer.status, 'running');
  f.active = true; f.coordinator.reconcile('foreground');
  assert.equal(f.data.timer.status, 'completed'); assert.equal(f.played, 0);
  f.data = { ...initialData(), timer: startTimer({ ...initialData().timer, durationMs: 1000, remainingMs: 1000 }, 0, 'old') };
  f.coordinator.reconcile('hydrate'); assert.equal(f.data.timer.status, 'completed'); assert.equal(f.played, 0);
});

test('same-run resume rejects queued callbacks from the previous deadline', () => {
  const f = fixture(); f.coordinator.configure(5000); f.coordinator.start(); const old = f.callbacks.at(-1)!;
  f.now = 2000; f.coordinator.pause(); f.now = 10000; f.coordinator.resume();
  const current = f.callbacks.at(-1)!; old();
  assert.equal(f.data.timer.status, 'running'); assert.equal(f.played, 0);
  f.now = 14000; current(); assert.equal(f.played, 1);
});

test('pending playback guards read current state after mute/reset/disposal', () => {
  const f = fixture(); f.coordinator.configure(1000); f.coordinator.start(); f.now = 2000; f.coordinator.reconcile('deadline');
  const allowed = f.guards[0]; assert.ok(allowed());
  f.data = { ...f.data, preferences: { ...f.data.preferences, timerSound: false } }; assert.equal(allowed(), false);
  f.coordinator.reset(); assert.equal(allowed(), false);
  f.coordinator.dispose(); f.coordinator.start(); assert.equal(f.data.timer.status, 'idle');
});

test('a rejected conditional update emits neither completion notice nor sound', () => {
  const f = fixture({ accept: false });
  f.data = { ...initialData(), timer: startTimer({ ...initialData().timer, durationMs: 1000, remainingMs: 1000 }, 0, 'rejected') };
  f.now = 2000; f.coordinator.reconcile('deadline');
  assert.equal(f.data.timer.status, 'running'); assert.equal(f.played, 0); assert.deepEqual(f.notices, []);
});

test('asynchronous preparation cannot play after mute, reset or unmount', async () => {
  for (const cancel of ['mute', 'reset', 'dispose'] as const) {
    let prepared!: () => void; let played = 0;
    const preparation = new Promise<void>((resolve) => { prepared = resolve; });
    const f = fixture({ play: async (guard) => { await preparation; if (guard()) played++; } });
    f.coordinator.configure(1000); f.coordinator.start(); f.now = 2000; f.coordinator.reconcile('deadline');
    if (cancel === 'mute') f.data = { ...f.data, preferences: { ...f.data.preferences, timerSound: false } };
    else if (cancel === 'reset') f.coordinator.reset();
    else f.coordinator.dispose();
    prepared(); await Promise.resolve(); await Promise.resolve();
    assert.equal(played, 0); assert.deepEqual(f.notices, ['Timpul a expirat.']);
  }
});

test('failed audio setup leaves completion visible and allows a later run', async (t) => {
  const warnings: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => { warnings.push(args); });
  let attempts = 0;
  const f = fixture({ play: async () => { if (++attempts === 1) throw new Error('decode failure'); } });
  f.coordinator.configure(1000); f.coordinator.start(); f.now = 2000; f.coordinator.reconcile('deadline');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(f.data.timer.status, 'completed'); assert.equal(warnings.length, 1);
  assert.equal(f.notices.at(-1), 'Timpul a expirat. Sunetul nu este disponibil acum.');
  f.coordinator.start(); f.now = 3000; f.coordinator.reconcile('deadline');
  await Promise.resolve(); assert.equal(attempts, 2);
});

test('effect cleanup and reactivation reschedule once without reviving old callbacks', () => {
  const f = fixture(); f.coordinator.configure(1000); f.coordinator.start();
  const old = f.callbacks.at(-1)!; f.coordinator.dispose(); f.coordinator.activate(); f.coordinator.reconcile('hydrate');
  f.now = 2000; old(); assert.equal(f.played, 0);
  f.callbacks.at(-1)!(); assert.equal(f.played, 1);
});
