import { sessionText } from '../src/i18n/formatters.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { elapsed, emptyStopwatch, formatTime, initialData, lapStats, MAX_SESSIONS, pause, recordLap, restoreData, saveSession, start } from '../src/core/stopwatch.ts';

test('start is idempotent, including a timestamp of zero', () => {
  const state = start(emptyStopwatch(), 0);
  assert.equal(elapsed(state, 1510), 1510);
  assert.equal(start(state, 1000), state);
});

test('pause and resume exclude paused time across repeated cycles', () => {
  let state = pause(start(emptyStopwatch(), 1000), 2500);
  assert.equal(elapsed(state, 9000), 1500);
  assert.equal(pause(state, 10000), state);
  state = pause(start(state, 10000), 11250);
  assert.equal(elapsed(state, 99999), 2750);
});

test('background time is derived from timestamps without interval ticks', () => {
  const state = start(emptyStopwatch(), 1000);
  assert.equal(elapsed(state, 3601000), 3600000);
});

test('laps are cumulative and split correctly across pauses', () => {
  let state = recordLap(start(emptyStopwatch(), 1000), 2250);
  state = pause(state, 3000);
  assert.equal(recordLap(state, 4000), state);
  state = recordLap(start(state, 5000), 6500);
  assert.deepEqual(state.laps, [
    { number: 1, elapsedMs: 1250, splitMs: 1250 },
    { number: 2, elapsedMs: 3500, splitMs: 2250 },
  ]);
});

test('duplicate lap taps cannot create zero or negative splits', () => {
  const state = recordLap(start(emptyStopwatch(), 1000), 2000);
  assert.equal(recordLap(state, 2000), state);
  assert.equal(recordLap(state, 1900), state);
});

test('save keeps the exact paused duration and resets only the active session', () => {
  const data = initialData();
  data.stopwatch = pause(recordLap(start(emptyStopwatch(), 1000), 2000), 3500);
  const next = saveSession(data, 5000);
  assert.equal(next.sessions[0].durationMs, 2500);
  assert.equal(next.sessions[0].laps[0].splitMs, 1000);
  assert.deepEqual(next.stopwatch, emptyStopwatch());
  assert.equal(data.sessions.length, 0);
  assert.equal(data.stopwatch.accumulatedMs, 2500);
});

test('empty and running sessions cannot be saved', () => {
  const data = initialData();
  assert.equal(saveSession(data, 1000), data);
  data.stopwatch = start(emptyStopwatch(), 1000);
  assert.equal(saveSession(data, 3000), data);
});

test('history retains the newest 50 sessions', () => {
  let data = initialData();
  for (let index = 1; index <= 52; index++) {
    data = saveSession({ ...data, stopwatch: { accumulatedMs: index * 1000, startedAt: null, laps: [] } }, index * 10000);
  }
  assert.equal(data.sessions.length, MAX_SESSIONS);
  assert.equal(data.sessions[0].durationMs, 52000);
  assert.equal(data.sessions.at(-1)?.durationMs, 3000);
});

test('time formatting handles centiseconds, minute/hour rollover, and long sessions', () => {
  for (const [ms, result] of [[0, '00:00.00'], [9, '00:00.00'], [10, '00:00.01'], [59999, '00:59.99'], [60000, '01:00.00'], [3600010, '01:00:00.01'], [360000000, '100:00:00.00'], [-20, '00:00.00']] as const) {
    assert.equal(formatTime(ms), result);
  }
});

test('restoring a running session includes time while the app was closed', () => {
  const data = initialData();
  data.stopwatch = recordLap(start(emptyStopwatch(), 1000), 2000);
  const restored = restoreData(JSON.stringify(data), 11000);
  assert.equal(elapsed(restored.stopwatch, 11000), 10000);
  assert.deepEqual(restored.stopwatch.laps, data.stopwatch.laps);
});

test('malformed persisted data and unsupported schema versions fail safely', () => {
  for (const raw of [null, '{bad', 'null', '[]', '{"version":2}', '{"version":1,"stopwatch":{"accumulatedMs":-2,"startedAt":null,"laps":[]}}']) {
    assert.deepEqual(restoreData(raw), initialData());
  }
});

test('restore filters corrupt history and keeps valid preferences', () => {
  const data = saveSession({ ...initialData(), stopwatch: { accumulatedMs: 1000, startedAt: null, laps: [] } }, 2000);
  const raw = JSON.stringify({ ...data, preferences: { haptics: false, keepAwake: true }, sessions: [...data.sessions, { id: 'bad', savedAt: 2, durationMs: 50, laps: [{ number: 1, elapsedMs: 100, splitMs: 100 }] }] });
  const restored = restoreData(raw, 3000);
  assert.equal(restored.sessions.length, 1);
  assert.equal(restored.preferences.haptics, false);
  assert.equal(restored.preferences.keepAwake, true);
});

test('lap statistics and share text reflect recorded values', () => {
  const data = initialData();
  data.stopwatch = pause(recordLap(recordLap(start(emptyStopwatch(), 1000), 2000), 4000), 4500);
  const session = saveSession(data, 5000).sessions[0];
  assert.deepEqual(lapStats(session.laps), { best: 1000, slowest: 2000, average: 1500 });
  assert.equal(lapStats([]), null);
  assert.match(sessionText(session), /Timp total: 00:03\.50/);
  assert.match(sessionText(session), /Tura 2: 00:02\.00 · Total 00:03\.00/);
});

test('a backwards clock cannot produce a negative elapsed value', () => {
  assert.equal(elapsed(start(emptyStopwatch(), 2000), 1000), 0);
});

