import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LANGUAGES, restoreLanguage } from '../src/core/language.ts';
import { initialData, restoreData } from '../src/core/stopwatch.ts';
import { startSchedule } from '../src/core/planning.ts';

test('manual language defaults to Romanian and only accepts registered IDs', () => {
  assert.equal(initialData().preferences.language, 'ro');
  for (const { id } of LANGUAGES) assert.equal(restoreLanguage(id), id);
  for (const input of [undefined, null, true, 1, {}, [], 'RU', 'de', 'ru-RU']) assert.equal(restoreLanguage(input), 'ro');
});

test('language restoration preserves the literal legacy clocks/history and false preferences', () => {
  const raw = readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  const legacy = JSON.parse(raw);
  const baseline = restoreData(raw);
  for (const language of ['ro', 'en', 'ru', null, 'unsupported', 5]) {
    const restored = restoreData(JSON.stringify({ ...legacy, preferences: { ...legacy.preferences, language } }));
    assert.deepEqual(restored.stopwatch, legacy.stopwatch);
    assert.deepEqual(restored.timer, legacy.timer);
    assert.deepEqual(restored.sessions, legacy.sessions);
    assert.deepEqual(restored.preferences, { ...baseline.preferences, language: restoreLanguage(language) });
    assert.deepEqual(restoreData(JSON.stringify(restored)), restored);
  }
});

test('language selection restores independently from running/paused countdown and schedule snapshots', () => {
  const data = initialData();
  data.stopwatch.startedAt = 1000;
  data.timer = { status: 'running', durationMs: 10000, remainingMs: 10000, deadlineAt: 11000, runId: 'timer' };
  data.planning.schedules = [{ id: 's', name: 'Учёба · Școală', steps: [{ id: 'a', name: 'Acțiune', durationMs: 10000 }] }];
  data.planning = startSchedule(data.planning, 's', 1000, 'run');
  for (const language of ['en', 'ru']) {
    const restored = restoreData(JSON.stringify({ ...data, preferences: { ...data.preferences, language } }), 2000);
    assert.deepEqual(restored, { ...data, preferences: { ...data.preferences, language } });
  }
  data.timer = { ...data.timer, status: 'paused', deadlineAt: null, remainingMs: 9000 };
  const restored = restoreData(JSON.stringify({ ...data, preferences: { ...data.preferences, language: 'ru' } }), 2000);
  assert.deepEqual(restored.timer, data.timer);
  assert.deepEqual(restored.planning, data.planning);
});
