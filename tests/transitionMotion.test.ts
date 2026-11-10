import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPanelMotion, createSheetMotion, type SheetMotionState, type TransitionDriver } from '../src/hooks/transitionMotion.ts';

function driver() {
  const values: number[] = [], warnings: string[] = [];
  const jobs: { target: number; finish: () => void; stopped: boolean }[] = [];
  const adapter: TransitionDriver = { set: (value) => values.push(value), warn: (code) => warnings.push(code),
    animate: (target, _duration, finish) => { const job = { target, finish, stopped: false }; jobs.push(job);
      return () => { job.stopped = true; finish(); }; } };
  return { adapter, values, warnings, jobs };
}
const normal = { active: true, reduceMotion: false };

function sheet() {
  const d = driver(), states: SheetMotionState[] = [];
  let exits = 0;
  const c = createSheetMotion({ driver: d.adapter, enterMs: 240, exitMs: 180, changed: (state) => states.push(state), exited: () => exits++ });
  c.activate();
  return { ...d, c, states, exits: () => exits, request: (visible: boolean, ready = true, policy = normal) => c.configure({ ...policy, visible, ready }) };
}

test('sheet waits for host readiness, becomes interactive after entry, and exits once', () => {
  const f = sheet(); f.request(false, false); assert.equal(f.exits(), 0);
  f.request(true, false); assert.equal(f.states.at(-1)?.present, true); assert.equal(f.jobs.length, 0);
  f.request(true); assert.equal(f.jobs[0].target, 1); assert.equal(f.states.at(-1)?.interactive, false);
  f.jobs[0].finish(); assert.equal(f.states.at(-1)?.interactive, true);
  f.request(false); assert.equal(f.states.at(-1)?.interactive, false); assert.equal(f.states.at(-1)?.present, true);
  f.jobs[1].finish(); f.jobs[1].finish(); assert.equal(f.exits(), 1); assert.equal(f.states.at(-1)?.present, false);
});

test('reopening supersedes exit callbacks without clearing the latest sheet', () => {
  const f = sheet(); f.request(true); f.jobs[0].finish(); f.request(false); const exit = f.jobs[1];
  f.request(true); assert.equal(exit.stopped, true); exit.finish(); assert.equal(f.exits(), 0);
  f.jobs[2].finish(); assert.equal(f.states.at(-1)?.interactive, true); assert.equal(f.states.at(-1)?.present, true);
  f.request(false); f.jobs[3].finish(); assert.equal(f.exits(), 1);
});

test('close before readiness removes presentation without waiting for an impossible entrance', () => {
  const f = sheet(); f.request(true, false); f.request(false, false);
  assert.equal(f.exits(), 1); assert.equal(f.states.at(-1)?.present, false); assert.equal(f.jobs.length, 0);
});

for (const policy of [{ ...normal, reduceMotion: true }, { ...normal, active: false }]) test(`policy ${JSON.stringify(policy)} settles entry and exit and does not replay on return`, () => {
  const f = sheet(); f.request(true); const old = f.jobs[0]; f.request(true, true, policy); old.finish();
  assert.equal(f.values.at(-1), 1); assert.equal(f.states.at(-1)?.phase, 'open');
  f.request(true); assert.equal(f.jobs.length, 1);
  f.request(false); f.request(false, true, policy); assert.equal(f.values.at(-1), 0); assert.equal(f.exits(), 1);
});

test('unmount fences late callbacks and reactivation starts cleanly', () => {
  const f = sheet(); f.request(true); f.request(false); f.c.dispose(); f.jobs.forEach((job) => job.finish());
  assert.equal(f.exits(), 0); f.c.activate(); f.request(true); f.jobs.at(-1)!.finish(); assert.equal(f.states.at(-1)?.phase, 'open');
});

test('unexpected driver failures fall back and cleanup failure cannot leave a modal waiting', () => {
  const f = sheet(); f.adapter.animate = () => { throw Error('start'); };
  f.request(true); assert.equal(f.states.at(-1)?.interactive, true); f.request(false); assert.equal(f.exits(), 1);
  assert.deepEqual(f.warnings, ['transition-start']);
  const g = sheet(); g.adapter.animate = () => () => { throw Error('stop'); };
  g.request(true); g.request(false, true, { ...normal, reduceMotion: true });
  assert.equal(g.exits(), 1); assert.deepEqual(g.warnings, ['transition-stop']);
});

test('synchronously completed driver work cannot steal cancellation ownership', () => {
  const f = sheet(); f.adapter.animate = (_target, _ms, finish) => { finish(); return () => { throw Error('obsolete stop'); }; };
  f.request(true); f.request(false); assert.equal(f.exits(), 1); assert.deepEqual(f.warnings, []);
});

test('panel identity and covered-state changes supersede work without replay on data or policy updates', () => {
  const d = driver(); let ready = 0;
  const c = createPanelMotion({ driver: d.adapter, enterMs: 140, ready: () => ready++ }); c.activate();
  const show = (identity: string, visible = true, policy = normal) => c.configure({ ...policy, identity, visible });
  show('editor'); show('editor'); assert.equal(d.jobs.length, 1);
  show('calendar'); d.jobs[0].finish(); assert.equal(ready, 0); d.jobs[1].finish(); assert.equal(ready, 1);
  show('calendar', true, { ...normal, reduceMotion: true }); show('calendar'); assert.equal(d.jobs.length, 2);
  show('calendar', false); show('calendar'); d.jobs[2].finish(); assert.equal(ready, 2);
  show('duration'); c.dispose(); d.jobs[3].finish(); assert.equal(ready, 2);
});

test('background and reduced motion settle the current panel; later foreground does not replay it', () => {
  const d = driver(); let ready = 0;
  const c = createPanelMotion({ driver: d.adapter, enterMs: 140, ready: () => ready++ }); c.activate();
  c.configure({ ...normal, identity: 'sound', visible: true });
  c.configure({ ...normal, active: false, identity: 'sound', visible: true });
  d.jobs[0].finish(); assert.equal(ready, 1); assert.equal(d.values.at(-1), 1);
  c.configure({ ...normal, identity: 'sound', visible: true }); assert.equal(d.jobs.length, 1);
  c.configure({ ...normal, reduceMotion: true, identity: 'appearance', visible: true });
  assert.equal(ready, 2); assert.equal(d.jobs.length, 1);
});
