import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWheelDeceleration, wheelDelta } from '../src/hooks/wheelDeceleration.ts';

function fixture(roundPixels = false) {
  const geometry = { rowHeight: 44, maximum: 59 };
  let position = 20 * 44, time = 0, id = 0;
  const frames = new Map<number, () => void>(), timers = new Map<number, { at: number; callback: () => void }>();
  const positions: number[] = [], ends: number[] = [], warnings: string[] = [];
  const driver = createWheelDeceleration({ geometry: () => geometry, read: () => position,
    write: (next) => { position = roundPixels ? Math.round(next) : next; positions.push(position); },
    reached: (target) => position === target, finish: (next) => ends.push(next), now: () => time,
    frame: (callback) => { frames.set(++id, callback); return id; }, cancel: (handle) => { frames.delete(handle); }, warn: (code) => warnings.push(code),
    delay: (callback, milliseconds) => { const handle = ++id; timers.set(handle, { at: time + milliseconds, callback }); return () => { timers.delete(handle); }; },
  });
  const advance = (milliseconds: number) => {
    time += milliseconds;
    for (const [handle, timer] of timers) if (timer.at <= time) { timers.delete(handle); timer.callback(); }
    const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback();
  };
  return { driver, geometry, frames, timers, positions, ends, warnings, advance, read: () => position };
}

test('wheel units use pixels, row lines and the actual column viewport', () => {
  assert.equal(wheelDelta(2, 0, 44, 132), 2); assert.equal(wheelDelta(-2, 1, 44, 132), -88);
  assert.equal(wheelDelta(1, 2, 70, 210), 210);
  for (const [delta, mode] of [[NaN, 0], [Infinity, 1], [3, 9]]) assert.equal(wheelDelta(delta, mode, 44, 132), 0);
});

for (const direction of [-1, 1]) test(`wheel motion in direction ${direction} ramps, tapers and centers exactly`, () => {
  const f = fixture(); f.driver.push(direction * 264);
  let previous = f.read(); const distances: number[] = [];
  for (let index = 0; index < 12; index++) {
    f.advance(50);
    assert.ok(direction * (f.read() - previous) > 0);
    distances.push(Math.abs(f.read() - previous)); previous = f.read();
  }
  assert.ok(distances[0] < distances[1] && distances[1] < distances[2]);
  assert.ok(distances.slice(2).every((distance, index) => index === 0 || distance < distances[index + 1]));
  assert.deepEqual(f.ends, []); f.advance(550);
  assert.equal(f.read(), (20 + direction * 6) * 44); assert.deepEqual(f.ends, [f.read()]);
  assert.equal(f.driver.isMoving(), false); assert.equal(f.frames.size, 0); assert.deepEqual(f.warnings, []);
});

for (const direction of [-1, 1]) test(`fast travel in direction ${direction} reaches 3–5% of launch before the final row`, () => {
  const f = fixture(), initial = f.read(), target = (20 + direction * 6) * 44;
  f.driver.push(direction * 264);
  f.advance(1);
  const launchSpeed = Math.abs(f.read() - initial);
  assert.ok(launchSpeed > 0.34 && launchSpeed < 0.36);
  for (const remaining of [3.5, 2]) {
    for (let elapsed = 1; elapsed < 1250 && Math.abs(target - f.read()) > remaining; elapsed++) f.advance(1);
    const checkpoint = f.read();
    assert.ok(Math.abs(target - checkpoint) > remaining - 0.1 && f.driver.isMoving());
    f.advance(1);
    const speedRatio = Math.abs(f.read() - checkpoint) / launchSpeed;
    assert.ok(speedRatio >= 0.03 && speedRatio <= 0.05, `at ${remaining} pixels remaining the speed was ${speedRatio} times launch`);
  }
  f.advance(100);
  assert.ok(Math.abs(target - f.read()) > 0.5);
  f.advance(400);
  assert.equal(f.read(), target); assert.deepEqual(f.ends, [target]);
});

