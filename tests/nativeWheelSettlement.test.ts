import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDurationWheel } from '../src/hooks/durationWheel.ts';
import { acceptsWheelTerminal, createNativeWheelSettlement } from '../src/hooks/wheelSettlement.ts';

function fixture() {
  const config = { value: 5, maximum: 59, rowHeight: 50, disabled: false };
  const values: number[] = [], busy: boolean[] = [], trace: { event: string; at: number }[] = [];
  const pending = new Map<number, { at: number; callback: () => void }>();
  let now = 0, id = 0, position = 250;
  const controller = createDurationWheel({ configuration: () => config,
    align: (offset) => { position = offset; },
    select: (value) => { trace.push({ event: 'select', at: now }); values.push(value); config.value = value; },
    busy: (value) => { trace.push({ event: `busy:${value}`, at: now }); busy.push(value); },
    schedule: (callback, delay) => { pending.set(++id, { at: now + delay, callback }); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (handle) => { pending.delete(handle as unknown as number); },
  });
  return { config, controller, values, busy, trace, pending,
    scroll: (offset: number) => { position = offset; controller.scroll(offset); },
    end: (offset: number, takeover?: number) => {
      trace.push({ event: 'terminal', at: now });
      if (acceptsWheelTerminal(offset, { presenting: false, position, takeover }, true)) controller.end(offset);
    },
    advance: (milliseconds: number) => {
      now += milliseconds;
      for (const [key, task] of [...pending]) if (task.at <= now) { pending.delete(key); task.callback(); }
    },
  };
}

test('a confirmed native terminal accepts its newer final offset without a recovery wait', () => {
  const f = fixture(); f.controller.beginDrag(); f.scroll(300); f.controller.release({ position: 300 });
  f.controller.beginMomentum(); f.scroll(349); f.end(350);
  assert.deepEqual(f.values, [7], JSON.stringify(f.trace));
  assert.deepEqual(f.busy, [true, false]); f.advance(1000); assert.deepEqual(f.values, [7]);
});

test('a confirmed native terminal finishes a small manual takeover without the half-row gate', () => {
  const f = fixture(); f.controller.beginDrag(); f.scroll(260); f.controller.release({ position: 260 });
  f.controller.beginMomentum(); f.end(250, 250);
  assert.deepEqual(f.busy, [true, false], JSON.stringify(f.trace));
  assert.deepEqual(f.values, []);
});

test('unverified and browser terminals retain cached-position and cancelled-presentation guards', () => {
  assert.equal(acceptsWheelTerminal(350, { presenting: false, position: 349 }), false);
  assert.equal(acceptsWheelTerminal(350, { presenting: false, position: 350, takeover: 350 }), false);
  assert.equal(acceptsWheelTerminal(350, { presenting: true, position: 350 }, true), false);
  assert.equal(acceptsWheelTerminal(350, { presenting: false, position: 350 }), true);
});

test('native proof requires a released gesture and an ordered finite native timestamp', () => {
  const native = createNativeWheelSettlement(() => {});
  assert.equal(native.confirm(350, 15), false);
  native.begin(20); native.observe(349, 30);
  assert.equal(native.confirm(350, 40), false); // The finger is still down.
  native.release(35);
  for (const time of [10, 29, undefined, NaN, Infinity]) assert.equal(native.confirm(350, time), false);
  assert.equal(native.hasGesture(), true);
  assert.equal(native.confirm(350, 40), true); assert.equal(native.read(), 350);
  assert.equal(native.confirm(350, 40), false); // Duplicate delivery has no native proof.
});

test('cancellation and a newer gesture reject a queued programmatic terminal', () => {
  const native = createNativeWheelSettlement(() => {});
  native.begin(10); native.release(15); native.cancel();
  assert.equal(native.confirm(1250, 20), false);
  native.begin(30); assert.equal(native.confirm(1250, 20), false);
  native.release(40); native.observe(260, 45);
  assert.equal(native.confirm(1250, 20), false); // End created before the current drag.
  assert.equal(native.confirm(250, 50), true); // Small takeover still ends promptly.
});

test('missing timestamps retain conservative recovery rather than invent native proof', () => {
  const native = createNativeWheelSettlement(() => {});
  native.begin(undefined); native.observe(350, 20); native.release(30);
  assert.equal(native.confirm(350, 40), false);
  native.cancel(); assert.equal(native.hasGesture(), false);
  native.begin(50); native.release(60);
  assert.equal(native.confirm(NaN, 70), false); assert.equal(native.confirm(350, 70), true);
});

test('observed alignment avoids repeat commands while initial and explicit alignment remain effective', () => {
  const commands: number[] = [], native = createNativeWheelSettlement((offset) => commands.push(offset));
  native.align(250); native.align(250);
  assert.deepEqual(commands, [250, 250]); // Neither pre-layout request proves a native offset.
  native.observe(250, 10); native.align(250); assert.deepEqual(commands, [250, 250]);
  native.align(250, true); native.align(300);
  assert.deepEqual(commands, [250, 250, 250, 300]);
  native.observe(300, 20); native.align(300); assert.equal(commands.length, 4);
});

test('composed native policy accepts a newer terminal once and needs no acknowledged-value scroll', () => {
  const commands: number[] = [], native = createNativeWheelSettlement((offset) => commands.push(offset));
  const config = { value: 5, maximum: 59, rowHeight: 50 };
  const values: number[] = [], busy: boolean[] = [];
  const pending = new Map<number, () => void>(); let id = 0;
  const controller = createDurationWheel({ configuration: () => config, align: native.align,
    select: (value) => { values.push(value); config.value = value; }, busy: (value) => busy.push(value),
    schedule: (callback) => { pending.set(++id, callback); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (handle) => { pending.delete(handle as unknown as number); },
  });
  controller.beginDrag(); native.begin(10); native.observe(349, 20); controller.scroll(349);
  native.release(25); controller.release({ position: 349 }); controller.beginMomentum();
  assert.equal(native.confirm(350, 30), true);
  assert.equal(acceptsWheelTerminal(350, { presenting: false, takeover: 345, position: 349 }, true), true);
  controller.end(350); controller.synchronize(); controller.end(350);
  assert.deepEqual(values, [7]); assert.deepEqual(busy, [true, false]);
  assert.deepEqual(commands, []); assert.equal(pending.size, 0);
});

test('even confirmed terminals cannot finish a held drag or an invalidated controller', () => {
  for (const stop of ['hold', 'disable', 'dispose'] as const) {
    const f = fixture(); f.controller.beginDrag(); f.scroll(350);
    if (stop === 'disable') { f.config.disabled = true; f.controller.synchronize(); }
    if (stop === 'dispose') f.controller.dispose();
    f.end(350); f.advance(2000);
    assert.deepEqual(f.values, []);
    assert.deepEqual(f.busy, stop === 'hold' ? [true] : [true, false]);
  }
});

test('a stale or unverified release cannot provide proof for the current native gesture', () => {
  for (const time of [50, undefined, NaN, Infinity, -Infinity, '130']) {
    const native = createNativeWheelSettlement(() => {});
    native.begin(100); native.observe(349, 110); native.release(time);
    assert.equal(native.confirm(350, 120), false, `[FIX:native-release] invalid release: ${String(time)}`);
    assert.equal(native.read(), 349);
    native.release(130);
    assert.equal(native.confirm(350, 140), true, '[FIX:native-release] a later valid release still works');
  }
});

test('a delayed valid release may precede the latest observed scroll timestamp', () => {
  const native = createNativeWheelSettlement(() => {});
  native.begin(100); native.observe(349, 160); native.release(150);
  assert.equal(native.confirm(350, 155), false);
  assert.equal(native.confirm(350, 170), true);
});

test('native drag, release and terminal may share one clock tick', () => {
  const native = createNativeWheelSettlement(() => {});
  native.begin(100); native.release(100);
  assert.equal(native.confirm(350, 100), true);
});

test('invalid native scroll-end-drag delivery cannot arm recovery or unlock a newer held drag', () => {
  for (const time of [50, undefined, NaN]) {
    const f = fixture(), native = createNativeWheelSettlement(() => {});
    f.controller.beginWheel(true); f.scroll(300);
    const obsolete = [...f.pending.values()][0].callback;
    f.controller.beginDrag(); native.begin(100); native.observe(349, 110); f.scroll(349);
    // This is the production adapter's release gate, not a physical touch release.
    if (native.release(time)) f.controller.release({ position: 349 });
    f.controller.beginMomentum();
    if (native.confirm(350, 120)) f.end(350);
    obsolete(); f.advance(2000);
    assert.deepEqual(f.values, [], `[FIX:native-release] ${JSON.stringify(f.trace)}`);
    assert.deepEqual(f.busy, [true]);
    if (native.release(130)) f.controller.release({ position: 349 });
    f.controller.beginMomentum();
    if (native.confirm(350, 140)) f.end(350);
    assert.deepEqual(f.values, [7], '[FIX:native-release] valid release must reach the manual controller');
    assert.deepEqual(f.busy, [true, false]);
    obsolete(); f.advance(2000); assert.deepEqual(f.values, [7]);
  }
});

test('a valid native release retains missing-terminal recovery', () => {
  const f = fixture(), native = createNativeWheelSettlement(() => {});
  f.controller.beginDrag(); native.begin(100); native.observe(350, 110); f.scroll(350);
  if (native.release(120)) f.controller.release({ position: 350 });
  f.controller.beginMomentum(); f.advance(999);
  assert.deepEqual(f.values, []); assert.deepEqual(f.busy, [true]);
  f.advance(1); assert.deepEqual(f.values, [7]); assert.deepEqual(f.busy, [true, false]);
});