test('theme defaults and restoration preserve legacy stopwatch data independently', () => {
  const data = saveSession({ ...initialData(), stopwatch: { accumulatedMs: 1000, startedAt: null, laps: [] } }, 2000);
  const stopwatch = recordLap(start(emptyStopwatch(), 3000), 4000);
  const legacy = { ...data, stopwatch, preferences: { haptics: false, keepAwake: false } };
  const restored = restoreData(JSON.stringify(legacy), 5000);
  assert.equal(initialData().preferences.theme, 'light');
  assert.deepEqual(restored, { ...data, stopwatch, preferences: { ...initialData().preferences, haptics: false, keepAwake: false, theme: 'light', timerSound: true } });
  for (const theme of ['light', 'dark'] as const) {
    assert.equal(restoreData(JSON.stringify({ ...legacy, preferences: { ...legacy.preferences, theme } }), 5000).preferences.theme, theme);
  }
  for (const theme of [null, 5, {}, true, 'system', 'DARK']) {
    const result = restoreData(JSON.stringify({ ...legacy, preferences: { ...legacy.preferences, theme } }), 5000);
    assert.equal(result.preferences.theme, 'light');
    assert.deepEqual(result.sessions, legacy.sessions);
    assert.deepEqual(result.stopwatch, stopwatch);
    assert.equal(result.preferences.haptics, false);
  }
});

test('timer and sound restore independently without changing legacy sessions or stopwatch', () => {
  const data = saveSession({ ...initialData(), stopwatch: { accumulatedMs: 1000, startedAt: null, laps: [] } }, 2000);
  const legacy = { version: 1, stopwatch: start(emptyStopwatch(), 3000), sessions: data.sessions, preferences: { theme: 'dark', haptics: false, keepAwake: false } };
  const restored = restoreData(JSON.stringify(legacy), 5000);
  assert.deepEqual(restored.timer, initialData().timer);
  assert.equal(restored.preferences.timerSound, true);
  for (const timer of [null, {}, { ...restored.timer, status: 'running' }]) {
    const result = restoreData(JSON.stringify({ ...legacy, timer, preferences: { ...legacy.preferences, timerSound: false } }), 5000);
    assert.deepEqual(result.stopwatch, legacy.stopwatch);
    assert.deepEqual(result.sessions, legacy.sessions);
    assert.equal(result.preferences.theme, 'dark');
    assert.equal(result.preferences.timerSound, false);
    assert.equal(result.preferences.haptics, false);
  }
  const activeTimer = { ...restored.timer, status: 'running', deadlineAt: 4000, runId: 'overdue' };
  const result = restoreData(JSON.stringify({ ...legacy, timer: activeTimer }), 5000);
  assert.deepEqual(result.timer, activeTimer);
  assert.deepEqual(saveSession({ ...result, stopwatch: { accumulatedMs: 1234, startedAt: null, laps: [] } }, 6000).timer, activeTimer);
  assert.equal(restoreData(JSON.stringify({ ...legacy, preferences: { timerSound: 'false' } })).preferences.timerSound, true);
});

test('literal pre-planning v1 data retains all clocks, history, theme and false settings', () => {
  const raw = readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  const legacy = JSON.parse(raw);
  const restored = restoreData(raw);
  assert.deepEqual(restored.stopwatch, legacy.stopwatch);
  assert.deepEqual(restored.timer, legacy.timer);
  assert.deepEqual(restored.sessions, legacy.sessions);
  assert.deepEqual(restored.preferences, { ...legacy.preferences, systemNotifications: true, language: 'ro', alertSoundId: 'classic', alertDurationSeconds: 60 });
  assert.deepEqual(restored.planning, { schedules: [], run: null });
  const valid = { id: 'sequence', name: 'Orar', steps: [{ id: 'step', name: 'Respiră', durationMs: 1000 }] };
  const mixed = restoreData(JSON.stringify({ ...legacy, planning: { schedules: [valid, {}], run: {} }, preferences: { ...legacy.preferences, alertSoundId: 'gong', alertDurationSeconds: '30' } }));
  assert.deepEqual(mixed.planning, { schedules: [valid], run: null });
  assert.equal(mixed.preferences.alertSoundId, 'gong');
  assert.equal(mixed.preferences.alertDurationSeconds, 60);
  assert.equal(mixed.preferences.timerSound, false);
  assert.deepEqual(restoreData(JSON.stringify(mixed)), mixed);
  for (const duration of [5, 15, 30]) {
    const saved = { ...legacy, preferences: { ...legacy.preferences, alertDurationSeconds: duration } };
    const result = restoreData(JSON.stringify(saved));
    assert.equal(result.preferences.alertDurationSeconds, duration);
    assert.deepEqual(result.stopwatch, legacy.stopwatch);
    assert.deepEqual(result.sessions, legacy.sessions);
    assert.equal(result.preferences.timerSound, false);
    assert.deepEqual(restoreData(JSON.stringify(result)), result);
  }
});

test('system notification opt-in restores independently and preserves the literal legacy data', () => {
  const raw = readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  const legacy = JSON.parse(raw);
  for (const value of [undefined, null, false, true, 'false', 0]) {
    const restored = restoreData(JSON.stringify({ ...legacy, preferences: { ...legacy.preferences, systemNotifications: value } }));
    assert.equal(restored.preferences.systemNotifications, typeof value === 'boolean' ? value : true);
    assert.deepEqual(restored.stopwatch, legacy.stopwatch);
    assert.deepEqual(restored.timer, legacy.timer);
    assert.deepEqual(restored.sessions, legacy.sessions);
    assert.equal(restored.preferences.haptics, false);
    assert.deepEqual(restoreData(JSON.stringify(restored)), restored);
  }
});
