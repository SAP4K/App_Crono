import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlertPlayback } from '../src/hooks/alertPlayback.ts';
import type { AlertRequest, AlertState, AlertTransport } from '../src/hooks/alertPlayback.ts';
import { ALERT_DURATIONS, SOUND_CHOICES } from '../src/core/sounds.ts';

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const request = (changes: Partial<AlertRequest> = {}): AlertRequest => ({
  owner: 'timer', eventId: 'timer:one', kind: 'timer-complete', dueAt: 1000,
  soundId: 'classic', durationSeconds: 5, allowed: () => true, ...changes,
});

function harness(play: AlertTransport['play'] = async () => {}) {
  let now = 0; let nextId = 0; let stops = 0; let warnings = 0; let active = true;
  const tasks = new Map<number, { at: number; callback: () => void }>();
  const states: AlertState[] = [];
  const controller = createAlertPlayback({
    transport: { play, stop: () => { stops++; } }, isActive: () => active,
    schedule: (callback, delay) => { const id = ++nextId; tasks.set(id, { at: now + delay, callback }); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (handle) => { tasks.delete(handle as unknown as number); }, changed: (state) => states.push(state), warn: () => { warnings++; },
  });
  const advance = (milliseconds: number) => {
    const target = now + milliseconds;
    while (true) {
      const task = [...tasks.entries()].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!task) break;
      now = task[1].at; tasks.delete(task[0]); task[1].callback();
    }
    now = target;
  };
  return { controller, advance, states, stops: () => stops, warnings: () => warnings, hide: () => { active = false; } };
}

test('every sound/duration combination loops until the selected boundary after startup', async () => {
  for (const sound of SOUND_CHOICES) for (const duration of ALERT_DURATIONS) {
    const h = harness(); h.controller.request(request({ soundId: sound.id, durationSeconds: duration })); await flush();
    assert.equal(h.controller.getState().status, 'playing');
    h.advance(duration * 1000 - 1); assert.equal(h.stops(), 0);
    h.advance(1); assert.equal(h.stops(), 1); assert.equal(h.controller.getState().status, 'idle');
  }
});

test('loading does not consume playback duration, and canceled startup cannot revive', async () => {
  let loaded!: () => void;
  const h = harness(() => new Promise<void>((resolve) => { loaded = resolve; }));
  h.controller.request(request()); await flush(); h.advance(3000);
  loaded(); await flush(); h.advance(4999); assert.equal(h.stops(), 0);
  h.advance(1); assert.equal(h.stops(), 1);
  h.controller.request(request({ eventId: 'second' })); await flush();
  h.controller.stop(); loaded(); await flush();
  assert.equal(h.controller.getState().status, 'idle');
  const hanging = harness(() => new Promise<void>(() => {}));
  hanging.controller.request(request()); await flush(); hanging.advance(4000);
  assert.equal(hanging.warnings(), 1); assert.equal(hanging.controller.getState().status, 'idle');
});

test('owner cancellation and stale duration callbacks cannot stop another activity', async () => {
  const h = harness();
  h.controller.request(request()); await flush(); h.advance(1000);
  h.controller.request(request({ owner: 'planning', kind: 'schedule-step', eventId: 'planning:one', dueAt: 2000 })); await flush();
  h.controller.cancelOwner('timer');
  h.advance(4000); assert.equal(h.controller.getState().request?.owner, 'planning');
  h.advance(1000); assert.equal(h.controller.getState().status, 'idle');
});

test('live alerts replace previews, suppress preview interruption, and resolve ties in either order', async () => {
  for (const timerFirst of [false, true]) {
    const h = harness();
    h.controller.request(request({ owner: 'preview', kind: 'preview', eventId: 'preview' })); await flush();
    const timer = request();
    const planning = request({ owner: 'planning', kind: 'schedule-complete', eventId: 'planning' });
    h.controller.request(timerFirst ? timer : planning);
    h.controller.request(timerFirst ? planning : timer); await flush();
    assert.equal(h.controller.getState().request?.owner, 'timer');
    assert.equal(h.controller.request(request({ owner: 'preview', kind: 'preview', eventId: 'preview2' })), false);
    assert.equal(h.controller.getState().request?.owner, 'timer');
  }
});

test('old failures and disposal cannot report against a successful replacement', async () => {
  const failed: ((error: unknown) => void)[] = [];
  const h = harness(async (_sound, _allowed, error) => { failed.push(error); });
  h.controller.request(request()); await flush(); failed[0](new Error('blocked'));
  assert.equal(h.warnings(), 1);
  h.controller.request(request({ eventId: 'new', dueAt: 2000 })); await flush();
  failed[0](new Error('old status'));
  assert.equal(h.warnings(), 1); assert.equal(h.controller.getState().error, null);
  h.controller.dispose(); failed[1](new Error('disposed'));
  assert.equal(h.warnings(), 1); assert.equal(h.controller.request(request()), false);
  h.controller.activate(); assert.equal(h.controller.request(request({ eventId: 'reactivated' })), true);
  await flush(); assert.equal(h.controller.getState().status, 'playing');
});

test('inactive or invalidated requests never start playback', async () => {
  let plays = 0; let valid = true;
  const h = harness(async () => { plays++; });
  h.controller.request(request({ allowed: () => valid })); valid = false;
  await flush(); assert.equal(plays, 0); assert.equal(h.controller.getState().status, 'idle');
  h.hide(); assert.equal(h.controller.request(request()), false);
});
