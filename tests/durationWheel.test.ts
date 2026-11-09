import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDurationWheel } from '../src/hooks/durationWheel.ts';
function fixture() {
  const config = { value: 5, maximum: 59, rowHeight: 44, disabled: false };
  const calls = { values: [] as number[], busy: [] as boolean[], offsets: [] as number[], cancellations: [] as boolean[] };
  let id = 0, time = 0;
  const callbacks = new Map<number, () => void>(), deadlines = new Map<number, number>();
  const controller = createDurationWheel({ configuration: () => config,
    select: (value) => { calls.values.push(value); config.value = value; }, busy: (value) => calls.busy.push(value),
    align: (offset, cancelMotion = false) => { calls.offsets.push(offset); calls.cancellations.push(cancelMotion); },
    schedule: (callback, delay) => {
      const handle = ++id;
      callbacks.set(handle, () => { callbacks.delete(handle); deadlines.delete(handle); callback(); });
      deadlines.set(handle, time + delay);
      return handle as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: (handle) => { callbacks.delete(handle as unknown as number); deadlines.delete(handle as unknown as number); },
  });
  function advance(milliseconds: number) {
    const target = time + milliseconds;
    while (true) {
      const next = [...deadlines].filter(([, due]) => due <= target).sort((a, b) => a[1] - b[1])[0];
      if (!next) break;
      time = next[1]; callbacks.get(next[0])!();
    }
    time = target;
  }
  return { config, calls, controller, callbacks, advance, settle: () => { for (const callback of [...callbacks.values()]) callback(); } };
}
test('initial alignment and no-op selections do not publish a duration change', () => {
  const { controller, calls } = fixture(); controller.synchronize(); controller.scroll(0); controller.choose(5);
  assert.deepEqual(calls.values, []); assert.deepEqual(calls.offsets, [220, 220]); assert.deepEqual(calls.busy, []);
});
test('a drag without momentum settles and publishes only the nearest final row', () => {
  const { controller, calls, settle } = fixture(); controller.synchronize();
  controller.beginDrag(); controller.scroll(266); settle(); assert.deepEqual(calls.values, []);
  controller.release(); settle(); assert.deepEqual(calls.values, [6]); assert.deepEqual(calls.busy, [true, false]);
});
test('momentum supersedes release position and stale fallback callbacks', () => {
  const { controller, calls, callbacks } = fixture(); controller.synchronize(); controller.beginDrag();
  controller.scroll(264); controller.release(); const stale = [...callbacks.values()][0];
  controller.beginMomentum(); controller.scroll(440); stale(); assert.deepEqual(calls.values, []);
  controller.end(484); assert.deepEqual(calls.values, [11]); assert.deepEqual(calls.busy, [true, false]);
});

test('an obsolete momentum end cannot finish a newer active drag', () => {
  const { controller, calls, advance } = fixture(); controller.synchronize();
  controller.beginWheel(); controller.scroll(440);
  controller.beginDrag(); controller.scroll(484);
  controller.end(440); advance(200);
  assert.deepEqual(calls.values, []);
  assert.deepEqual(calls.busy, [true]);
  controller.release(); advance(160);
  assert.deepEqual(calls.values, [11]); assert.deepEqual(calls.busy, [true, false]);
});

test('recognized momentum survives idle gaps and accepts only the terminal row', () => {
  const { controller, calls, advance } = fixture(); controller.synchronize();
  controller.beginDrag(); controller.scroll(264); controller.release({ position: 280 });
  controller.beginMomentum(); controller.scroll(440); advance(200);
  assert.deepEqual(calls.values, []); assert.deepEqual(calls.busy, [true]);
  controller.scroll(484); advance(999);
  assert.deepEqual(calls.values, []);
  controller.end(528); advance(2000);
  assert.deepEqual(calls.values, [12]); assert.deepEqual(calls.busy, [true, false]);
  assert.equal(calls.offsets.at(-1), 528);
});

test('a missing momentum end recovers after inactivity, not total glide duration', () => {
  const { controller, calls, advance } = fixture(); controller.synchronize();
  controller.beginWheel(true); controller.scroll(440); advance(999);
  controller.scroll(484); advance(999);
  assert.deepEqual(calls.values, []); assert.deepEqual(calls.busy, [true]);
  // A stray release must not downgrade an already recognized coast to the idle delay.
  controller.release(); advance(1);
  assert.deepEqual(calls.values, [11]); assert.deepEqual(calls.busy, [true, false]);
});

test('no-offset terminal and missing-terminal paths both release busy without a write', () => {
  for (const terminal of [false, true]) {
    const { controller, calls, advance } = fixture(); controller.synchronize();
    controller.beginDrag(); controller.release({ waitForEnd: true });
    advance(999); assert.deepEqual(calls.busy, [true]);
    if (terminal) controller.end(220); else advance(1);
    assert.deepEqual(calls.values, []); assert.deepEqual(calls.busy, [true, false]);
  }
});

test('ordinary wheel fallback retains its short delay and renews on fresh input', () => {
  const { controller, calls, advance } = fixture(); controller.synchronize();
  controller.beginWheel(); controller.scroll(264); advance(159);
  controller.scroll(308); advance(159); assert.deepEqual(calls.values, []);
  advance(1); assert.deepEqual(calls.values, [7]);
});

test('native touch interruption, release and momentum events keep one busy interval', () => {
  const { controller, calls, advance } = fixture(); controller.synchronize();
  controller.beginDrag(); controller.scroll(440); controller.release({ position: 450 });
  controller.beginMomentum(); controller.scroll(484);
  controller.beginDrag(); controller.end(528); controller.beginMomentum();
  advance(1200); assert.deepEqual(calls.values, []);
  controller.scroll(400); controller.release({ position: 396 }); controller.release();
  controller.beginMomentum(); controller.scroll(350); controller.end(352);
  assert.deepEqual(calls.values, [8]); assert.deepEqual(calls.busy, [true, false]);
});

test('the final native drag offset is retained when touch-end arrives first', () => {
  const { controller, calls, advance } = fixture(); controller.synchronize();
  controller.beginDrag(); controller.scroll(264); controller.release();
  controller.release({ position: 308 }); advance(160);
  assert.deepEqual(calls.values, [7]);
});

test('explicit choice and background alignment request platform cancellation, normal settlement does not', () => {
  const { controller, calls } = fixture(); controller.synchronize();
  controller.beginWheel(true); controller.scroll(440); controller.choose(7);
  controller.beginDrag(); controller.scroll(484); controller.synchronize();
  controller.beginWheel(true); controller.end(352);
  assert.deepEqual(calls.cancellations, [false, true, true, false]);
});

test('explicit choice and synchronization invalidate coast timers and terminal callbacks', () => {
  for (const cancel of ['choose', 'synchronize', 'dispose'] as const) {
    const { controller, config, calls, callbacks, advance } = fixture(); controller.synchronize();
    controller.beginWheel(true); controller.scroll(440); const stale = [...callbacks.values()][0];
    if (cancel === 'choose') controller.choose(8);
    else if (cancel === 'synchronize') { config.value = 8; controller.synchronize(); }
    else controller.dispose();
    stale(); controller.beginMomentum(); controller.end(880); advance(2000);
    assert.deepEqual(calls.values, cancel === 'choose' ? [8] : []);
    assert.deepEqual(calls.busy, [true, false]); assert.equal(callbacks.size, 0);
  }
});
test('disabled or replaced configurations reject obsolete work and release busy state', () => {
  const { controller, config, calls, callbacks } = fixture(); controller.beginWheel(); controller.scroll(440);
  const stale = [...callbacks.values()][0]; config.disabled = true; controller.synchronize(); stale();
  controller.choose(7); controller.beginDrag(); controller.end(880);
  assert.deepEqual(calls.values, []); assert.deepEqual(calls.busy, [true, false]);
  config.disabled = false; config.value = 12; controller.synchronize();
  assert.equal(calls.offsets.at(-1), 528);
});
test('disposal and background realignment cannot revive old motion after activation', () => {
  const { controller, calls, callbacks } = fixture(); controller.beginWheel(); controller.scroll(440);
  const stale = [...callbacks.values()][0]; controller.dispose(); controller.activate(); controller.synchronize(); stale();
  assert.deepEqual(calls.values, []); assert.deepEqual(calls.busy, [true, false]); assert.equal(callbacks.size, 0);
});
test('explicit keyboard/accessibility selection contains endpoints and cancels pending motion', () => {
  const { controller, calls, callbacks } = fixture(); controller.beginWheel(); controller.scroll(440);
  const stale = [...callbacks.values()][0]; controller.choose(100); stale(); controller.choose(-1);
  assert.deepEqual(calls.values, [59, 0]); assert.deepEqual(calls.busy, [true, false]); assert.equal(callbacks.size, 0);
});
test('font or layout geometry realignment is silent and invalidates motion using the old row size', () => {
  const { controller, config, calls, callbacks } = fixture(); controller.synchronize();
  controller.beginWheel(); controller.scroll(440); const stale = [...callbacks.values()][0];
  config.rowHeight = 80; controller.synchronize(); stale();
  assert.deepEqual(calls.values, []); assert.equal(calls.offsets.at(-1), 400);
  assert.deepEqual(calls.busy, [true, false]); assert.equal(callbacks.size, 0);
  controller.beginDrag(); controller.scroll(480); controller.release();
  for (const callback of [...callbacks.values()]) callback();
  assert.deepEqual(calls.values, [6]); assert.equal(calls.offsets.at(-1), 480);
});
