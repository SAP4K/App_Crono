import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observeMotionPreference, type MotionPreference } from '../src/hooks/motionPreference.ts';

function fixture() {
  let active = true, removed = 0;
  let event = (_reduced: boolean) => {}, activity = () => {};
  const reads: { resolve: (value: boolean) => void; reject: () => void }[] = [];
  const states: MotionPreference[] = [], warnings: string[] = [];
  const dispose = observeMotionPreference({
    read: () => new Promise<boolean>((resolve, reject) => reads.push({ resolve, reject: () => reject(Error('unavailable')) })),
    subscribe: (changed) => { event = changed; return () => { removed++; }; },
    subscribeActivity: (changed) => { activity = changed; return () => { removed++; }; },
    isActive: () => active, changed: (state) => states.push(state), warn: (code) => warnings.push(code),
  });
  return { reads, states, warnings, dispose, removed: () => removed, event: (reduced: boolean) => event(reduced),
    activity: (value: boolean) => { active = value; activity(); } };
}

test('motion starts conservatively and a newer live event fences the startup query', async () => {
  const f = fixture(); assert.deepEqual(f.states, [{ reduceMotion: true, active: true }]);
  f.event(false); f.event(true); f.reads[0].resolve(false); await Promise.resolve();
  assert.equal(f.states.at(-1)?.reduceMotion, true);
  f.event(false); assert.equal(f.states.at(-1)?.reduceMotion, false); f.dispose();
});

test('motion refresh on foreground supersedes overlapping reads and missed background events', async () => {
  const f = fixture(); f.reads[0].resolve(false); await Promise.resolve();
  f.activity(false); assert.equal(f.states.at(-1)?.active, false);
  f.activity(true); f.activity(false); f.activity(true);
  f.reads[2].resolve(true); await Promise.resolve(); f.reads[1].resolve(false); await Promise.resolve();
  assert.deepEqual(f.states.at(-1), { reduceMotion: true, active: true });
  f.dispose();
});

test('motion query failure falls back, warns once and recovers on a later foreground read', async () => {
  const f = fixture(); f.reads[0].reject(); await Promise.resolve();
  f.activity(false); f.activity(true); f.reads[1].reject(); await Promise.resolve();
  assert.deepEqual(f.warnings, ['motion-query']); assert.equal(f.states.at(-1)?.reduceMotion, true);
  f.activity(false); f.activity(true); f.reads[2].resolve(false); await Promise.resolve();
  assert.equal(f.states.at(-1)?.reduceMotion, false); f.dispose();
});

test('motion disposal fences late queries/events and removes both subscriptions', async () => {
  const f = fixture(); const count = f.states.length; f.dispose();
  f.reads[0].resolve(false); f.event(false); f.activity(false); await Promise.resolve();
  assert.equal(f.states.length, count); assert.equal(f.removed(), 2);
});

test('an obsolete failed startup query cannot overwrite a live setting or emit a stale warning', async () => {
  const f = fixture(); f.event(false); f.reads[0].reject(); await Promise.resolve();
  assert.equal(f.states.at(-1)?.reduceMotion, false); assert.deepEqual(f.warnings, []); f.dispose();
});

test('an absent optional media subscription and synchronous query failure remain conservative', () => {
  const states: MotionPreference[] = [], warnings: string[] = [];
  let removed = false;
  const dispose = observeMotionPreference({ read: () => { throw Error('unsupported'); }, subscribe: () => undefined,
    subscribeActivity: () => () => { removed = true; }, isActive: () => false,
    changed: (state) => states.push(state), warn: (code) => warnings.push(code) });
  assert.deepEqual(states, [{ reduceMotion: true, active: false }]);
  assert.deepEqual(warnings, ['motion-query']); dispose(); assert.equal(removed, true);
});

test('cleanup failure does not prevent independent activity subscription removal', () => {
  let removed = false;
  const warnings: string[] = [];
  const dispose = observeMotionPreference({ read: () => Promise.resolve(true),
    subscribe: () => () => { throw Error('cleanup'); }, subscribeActivity: () => () => { removed = true; },
    isActive: () => true, changed: () => {}, warn: (code) => warnings.push(code) });
  dispose(); assert.equal(removed, true); assert.deepEqual(warnings, ['motion-cleanup']);
});
