import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LANGUAGES } from '../src/core/language.ts';
import { getMessages } from '../src/i18n/index.ts';
import { sessionDate, sessionTime, sessionText } from '../src/i18n/formatters.ts';

test('catalogs have identical widened contracts, nonempty values and a stable Romanian fallback', () => {
  assert.equal(getMessages('invalid'), getMessages('ro'));
  for (const { id } of LANGUAGES) {
    const messages = getMessages(id);
    assert.equal(getMessages(id), messages);
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(getMessages('ro')).sort());
    for (const [key, value] of Object.entries(messages)) {
      assert.equal(typeof value, typeof getMessages('ro')[key as keyof typeof messages]);
      if (typeof value === 'string') assert.ok(value.trim(), `${id}:${key}`);
    }
  }
});

test('plural phrases cover Romanian de, Russian categories and English agreement', () => {
  const numbers = [0, 1, 2, 4, 5, 11, 12, 14, 20, 21, 22, 25, 101, 111];
  const russian = ['кругов', 'круг', 'круга', 'круга', 'кругов', 'кругов', 'кругов', 'кругов', 'кругов', 'круг', 'круга', 'кругов', 'круг', 'кругов'];
  const romanian = ['ture', 'tură', 'ture', 'ture', 'ture', 'ture', 'ture', 'ture', 'de ture', 'de ture', 'de ture', 'de ture', 'ture', 'ture'];
  numbers.forEach((n, index) => {
    assert.equal(getMessages('ru').lapCount(n), `${n} ${russian[index]}`);
    assert.equal(getMessages('ro').lapCount(n), `${n} ${romanian[index]}`);
    assert.equal(getMessages('en').lapCount(n), `${n} ${n === 1 ? 'lap' : 'laps'}`);
    for (const { id } of LANGUAGES) for (const key of ['lapCount', 'savedSessions', 'recordedLaps', 'stepCount'] as const) {
      assert.ok(getMessages(id)[key](n).startsWith(`${n} `));
      assert.doesNotMatch(getMessages(id)[key](n), /undefined|\{\w+\}/);
    }
  });
});

test('selected locales format dates and 24-hour time without changing timestamps', () => {
  const timestamp = Date.UTC(2026, 10, 6, 23, 7);
  for (const { id } of LANGUAGES) {
    assert.equal(sessionTime(timestamp, id, 'UTC'), '23:07');
    const date = sessionDate(timestamp, id, 'UTC');
    assert.match(date, /6/); assert.match(date, /2026/);
  }
  assert.match(sessionDate(timestamp, 'ro', 'UTC'), /noiembrie/);
  assert.match(sessionDate(timestamp, 'en', 'UTC'), /November/);
  assert.match(sessionDate(timestamp, 'ru', 'UTC'), /ноября/);
  assert.equal(sessionDate(timestamp, 'es', 'UTC'), '6 de noviembre de 2026');
  assert.equal(sessionDate(timestamp, 'fr', 'UTC'), '6 novembre 2026');
  assert.equal(sessionDate(timestamp, 'de', 'UTC'), '6. November 2026');
});

test('catalog parameters preserve names, durations, sound IDs and complete count phrases', () => {
  const name = 'Учёба · Școală <test>';
  for (const { id } of LANGUAGES) {
    const m = getMessages(id);
    for (const output of [m.startSchedule(name), m.editSchedule(name), m.deleteSchedule(name), m.scheduleFinished(name), m.stepAnnouncement(name), m.nextStep(name), m.stepFinished(name, 'Pauză')]) {
      assert.ok(output.includes(name)); assert.doesNotMatch(output, /undefined|\$\{/);
    }
    assert.ok(m.shareLap(2, '00:02.00', '00:03.00').includes('00:02.00'));
    assert.ok(m.shareTotal('00:03.50').includes('00:03.50'));
    assert.deepEqual(Object.keys(m.sounds).sort(), ['bell', 'classic', 'digital', 'gong']);
    assert.equal(m.timeUnits.length, 3);
    for (const value of [...Object.values(m.sounds), ...m.timeUnits]) assert.ok(value.trim(), `${id}:nested label`);
    for (const output of [m.totalTime('01:02'), m.remainingTime('01:02'), m.currentStepTime('01:02'), m.editorTotal('01:02')]) assert.ok(output.includes('01:02'));
    for (const output of [m.stepNumber(7), m.stepName(7), m.moveStepUp(7), m.moveStepDown(7), m.removeStep(7), m.stepField('Horas · Часы', 7)]) assert.ok(output.includes('7'));
    assert.ok(m.sessionLabel('date', '00:03.50', 22).includes(m.lapCount(22)));
  }
  assert.equal(getMessages('ro').savedSessions(20), '20 de sesiuni salvate');
  assert.equal(getMessages('ru').savedSessions(21), '21 сохранённая сессия');
});

test('sharing uses the chosen catalog and preserves all numeric lap totals', () => {
  const session = { id: 'legacy', savedAt: Date.UTC(2026, 10, 6, 23, 7), durationMs: 3500,
    laps: [{ number: 1, splitMs: 1000, elapsedMs: 1000 }, { number: 2, splitMs: 2000, elapsedMs: 3000 }] };
  for (const { id } of LANGUAGES) {
    const text = sessionText(session, id, 'UTC');
    const m = getMessages(id);
    assert.ok(text.includes(m.shareTotal('00:03.50')));
    assert.ok(text.includes(m.shareLap(2, '00:02.00', '00:03.00')));
    assert.ok(text.includes('23:07'));
    assert.equal(text.split('\n').length, 4);
  }
  assert.match(sessionText(session, 'ru', 'UTC'), /ноября/);
  assert.match(sessionText(session, 'en', 'UTC'), /Total time:/);
  assert.match(sessionText(session, 'es', 'UTC'), /Tiempo total: 00:03.50/);
  assert.match(sessionText(session, 'fr', 'UTC'), /Temps total : 00:03.50/);
  assert.match(sessionText(session, 'de', 'UTC'), /Gesamtzeit: 00:03.50/);
});

test('Spanish French and German count phrases use exact locale agreement including French zero', () => {
  const forms = {
    es: [['vuelta', 'vueltas'], ['sesión guardada', 'sesiones guardadas'], ['vuelta registrada', 'vueltas registradas'], ['paso', 'pasos']],
    fr: [['tour', 'tours'], ['séance enregistrée', 'séances enregistrées'], ['tour enregistré', 'tours enregistrés'], ['étape', 'étapes']],
    de: [['Runde', 'Runden'], ['gespeicherte Sitzung', 'gespeicherte Sitzungen'], ['aufgezeichnete Runde', 'aufgezeichnete Runden'], ['Schritt', 'Schritte']],
  } as const;
  for (const id of ['es', 'fr', 'de'] as const) {
    for (const count of [0, 1, 2, 21, 101, 1000000]) {
      const singular = count === 1 || (id === 'fr' && count === 0);
      (['lapCount', 'savedSessions', 'recordedLaps', 'stepCount'] as const).forEach((key, index) => {
        assert.equal(getMessages(id)[key](count), `${count} ${forms[id][index][singular ? 0 : 1]}`, `${id}:${key}:${count}`);
      });
    }
  }
});
