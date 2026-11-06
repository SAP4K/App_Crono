import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDurationWheel } from '../src/hooks/durationWheel.ts';
function fixture() {
  const config = { value: 5, maximum: 59, rowHeight: 44, disabled: false };
  const calls = { values: [] as number[], busy: [] as boolean[], offsets: [] as number[] };
  let id = 0; const callbacks = new Map<number, () => void>();
  const controller = createDurationWheel({ configuration: () => config,
    select: (value) => { calls.values.push(value); config.value = value; }, busy: (value) => calls.busy.push(value),
    align: (offset) => calls.offsets.push(offset),
    schedule: (callback) => { callbacks.set(++id, callback); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (handle) => { callbacks.delete(handle as unknown as number); },
  });
  return { config, calls, controller, callbacks, settle: () => { for (const callback of [...callbacks.values()]) callback(); } };
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
  controller.beginWheel(); controller.scroll(440); stale(); assert.deepEqual(calls.values, []);
  controller.end(484); assert.deepEqual(calls.values, [11]); assert.deepEqual(calls.busy, [true, false]);
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
