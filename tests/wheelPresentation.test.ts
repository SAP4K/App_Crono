import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWheelPresentation } from '../src/hooks/wheelPresentation.ts';

function fixture() {
  let position = 220, id = 0;
  const aligned: number[] = [], warnings: string[] = [];
  const jobs: { target: number; finish: () => void; stopped: boolean }[] = [];
  const timers = new Map<number, () => void>();
  const adapter = {
    read: () => position,
    align: (offset: number) => { position = offset; aligned.push(offset); },
    animate: (target: number, finish: () => void) => {
      const job = { target, finish, stopped: false }; jobs.push(job);
      return () => { job.stopped = true; finish(); };
    },
    schedule: (callback: () => void) => { timers.set(++id, callback); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (handle: ReturnType<typeof setTimeout>) => { timers.delete(handle as unknown as number); },
    warn: (code: string) => warnings.push(code),
  };
  const owner = createWheelPresentation(adapter);
  return { owner, adapter, aligned, warnings, jobs, timers, position: (next: number) => { position = next; } };
}

test('presentation moves offsets without selecting data and cleans up after completion', () => {
  const f = fixture(); f.owner.move(1100, true);
  assert.equal(f.owner.isMoving(), true); assert.deepEqual(f.aligned, []);
  f.position(600); f.jobs[0].finish();
  assert.deepEqual(f.aligned, [1100]); assert.equal(f.owner.isMoving(), false); assert.equal(f.timers.size, 0);
});
test('rapid replacements invalidate synchronous stop, old completion and fallback callbacks', () => {
  const f = fixture(); f.owner.move(44, true); const old = [...f.timers.values()][0];
  f.position(120); f.owner.move(1100, true); f.owner.move(1100, true);
  f.jobs[0].finish(); old();
  assert.equal(f.jobs.length, 2); assert.deepEqual(f.aligned, []); assert.equal(f.owner.isMoving(), true);
  f.jobs[1].finish(); assert.deepEqual(f.aligned, [1100]);
});
test('no-op target and reduced motion settle without waiting for scrollend', () => {
  const f = fixture(); f.owner.move(220, true); assert.equal(f.jobs.length, 0);
  f.owner.move(1100, true); f.owner.move(1100, false); f.jobs[0].finish();
  assert.deepEqual(f.aligned, [220, 1100]); assert.equal(f.timers.size, 0);
  f.owner.move(1100, true); assert.equal(f.jobs.length, 1);
});
test('manual takeover retains the displayed offset while lifecycle settlement uses the accepted target', () => {
  const f = fixture(), cancellations: (boolean | undefined)[] = [];
  const align = f.adapter.align;
  f.adapter.align = (offset: number, cancelMotion?: boolean) => { cancellations.push(cancelMotion); align(offset); };
  f.owner.move(1100, true); f.position(400);
  assert.equal(f.owner.interrupt(), 400); f.jobs[0].finish(); assert.deepEqual(f.aligned, [400]);
  f.owner.move(44, true); f.position(300); f.owner.settle(); f.jobs[1].finish();
  assert.deepEqual(f.aligned, [400, 44]); assert.equal(f.timers.size, 0);
  assert.deepEqual(cancellations, [false, true]);
});
test('changed geometry supersedes old offsets and a missing completion has bounded cleanup', () => {
  const f = fixture(); f.owner.move(440, true); const old = [...f.timers.values()][0];
  f.owner.move(800, false); old(); assert.deepEqual(f.aligned, [800]);
  f.owner.move(1200, true); [...f.timers.values()][0]();
  assert.deepEqual(f.aligned, [800, 1200]); assert.equal(f.owner.isMoving(), false);
});
test('disposal fences callbacks; reactivation does not replay old presentation', () => {
  const f = fixture(); f.owner.move(1100, true); const old = [...f.timers.values()][0];
  f.owner.dispose(); f.jobs[0].finish(); old(); f.owner.move(44, true);
  assert.deepEqual(f.aligned, []); assert.equal(f.timers.size, 0);
  f.owner.activate(); old(); assert.equal(f.owner.isMoving(), false);
  f.owner.move(44, true); f.jobs[1].finish(); assert.deepEqual(f.aligned, [44]);
});
test('driver failures settle immediately and independent stop failures cannot strand work', () => {
  const f = fixture(); f.adapter.animate = () => { throw Error('start'); };
  f.owner.move(1100, true); f.owner.move(44, true);
  assert.deepEqual(f.aligned, [1100, 44]); assert.deepEqual(f.warnings, ['wheel-presentation-start']);
  const g = fixture(); g.adapter.animate = () => () => { throw Error('stop'); };
  g.owner.move(1100, true); g.owner.move(44, false);
  assert.equal(g.owner.isMoving(), false); assert.equal(g.timers.size, 0); assert.deepEqual(g.aligned, [44]);
  assert.deepEqual(g.warnings, ['wheel-presentation-stop']);
});
test('synchronously completed animation cannot leave an obsolete stop or timeout owner', () => {
  const f = fixture(); f.adapter.animate = (_offset, finish) => { finish(); return () => { throw Error('obsolete'); }; };
  f.owner.move(1100, true); f.owner.move(44, true);
  assert.deepEqual(f.aligned, [1100, 44]); assert.deepEqual(f.warnings, []); assert.equal(f.timers.size, 0);
});
