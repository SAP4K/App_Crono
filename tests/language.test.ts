import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LANGUAGES, restoreLanguage } from '../src/core/language.ts';
import { initialData, restoreData } from '../src/core/stopwatch.ts';
import { pauseSchedule, startSchedule } from '../src/core/planning.ts';
import { configureTimer, pauseTimer, startTimer } from '../src/core/timer.ts';

test('Settings languages follow display order and restore by ID with Romanian as the fallback', () => {
  assert.equal(initialData().preferences.language, 'ro');
  for (const { id } of LANGUAGES) assert.equal(restoreLanguage(id), id);
  for (const input of [undefined, null, true, 1, {}, [], 'RU', 'xx', 'ru-RU', 'ES', 'FR', 'DE', 'es-ES', 'fr-FR', 'de-DE']) assert.equal(restoreLanguage(input), 'ro');
  assert.deepEqual(LANGUAGES, [
    { id: 'en', label: 'English', locale: 'en-GB' },
    { id: 'es', label: 'Español', locale: 'es-ES' },
    { id: 'fr', label: 'Français', locale: 'fr-FR' },
    { id: 'ru', label: 'Русский', locale: 'ru-RU' },
    { id: 'de', label: 'Deutsch', locale: 'de-DE' },
    { id: 'ro', label: 'Română', locale: 'ro-RO' },
  ]);
});

test('language restoration preserves the literal legacy clocks/history and false preferences', () => {
  const raw = readFileSync(new URL('./fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  const legacy = JSON.parse(raw);
  const baseline = restoreData(raw);
  for (const language of [...LANGUAGES.map(({ id }) => id), null, 'unsupported', 5]) {
    const restored = restoreData(JSON.stringify({ ...legacy, preferences: { ...legacy.preferences, language } }));
    assert.deepEqual(restored.stopwatch, legacy.stopwatch);
    assert.deepEqual(restored.timer, legacy.timer);
    assert.deepEqual(restored.sessions, legacy.sessions);
    assert.deepEqual(restored.preferences, { ...baseline.preferences, language: restoreLanguage(language) });
    assert.deepEqual(restoreData(JSON.stringify(restored)), restored);
  }
});

for (const { id: language } of LANGUAGES) {
  for (const timerStatus of ['running', 'paused'] as const) {
    for (const scheduleStatus of ['running', 'paused'] as const) {
      test(`language ${language} restores ${timerStatus} timer and ${scheduleStatus} schedule`, () => {
        const data = initialData();
        data.preferences.language = language;
        data.stopwatch.startedAt = 1000;
        data.timer = startTimer(configureTimer(data.timer, 10000), 1000, 'timer');
        data.planning.schedules = [{ id: 's', name: 'Учёба · Școală · École', steps: [
          { id: 'a', name: 'Acțiune · Übung', durationMs: 10000 },
          { id: 'b', name: 'Pauză · Español', durationMs: 5000 },
        ] }];
        data.planning = startSchedule(data.planning, 's', 1000, 'run');
        if (timerStatus === 'paused') data.timer = pauseTimer(data.timer, 2234);
        if (scheduleStatus === 'paused') data.planning = pauseSchedule(data.planning, 2234);

        const restored = restoreData(JSON.stringify(data), 3000);
        assert.equal(restored.timer.status, timerStatus);
        assert.equal(restored.planning.run?.status, scheduleStatus);
        assert.equal(restored.timer.remainingMs, timerStatus === 'paused' ? 8766 : 10000);
        assert.equal(restored.planning.run?.remainingMs, scheduleStatus === 'paused' ? 8766 : 10000);
        assert.equal(restored.timer.deadlineAt, timerStatus === 'paused' ? null : 11000);
        assert.equal(restored.planning.run?.deadlineAt, scheduleStatus === 'paused' ? null : 11000);
        assert.equal(restored.timer.runId, 'timer');
        assert.equal(restored.planning.run?.runId, 'run');
        assert.deepEqual(restored, data);
        assert.deepEqual(restoreData(JSON.stringify(restored), 5000), data);
      });
    }
  }
}
