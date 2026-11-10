import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPressMotion, type PressPolicy } from '../src/hooks/pressMotion.ts';

function fixture() {
  const writes: number[] = [], transitions: { target: number; finish: () => void; stopped: boolean }[] = [];
  const c = createPressMotion({ set: (value) => writes.push(value), animate: (target, finish) => {
    const transition = { target, finish, stopped: false }; transitions.push(transition);
    return () => { transition.stopped = true; transition.finish(); };
  } });
  const policy: PressPolicy = { disabled: false, active: true, reduceMotion: false };
  c.activate(); c.configure(policy);
  return { c, writes, transitions, policy };
}

test('held and released presses only request visual transitions; a new press supersedes release', () => {
  const f = fixture(); f.c.pressIn(); f.c.pressIn();
  assert.deepEqual(f.transitions.map((t) => t.target), [1]);
  f.c.pressOut(); f.c.pressIn();
  assert.deepEqual(f.transitions.map((t) => t.target), [1, 0, 1]);
  assert.equal(f.transitions[0].stopped, true); assert.equal(f.transitions[1].stopped, true);
  f.transitions[1].finish(); f.c.cancel();
  assert.equal(f.transitions[2].stopped, true); assert.equal(f.writes.at(-1), 0);
});

for (const change of [{ disabled: true }, { active: false }]) test(`policy ${JSON.stringify(change)} neutralizes a held press and blocks new motion`, () => {
  const f = fixture(); f.c.pressIn(); f.c.configure({ ...f.policy, ...change });
  assert.equal(f.transitions[0].stopped, true); assert.equal(f.writes.at(-1), 0);
  f.c.pressIn(); f.c.pressOut(); assert.equal(f.transitions.length, 1);
  f.c.configure(f.policy); f.c.pressIn(); assert.equal(f.transitions.length, 2);
});

test('live reduced motion stops interpolation but keeps immediate held feedback and release', () => {
  const f = fixture(); f.c.pressIn(); f.c.configure({ ...f.policy, reduceMotion: true });
  assert.equal(f.transitions[0].stopped, true); assert.equal(f.writes.at(-1), 1);
  f.c.pressOut(); assert.equal(f.writes.at(-1), 0);
  f.c.pressIn(); assert.equal(f.writes.at(-1), 1); assert.equal(f.transitions.length, 1);
  f.c.configure(f.policy); f.c.pressOut(); assert.equal(f.transitions.at(-1)?.target, 0);
});

test('cancellation and disposal fence stale completions and allow clean effect reactivation', () => {
  const f = fixture(); f.c.pressIn(); const stale = f.transitions[0].finish;
  f.c.dispose(); const count = f.writes.length; stale(); f.c.pressIn(); f.c.pressOut();
  assert.equal(f.writes.length, count); assert.equal(f.writes.at(-1), 0);
  f.c.activate(); f.c.configure(f.policy); f.c.pressIn();
  stale(); f.c.pressOut(); assert.equal(f.transitions.at(-1)?.target, 0); f.c.dispose();
});