test('one-row adjustment keeps its timing and large fast moves finish within the bounds', () => {
  for (const rows of [-14, -1, 1, 14]) {
    const f = fixture(), target = (20 + rows) * 44;
    f.driver.push(rows * 44);
    if (Math.abs(rows) === 1) {
      f.advance(381.5); assert.equal(f.driver.isMoving(), true); assert.deepEqual(f.ends, []);
      f.advance(1);
    } else {
      for (let elapsed = 0; elapsed < 950; elapsed += 25) f.advance(25);
      assert.equal(f.driver.isMoving(), true); assert.deepEqual(f.ends, []);
      for (let elapsed = 950; elapsed < 1250; elapsed += 25) f.advance(25);
    }
    assert.equal(f.read(), target); assert.deepEqual(f.ends, [target]);
    assert.equal(f.driver.isMoving(), false); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
  }
});

test('a quantized fast glide brakes visibly longer and finishes on its first centered frame', () => {
  const f = fixture(true), target = 26 * 44;
  f.driver.push(264);
  let firstTargetFrame = 0;
  for (let elapsed = 1; elapsed < 1250; elapsed++) {
    f.advance(1);
    if (f.read() !== target) { assert.deepEqual(f.ends, []); continue; }
    firstTargetFrame = elapsed;
    assert.deepEqual(f.ends, [target]);
    break;
  }
  const peakAt = 109.35, referenceStop = 734;
  const visibleExtension = (firstTargetFrame - peakAt) / (referenceStop - peakAt);
  assert.ok(visibleExtension >= 1.20 && visibleExtension <= 1.25, `visible braking ratio was ${visibleExtension}`);
  assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
});

test('a reversal can take over after the reference glide would already have centered', () => {
  const f = fixture(true), target = 26 * 44;
  f.driver.push(264);
  for (let elapsed = 0; elapsed < 800; elapsed += 16) f.advance(16);
  const visible = f.read(), stale = [...f.frames.values()][0];
  assert.ok(visible < target && f.driver.isMoving());
  f.driver.push(-44); stale(); f.advance(80);
  assert.ok(f.read() < visible);
  f.advance(500);
  assert.deepEqual(f.ends, [25 * 44]);
});

test('a short compatible wheel burst gets the longer approach and a late reversal owns the finish', () => {
  const f = fixture();
  for (let index = 0; index < 3; index++) { f.driver.push(88); f.advance(36); }
  const target = 26 * 44;
  while (f.driver.isMoving() && target - f.read() > 2) f.advance(16);
  const before = f.read();
  assert.ok(target - before > 1 && target - before <= 2, 'the burst is still moving inside the final two pixels');
  const stale = [...f.frames.values()][0];
  f.driver.push(-44); stale(); f.advance(50);
  assert.ok(f.read() < before);
  f.advance(1000);
  assert.deepEqual(f.ends, [25 * 44]);
});

test('irregular frames preserve the same elapsed-time trajectory', () => {
  const a = fixture(), b = fixture(); a.driver.push(264); b.driver.push(264);
  a.advance(100); b.advance(10); b.advance(20); b.advance(70); assert.equal(a.read(), b.read());
  a.advance(1000); b.advance(1000); assert.deepEqual(a.ends, b.ends);
});

test('fractional input accumulates and rapid retargeting starts at the displayed offset', () => {
  const f = fixture(); f.driver.push(44);
  for (let index = 0; index < 20; index++) f.driver.push(2.2);
  f.advance(40); const visible = f.read(), stale = [...f.frames.values()][0];
  f.driver.push(44); assert.equal(f.read(), visible); stale(); assert.deepEqual(f.ends, []);
  f.advance(1000); assert.equal(f.read(), 23 * 44); assert.deepEqual(f.ends, [23 * 44]);
});

