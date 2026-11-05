import assert from 'node:assert/strict';
import test from 'node:test';
import { initialData } from '../src/core/stopwatch.ts';
import { saveSchedule, startSchedule } from '../src/core/planning.ts';
import type { ScheduleBoundary } from '../src/core/planning.ts';
import type { AlertRequest } from '../src/hooks/alertPlayback.ts';
import { createPlanningRunner } from '../src/hooks/planningRunner.ts';

function fixture(accept = true) {
  let data = initialData(); let now = 1000; let active = true; let id = 0;
  const notices: ScheduleBoundary[] = []; const requests: AlertRequest[] = []; const canceled: string[] = [];
  const callbacks: (() => void)[] = [];
  data.planning = saveSchedule(data.planning, { id: 'sequence', name: 'Studiu', steps: [
    { id: 'a', name: 'Lucru', durationMs: 1000 }, { id: 'b', name: 'Pauză', durationMs: 1000 },
  ] });
  const runner = createPlanningRunner({
    getSnapshot: () => data, update: (action) => { const next = action(data); if (!accept) return { changed: false, data }; const changed = next !== data; data = next; return { changed, data }; },
    alerts: { request: (request) => { requests.push(request); return true; }, cancelOwner: (owner) => canceled.push(owner) },
    now: () => now, isActive: () => active, createId: () => 'run-' + ++id, notify: (event) => notices.push(event),
    schedule: (callback) => { callbacks.push(callback); return callbacks.length as unknown as ReturnType<typeof setTimeout>; }, cancel: () => {},
  });
  return { runner, notices, requests, canceled, callbacks,
    get data() { return data; }, set data(value) { data = value; },
    set now(value: number) { now = value; }, set active(value: boolean) { active = value; },
  };
}

test('runner advances independently, deduplicates boundaries, and emits one final sound', () => {
  const f = fixture(); f.runner.start('sequence'); f.now = 2000; f.callbacks.at(-1)!();
  assert.equal(f.data.planning.run?.stepIndex, 1); assert.equal(f.requests.length, 1);
  f.runner.reconcile(); assert.equal(f.requests.length, 1);
  f.now = 3000; f.callbacks.at(-1)!(); f.runner.reconcile();
  assert.equal(f.data.planning.run?.status, 'completed');
  assert.deepEqual(f.requests.map((request) => request.kind), ['schedule-step', 'schedule-complete']);
  assert.equal(f.data.timer.status, 'idle'); assert.deepEqual(f.data.sessions, []);
});

test('background return and overdue hydration catch up silently without a backlog', () => {
  const f = fixture(); f.runner.start('sequence'); f.active = false; f.now = 6000; f.callbacks.at(-1)!();
  assert.equal(f.data.planning.run?.stepIndex, 0);
  f.active = true; f.runner.reconcile('foreground');
  assert.equal(f.data.planning.run?.status, 'completed'); assert.equal(f.requests.length, 0);
  assert.equal(f.notices.length, 1);
  const restored = fixture(); restored.data = { ...restored.data, planning: startSchedule(restored.data.planning, 'sequence', 0, 'old') };
  restored.now = 5000; restored.runner.reconcile('hydrate'); assert.equal(restored.requests.length, 0);
  assert.equal(restored.data.planning.run?.status, 'completed');
});

test('delayed foreground callbacks coalesce and stale resume/reset callbacks stay invalid', () => {
  const f = fixture(); f.runner.start('sequence'); const old = f.callbacks.at(-1)!;
  f.now = 1500; f.runner.pause(); f.now = 10000; f.runner.resume();
  old(); assert.equal(f.notices.length, 0);
  f.now = 13000; f.callbacks.at(-1)!();
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].kind, 'schedule-complete');
  f.runner.reset(); assert.equal(f.requests[0].allowed(), false);
  assert.ok(f.canceled.every((owner) => owner === 'planning'));
});

test('mute, rejected updates, and disposal preserve timing invariants and suppress effects', () => {
  const f = fixture(); f.runner.start('sequence'); f.data.preferences.timerSound = false;
  f.now = 2000; f.runner.reconcile('deadline'); assert.equal(f.notices.length, 1); assert.equal(f.requests.length, 0);
  f.runner.dispose(); f.now = 3000; f.callbacks.at(-1)!(); assert.equal(f.data.planning.run?.status, 'running');
  f.runner.activate(); f.runner.reconcile('hydrate'); assert.equal(f.data.planning.run?.status, 'completed');
  const rejected = fixture(false);
  rejected.data = { ...rejected.data, planning: startSchedule(rejected.data.planning, 'sequence', 0, 'rejected') };
  rejected.now = 5000; rejected.runner.reconcile('deadline');
  assert.equal(rejected.notices.length, 0); assert.equal(rejected.requests.length, 0);
});
