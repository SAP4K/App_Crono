import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BackupError, MAX_BACKUP_BYTES, importBackup, parseBackup, serializeBackup, utf8Bytes, type BackupErrorCode } from '../src/core/backup.ts';
import { initialData, restoreData } from '../src/core/stopwatch.ts';
import { MAX_SCHEDULES, startSchedule } from '../src/core/planning.ts';

const schedule = { id: 'source', name: 'Работа', steps: [{ id: 'action', name: 'Pauză', durationMs: 1000 }], calendar: { kind: 'weekly' as const, weekdays: [1, 3] as (1 | 3)[] } };
function data() { const value = initialData(); value.planning.schedules = [structuredClone(schedule)]; return value; }
const ids = () => ({ schedules: ['new-source'], steps: [['new-action']], sessions: [] });
const code = (expected: BackupErrorCode) => (error: unknown) => error instanceof BackupError && error.code === expected;

test('portable roundtrip whitelists saved records and preserves literal legacy data', () => {
  const legacyRaw = readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  const legacy = restoreData(legacyRaw);
  legacy.planning = startSchedule(data().planning, 'source', 1000, 'active');
  const raw = serializeBackup(legacy, 2000); const parsed = parseBackup(raw);
  assert.deepEqual(Object.keys(JSON.parse(raw)), ['format', 'version', 'exportedAt', 'schedules', 'sessions', 'preferences']);
  assert.equal(raw.includes('legacy-completed'), false); assert.equal(raw.includes('deadlineAt'), false);
  assert.deepEqual(parsed.sessions, legacy.sessions); assert.deepEqual(parsed.preferences, legacy.preferences);
  const imported = importBackup(legacy, parsed, { ...ids(), sessions: ['new-session'] });
  assert.equal(imported.timer, legacy.timer); assert.equal(imported.stopwatch, legacy.stopwatch); assert.equal(imported.planning.run, legacy.planning.run);
  assert.equal(imported.preferences, legacy.preferences); assert.equal(imported.sessions.length, 2);
  assert.deepEqual(imported.planning.schedules[1].calendar, schedule.calendar);
  assert.notEqual(imported.planning.schedules[1].calendar, parsed.schedules[0].calendar);
  assert.equal(imported.planning.schedules[1].steps[0].name, 'Pauză');
  const restored = restoreData(JSON.stringify(imported));
  assert.deepEqual(restored.sessions, imported.sessions); assert.deepEqual(restored.planning.schedules, imported.planning.schedules);
  assert.equal(readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'), legacyRaw);
});

test('strict parser rejects invalid records, preferences, versions and duplicate IDs as a whole', () => {
  const base = JSON.parse(serializeBackup(data(), 0));
  const corruptions = [
    (value: any) => { value.schedules[0].calendar.weekdays = [1, 1]; },
    (value: any) => { value.schedules[0].calendar = { kind: 'once', date: '2026-02-30' }; },
    (value: any) => { value.schedules[0].steps[0].durationMs = 0; },
    (value: any) => { value.schedules.push(value.schedules[0]); },
    (value: any) => { value.schedules[0].steps.push(value.schedules[0].steps[0]); },
    (value: any) => { value.preferences.language = 'xx'; },
    (value: any) => { delete value.preferences.timerSound; },
    (value: any) => { value.preferences.alertDurationSeconds = 10; },
    (value: any) => { value.preferences.alertSoundId = 'unknown'; },
    (value: any) => { value.sessions = [{ id: '', savedAt: 1, durationMs: 1, laps: [] }]; },
    (value: any) => { value.sessions = [{ id: 's', savedAt: 1, durationMs: 1, laps: [{ number: 1, elapsedMs: 1, splitMs: 2 }] }]; },
    (value: any) => { value.schedules[0].name = ' trim '; },
  ];
  for (const corrupt of corruptions) { const value = structuredClone(base); corrupt(value); assert.throws(() => parseBackup(JSON.stringify(value)), code('invalid')); }
  assert.throws(() => parseBackup(JSON.stringify({ ...base, version: 2 })), code('version'));
  assert.throws(() => parseBackup('{'), code('invalid'));
  assert.throws(() => parseBackup('null'), code('invalid'));
});

test('UTF-8 file limits use actual bytes including non-Latin characters', () => {
  assert.equal(utf8Bytes('AéЯ😀'), Buffer.byteLength('AéЯ😀'));
  const raw = serializeBackup(data(), 0);
  assert.doesNotThrow(() => parseBackup(raw + ' '.repeat(MAX_BACKUP_BYTES - Buffer.byteLength(raw))));
  assert.throws(() => parseBackup(raw + ' '.repeat(MAX_BACKUP_BYTES - Buffer.byteLength(raw) + 1)), code('size'));
  assert.throws(() => parseBackup('Я'.repeat(MAX_BACKUP_BYTES / 2 + 1)), code('size'));
});

test('merge rechecks capacity and IDs atomically, including orphan active-source IDs', () => {
  const backup = parseBackup(serializeBackup(data(), 1)); const current = initialData();
  const full = { ...current, planning: { ...current.planning, schedules: Array.from({ length: MAX_SCHEDULES }, (_, i) => ({ ...schedule, id: `existing-${i}` })) } };
  assert.throws(() => importBackup(full, backup, ids()), code('capacity')); assert.equal(full.planning.schedules.length, 20);
  assert.throws(() => importBackup(current, backup, { ...ids(), steps: [['source']] }), code('ids'));
  assert.throws(() => importBackup(current, backup, { ...ids(), steps: [['new-source']] }), code('ids'));
  current.planning = startSchedule(data().planning, 'source', 1000, 'run'); current.planning.schedules = [];
  assert.throws(() => importBackup(current, backup, { ...ids(), schedules: ['source'] }), code('ids'));
  const merged = importBackup(current, backup, ids()); assert.equal(merged.planning.run, current.planning.run);
  const twice = importBackup(merged, backup, { schedules: ['second-source'], steps: [['second-action']], sessions: [] });
  assert.equal(twice.planning.schedules.length, 2); assert.equal(twice.planning.run, current.planning.run);
});

test('preference import is optional and empty unchanged imports are true no-ops', () => {
  const current = initialData(); const source = initialData(); source.preferences.language = 'ru';
  const backup = parseBackup(serializeBackup(source, 0)); const emptyIds = { schedules: [], steps: [], sessions: [] };
  assert.equal(importBackup(current, backup, emptyIds), current);
  const changed = importBackup(current, backup, emptyIds, true);
  assert.equal(changed.preferences.language, 'ru'); assert.equal(changed.timer, current.timer);
  assert.equal(importBackup(changed, backup, emptyIds, true), changed);
});

test('a fully populated valid saved history fits the portable envelope without dropping records', () => {
  const value = data();
  value.sessions = Array.from({ length: 50 }, (_, i) => ({ id: `history-${i}`, savedAt: i, durationMs: 1000000,
    laps: Array.from({ length: 1000 }, (_, lap) => ({ number: lap + 1, elapsedMs: (lap + 1) * 1000, splitMs: 1000 })) }));
  value.planning.schedules = Array.from({ length: 20 }, (_, i) => ({ id: `schedule-${i}`, name: 'Я'.repeat(80),
    steps: Array.from({ length: 50 }, (_, step) => ({ id: `action-${step}`, name: 'Я'.repeat(80), durationMs: 86399000 })) }));
  const raw = serializeBackup(value, 0); const parsed = parseBackup(raw);
  assert.equal(parsed.sessions.length, 50); assert.equal(parsed.sessions[49].laps.length, 1000);
  assert.equal(parsed.schedules.length, 20); assert.equal(parsed.schedules[19].steps.length, 50);
});

test('fresh imported session IDs must remain valid after persistence and reload', () => {
  const source = initialData(); source.sessions = [{ id: 'history', savedAt: 1, durationMs: 1000, laps: [] }];
  const backup = parseBackup(serializeBackup(source, 0)); const current = initialData();
  assert.throws(() => importBackup(current, backup, { schedules: [], steps: [], sessions: ['x'.repeat(100)] }), code('ids'));
  assert.deepEqual(current.sessions, []);
});