test('compatible input carries speed after the wheel passes the raw delta toward its snap row', () => {
  const f = fixture(), raw = f.read() + 4.9 * 44;
  f.driver.push(4.9 * 44);
  while (f.driver.isMoving() && f.read() <= raw) f.advance(8);
  const previous = f.read(); f.advance(1);
  const speed = f.read() - previous, start = f.read();
  assert.ok(speed > 0.01);
  f.driver.push(44); f.advance(1);
  assert.ok(Math.abs((f.read() - start) - speed) < 0.01);
  f.advance(1000);
  assert.deepEqual(f.ends, [26 * 44]);
});

test('sub-row trackpad input accumulates even when the first target is the current row', () => {
  const f = fixture();
  for (let index = 0; index < 20; index++) { f.driver.push(2.2); f.advance(8); }
  f.advance(1000); assert.equal(f.read(), 21 * 44); assert.deepEqual(f.ends, [21 * 44]);
});

test('outward endpoint input stores no hidden distance and reversal works immediately', () => {
  const f = fixture(); f.driver.push(1e9, false); assert.equal(f.read(), 59 * 44);
  f.driver.push(1e9); f.driver.push(-44); f.advance(1000); assert.equal(f.read(), 58 * 44);
  f.driver.push(-1e9, false); f.driver.push(44); f.advance(1000); assert.equal(f.read(), 44);
});

test('reverse input replaces unfinished travel from the displayed position', () => {
  const f = fixture(); f.driver.push(14 * 44); f.advance(80);
  const visible = f.read(); f.driver.push(-44); f.advance(30);
  assert.ok(f.read() < visible, 'reverse input must reverse the visible motion');
  f.advance(1000); assert.equal(f.read(), Math.round((visible - 44) / 44) * 44);
});

test('stop, dispose and live immediate settlement fence old callbacks', () => {
  for (const method of ['stop', 'dispose', 'settle'] as const) {
    const f = fixture(); f.driver.push(264); const stale = [...f.frames.values()][0]; f.advance(50);
    f.driver[method](); const position = f.read(); stale(); f.advance(1000);
    assert.equal(f.read(), position); assert.equal(f.frames.size, 0);
    assert.equal(f.ends.length, method === 'settle' ? 1 : 0);
    if (method === 'dispose') assert.equal(f.driver.push(44), false);
  }
});

test('a missing animation frame still settles once and cannot revive after the deadline', () => {
  for (const lastGoodFrame of [0, 250]) {
    const f = fixture(); f.driver.push(14 * 44);
    if (lastGoodFrame) f.advance(lastGoodFrame);
    const lateFrame = [...f.frames.values()][0];
    f.frames.clear(); f.advance(939); assert.deepEqual(f.ends, []); assert.equal(f.driver.isMoving(), true);
    f.advance(1); assert.deepEqual(f.ends, [34 * 44]); assert.equal(f.driver.isMoving(), false);
    lateFrame(); f.advance(1000); assert.deepEqual(f.ends, [34 * 44]); assert.equal(f.timers.size, 0);
  }
});

test('immediate choices and invalid geometry cannot create hanging requests', () => {
  const f = fixture(); f.driver.push(264, false); assert.deepEqual(f.ends, [26 * 44]); assert.equal(f.frames.size, 0);
  f.geometry.rowHeight = 0; assert.equal(f.driver.push(44), false); assert.equal(f.driver.isMoving(), false);
});

test('scheduling failure and writer failure settle with bounded warnings', () => {
  let complete = 0; const warnings: string[] = [];
  const driver = createWheelDeceleration({ geometry: () => ({ rowHeight: 44, maximum: 59 }), read: () => 0,
    write: () => { throw Error('write'); }, finish: () => complete++, now: () => 0,
    frame: () => { throw Error('schedule'); }, cancel: () => {}, delay: () => () => {}, warn: (code) => warnings.push(code) });
  driver.push(44); driver.push(44); assert.equal(complete, 2); assert.equal(warnings.length, 2); assert.equal(driver.isMoving(), false);
});
