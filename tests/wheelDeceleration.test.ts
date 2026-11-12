import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWheelDeceleration, wheelDelta } from '../src/hooks/wheelDeceleration.ts';

function fixture() {
  const geometry = { rowHeight: 44, maximum: 59 };
  let position = 20 * 44, time = 0, id = 0;
  const frames = new Map<number, () => void>(), timers = new Map<number, { at: number; callback: () => void }>();
  const positions: number[] = [], ends: number[] = [], warnings: string[] = [];
  const driver = createWheelDeceleration({ geometry: () => geometry, read: () => position,
    write: (next) => { position = next; positions.push(next); }, finish: (next) => ends.push(next), now: () => time,
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

for (const direction of [-1, 1]) test(`slowing in direction ${direction} is progressive, finite and exactly centered`, () => {
  const f = fixture(); f.driver.push(direction * 264);
  let previous = f.read(); const distances: number[] = [];
  for (let index = 0; index < 6; index++) { f.advance(75); distances.push(Math.abs(f.read() - previous)); previous = f.read(); }
  assert.ok(distances[0] > distances[2] && distances[2] > distances[4]);
  assert.deepEqual(f.ends, []); f.advance(117);
  assert.equal(f.read(), (20 + direction * 6) * 44); assert.deepEqual(f.ends, [f.read()]);
  assert.equal(f.driver.isMoving(), false); assert.equal(f.frames.size, 0); assert.deepEqual(f.warnings, []);
});

for (const direction of [-1, 1]) test(`six-row travel in direction ${direction} moves gently and settles at 567 ms`, () => {
  const f = fixture(), initial = f.read(); f.driver.push(direction * 264);
  f.advance(50);
  const distance = Math.abs(f.read() - initial);
  assert.ok(distance > 60 && distance < 70, 'first 50 ms must move less than the former 73 px');
  f.advance(436);
  assert.equal(f.driver.isMoving(), true, 'the old 486 ms endpoint must still be moving');
  assert.deepEqual(f.ends, []);
  f.advance(80); assert.equal(f.driver.isMoving(), true);
  f.advance(1); assert.equal(f.read(), (20 + direction * 6) * 44);
  assert.deepEqual(f.ends, [f.read()]); assert.equal(f.driver.isMoving(), false);
  f.advance(1000); assert.deepEqual(f.ends, [f.read()]);
});

test('short and capped travel have bounded longer coasts in either direction', () => {
  for (const [rows, duration] of [[-14, 840], [-1, 357], [1, 357], [14, 840]]) {
    const f = fixture(); f.driver.push(rows * 44);
    f.advance(duration - 1); assert.equal(f.driver.isMoving(), true); assert.deepEqual(f.ends, []);
    f.advance(1); assert.equal(f.read(), (20 + rows) * 44); assert.deepEqual(f.ends, [f.read()]);
    assert.equal(f.driver.isMoving(), false); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
  }
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
  const f = fixture(); f.driver.push(14 * 44); const lateFrame = [...f.frames.values()][0];
  f.frames.clear(); f.advance(879); assert.deepEqual(f.ends, []); assert.equal(f.driver.isMoving(), true);
  f.advance(1); assert.deepEqual(f.ends, [34 * 44]); assert.equal(f.driver.isMoving(), false);
  lateFrame(); f.advance(1000); assert.deepEqual(f.ends, [34 * 44]); assert.equal(f.timers.size, 0);
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
