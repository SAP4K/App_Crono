import { expect, test, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, selectDuration, settings, stepDuration, stored } from './helpers';
import { initialData } from '../../src/core/stopwatch';
import { LANGUAGES } from '../../src/core/language';
import { pauseSchedule, startSchedule } from '../../src/core/planning';
import { getMessages } from '../../src/i18n';
import { planningWeekdayLabel } from '../../src/i18n/formatters';

function scheduleData() {
  const data = initialData();
  data.planning.schedules = [
    { id: 'study', name: 'Studiu', steps: [{ id: 'a', name: 'Lucru', durationMs: 2000 }, { id: 'b', name: 'Pauză', durationMs: 1000 }] },
    { id: 'rest', name: 'Relaxare', steps: [{ id: 'c', name: 'Respiră', durationMs: 3000 }] },
  ];
  return data;
}

test.beforeEach(async ({ page }) => {
  observePageErrors(page);
  await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
});
test.afterEach(({ page }) => expectNoPageErrors(page));

test('schedule editor saves ordered actions, validates durations, and preserves canceled drafts', async ({ page }) => {
  await page.goto('/planning');
  await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Orar nou', exact: true });
  const save = dialog.getByRole('button', { name: 'Salvează orarul', exact: true });
  await expect(save).toBeDisabled();
  await dialog.getByLabel('Nume orar', { exact: true }).fill('Studiu');
  await dialog.getByLabel('Nume etapa 1', { exact: true }).fill('Lucru');
  await dialog.getByRole('button', { name: 'Modifică durata etapei 1', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Durata etapei 1', exact: true });
  await selectDuration(panel, [0, 0, 0], undefined, 1);
  await expect(panel.getByRole('button', { name: 'Aplică durata', exact: true })).toBeDisabled();
  await selectDuration(panel, [0, 0, 2], undefined, 1);
  await panel.getByRole('button', { name: 'Aplică durata', exact: true }).click();
  await dialog.getByRole('button', { name: 'Adaugă etapă', exact: true }).click();
  await dialog.getByLabel('Nume etapa 2', { exact: true }).fill('Pauză');
  await stepDuration(page, 2, [0, 0, 1]);
  await dialog.getByRole('button', { name: 'Mută etapa 2 mai sus', exact: true }).click();
  await save.click(); await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.schedules[0]?.steps.map((step) => step.name)).toEqual(['Pauză', 'Lucru']);
  expect((await stored(page)).planning.schedules[0].steps.map((step) => step.durationMs)).toEqual([1000, 2000]);
  const before = (await stored(page)).planning;
  await page.getByRole('button', { name: 'Editează orarul Studiu', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Editează orarul', exact: true });
  await dialog.getByLabel('Nume orar', { exact: true }).fill('Alt nume');
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.getByRole('button', { name: 'Continuă editarea', exact: true }).click();
  await expect(dialog.getByLabel('Nume orar', { exact: true })).toHaveValue('Alt nume');
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.getByRole('button', { name: 'Renunță la modificări', exact: true }).click(); await page.clock.runFor(300);
  expect((await stored(page)).planning).toEqual(before);
  await page.reload(); await expect(page.getByText('Studiu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editează orarul Studiu', exact: true }).click();
  await page.getByRole('button', { name: 'Șterge etapa 1', exact: true }).click();
  await page.getByRole('button', { name: 'Salvează orarul', exact: true }).click(); await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.schedules[0].steps.length).toBe(1);
  await page.getByRole('button', { name: 'Șterge orarul Studiu', exact: true }).click();
  await page.getByRole('dialog', { name: 'Ștergi orarul?', exact: true }).getByRole('button', { name: 'Șterge orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(0);
});

async function enterCalendarDate(dialog: Locator, date: string) {
  const [year, month, day] = date.split('-');
  await dialog.getByRole('textbox', { name: 'Zi', exact: true }).fill(day);
  await dialog.getByRole('textbox', { name: 'Lună', exact: true }).fill(month);
  await dialog.getByRole('textbox', { name: 'An', exact: true }).fill(year);
}

test('calendar editor stages weekly and fixed dates and saves them alongside legacy data', async ({ page }) => {
  const fixture = new URL('../fixtures/app-v1-before-planning.json', import.meta.url);
  const legacy = JSON.parse(readFileSync(fixture, 'utf8'));
  await seed(page, legacy);
  await page.goto('/planning');

  const calendar = page.getByRole('dialog', { name: 'Programare', exact: true });
  const apply = calendar.getByRole('button', { name: 'Aplică programarea', exact: true });
  const manual = page.getByRole('button', { name: 'Programare · Manual', exact: true });
  const weekly = page.getByRole('button', { name: /^Programare · Săptămânal/ });
  const fixed = page.getByRole('button', { name: /^Programare · Dată fixă/ });
  const save = page.getByRole('button', { name: 'Salvează orarul', exact: true });
  const edit = page.getByRole('button', { name: 'Editează orarul Lectură', exact: true });

  await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nume orar', exact: true }).fill('Lectură');
  await manual.click();
  await calendar.getByRole('radio', { name: 'Săptămânal', exact: true }).click();
  await expect(apply).toBeDisabled();
  await calendar.getByRole('checkbox', { name: 'miercuri', exact: true }).click();
  await calendar.getByRole('button', { name: 'Renunță', exact: true }).click();
  await expect(manual).toBeFocused();
  await manual.click();
  await calendar.getByRole('radio', { name: 'Săptămânal', exact: true }).click();
  await calendar.getByRole('checkbox', { name: 'joi', exact: true }).click();
  await calendar.getByRole('checkbox', { name: 'luni', exact: true }).click();
  await apply.click();
  await expect(weekly).toBeFocused();
  expect(await stored(page)).toEqual(legacy);
  await save.click();
  await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.schedules[0]?.calendar)
    .toEqual({ kind: 'weekly', weekdays: [1, 4] });
  const before = (await stored(page)).planning.schedules[0];
  await page.reload();
  await expect(page.getByText(/^Săptămânal ·/)).toBeVisible();

  await edit.click();
  await weekly.click();
  await expect(calendar.getByRole('checkbox', { name: 'luni', exact: true })).toBeChecked();
  await expect(calendar.getByRole('checkbox', { name: 'joi', exact: true })).toBeChecked();
  await calendar.getByRole('radio', { name: 'Dată fixă', exact: true }).click();
  await enterCalendarDate(calendar, '2027-02-29');
  await expect(calendar.getByText('Introdu o dată validă.', { exact: true })).toBeVisible();
  await expect(apply).toBeDisabled();
  await enterCalendarDate(calendar, '2028-02-29');
  await apply.click();
  await expect(fixed).toBeFocused();
  expect((await stored(page)).planning.schedules[0]).toEqual(before);
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.getByRole('button', { name: 'Renunță la modificări', exact: true }).click();
  await page.clock.runFor(300);
  expect((await stored(page)).planning.schedules[0]).toEqual(before);

  await edit.click();
  await weekly.click();
  await calendar.getByRole('radio', { name: 'Dată fixă', exact: true }).click();
  await enterCalendarDate(calendar, '2028-02-29');
  await apply.click();
  await save.click();
  await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.schedules[0].calendar)
    .toEqual({ kind: 'once', date: '2028-02-29' });
  await page.reload();
  await expect(page.getByText('Dată fixă · 29 februarie 2028', { exact: true })).toBeVisible();
  const restored = await stored(page);
  expect(restored.version).toBe(1);
  expect(restored.stopwatch).toEqual(legacy.stopwatch);
  expect(restored.timer).toEqual(legacy.timer);
  expect(restored.sessions).toEqual(legacy.sessions);
  expect(restored.planning.schedules[0]).toEqual({ ...before, calendar: { kind: 'once', date: '2028-02-29' } });

  await edit.click();
  await fixed.click();
  await calendar.getByRole('radio', { name: 'Manual', exact: true }).click();
  await apply.click();
  await save.click();
  await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.schedules[0].calendar).toBeUndefined();
  await page.reload();
  await edit.click();
  await expect(manual).toBeVisible();
});

test.describe('device-local calendar date', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('calendar filtering matches recurring and fixed dates and preserves a paused legacy run', async ({ page }) => {
    const now = Date.parse('2026-11-06T00:30:00Z');
    await page.clock.setSystemTime(now);
    const data = scheduleData();
    data.planning.schedules[0].calendar = { kind: 'weekly', weekdays: [1, 4] };
    data.planning.schedules.push({
      id: 'appointment', name: 'Consultație', steps: [{ id: 'check', name: 'Verificare', durationMs: 60000 }],
      calendar: { kind: 'once', date: '2026-11-05' },
    });
    data.planning = pauseSchedule(startSchedule(data.planning, 'rest', now - 1000, 'legacy-run'), now - 500);
    await seed(page, data);
    await page.goto('/planning');

    const choose = page.getByRole('button', { name: /^Alege o zi/ });
    const picker = page.getByRole('dialog', { name: 'Alege o zi', exact: true });
    const show = picker.getByRole('button', { name: 'Afișează orarele', exact: true });
    const weekly = page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true });
    const fixed = page.getByRole('button', { name: 'Pornește orarul Consultație', exact: true });
    const manual = page.getByRole('button', { name: 'Pornește orarul Relaxare', exact: true });
    const paused = page.getByRole('button', { name: 'Continuă orarul', exact: true });
    const selectDay = async (date: string) => {
      await choose.click();
      await enterCalendarDate(picker, date);
      await show.click();
      await page.clock.runFor(300);
    };

    await expect(manual).toBeVisible();
    await choose.click();
    await enterCalendarDate(picker, '2026-11-06');
    await picker.getByRole('button', { name: 'Astăzi', exact: true }).click();
    await expect(picker.getByRole('textbox', { name: 'Zi', exact: true })).toHaveValue('05');
    await show.click();
    await page.clock.runFor(300);
    await expect(choose).toContainText('5 noiembrie 2026');
    await expect(weekly).toBeVisible();
    await expect(fixed).toBeVisible();
    await expect(manual).toHaveCount(0);

    await selectDay('2026-11-06');
    await expect(page.getByText('Niciun orar programat pentru această zi.', { exact: true })).toBeVisible();
    await expect(weekly).toHaveCount(0);
    await expect(fixed).toHaveCount(0);
    await expect(paused).toBeVisible();
    expect((await stored(page)).planning.run).toEqual(data.planning.run);
    await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Programare · Dată fixă · 6 noiembrie 2026', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Închide', exact: true }).click();
    await page.clock.runFor(300);

    for (const date of ['2026-11-02', '2026-11-12']) {
      await selectDay(date);
      await expect(weekly).toBeVisible();
      await expect(fixed).toHaveCount(0);
      await expect(paused).toBeVisible();
    }

    await weekly.click();
    const replacement = page.getByRole('dialog', { name: 'Înlocuiești orarul activ?', exact: true });
    await replacement.getByRole('button', { name: 'Renunță', exact: true }).click();
    await page.clock.runFor(300);
    expect((await stored(page)).planning.run).toEqual(data.planning.run);
    await weekly.click();
    await replacement.getByRole('button', { name: 'Înlocuiește orarul', exact: true }).click();
    await page.clock.runFor(300);
    await expect.poll(async () => (await stored(page)).planning.run?.scheduleId).toBe('study');
    await page.getByRole('button', { name: 'Toate', exact: true }).click();
    await expect(manual).toBeVisible();
    await expect(fixed).toBeVisible();
  });
});

for (const [index, { id }] of LANGUAGES.entries()) {
  test(`calendar controls fit a compact screen in ${id}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    const data = initialData();
    data.preferences.language = id;
    data.preferences.theme = index % 2 === 0 ? 'light' : 'dark';
    await seed(page, data);
    const m = getMessages(id);
    await page.goto('/planning');
    await expectTheme(page, data.preferences.theme === 'dark');
    await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
    await page.getByRole('button', { name: `${m.calendarSchedule} · ${m.calendarManual}`, exact: true }).click();
    const calendar = page.getByRole('dialog', { name: m.calendarSchedule, exact: true });
    await calendar.getByRole('radio', { name: m.calendarWeekly, exact: true }).click();
    const checks = calendar.getByRole('checkbox');
    await expect(checks).toHaveCount(7);
    const boxes = await checks.evaluateAll((nodes) => nodes.map((node) => {
      const { left, right, width, height } = node.getBoundingClientRect();
      return { left, right, width, height };
    }));
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(320);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await calendar.getByRole('checkbox', { name: planningWeekdayLabel(1, id, 'long'), exact: true }).click();
    await expect(calendar.getByRole('button', { name: m.calendarApply, exact: true })).toBeEnabled();
    await calendar.getByRole('radio', { name: m.calendarOnce, exact: true }).click();
    const day = calendar.getByRole('textbox', { name: m.calendarDay, exact: true });
    await expect(day).toHaveAttribute('inputmode', 'numeric');
    await day.press('Tab');
    await expect(calendar.getByRole('textbox', { name: m.calendarMonth, exact: true })).toBeFocused();
    await expect(calendar.getByRole('button', { name: m.calendarApply, exact: true })).toBeVisible();
  });
}

test('schedule execution pauses exactly, persists, advances automatically, and restarts', async ({ page }) => {
  await seed(page, scheduleData()); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
  await expect(page.getByLabel('Timp etapă 00:00:02', { exact: true })).toBeVisible();
  await page.clock.runFor(1001);
  await page.getByRole('button', { name: 'Pauză orar', exact: true }).click();
  const paused = (await stored(page)).planning.run;
  expect(paused?.remainingMs).toBe(999);
  await page.clock.runFor(5000); await page.reload();
  await expect(page.getByRole('button', { name: 'Continuă orarul', exact: true })).toBeVisible();
  expect((await stored(page)).planning.run).toEqual(paused);
  await page.getByRole('button', { name: 'Continuă orarul', exact: true }).click();
  await page.clock.runFor(999);
  await expect.poll(async () => (await stored(page)).planning.run?.stepIndex).toBe(1);
  expect(await playCount(page)).toBe(1);
  await page.clock.runFor(1000);
  await expect(page.getByRole('button', { name: 'Repornește orarul', exact: true })).toBeVisible();
  expect((await stored(page)).planning.run?.status).toBe('completed');
  expect(await playCount(page)).toBe(2);
  await page.getByRole('button', { name: 'Repornește orarul', exact: true }).click();
  expect((await stored(page)).planning.run?.runId).not.toBe(paused?.runId);
  await page.getByRole('button', { name: 'Resetează orarul', exact: true }).click();
  await page.getByRole('dialog', { name: 'Resetezi orarul?', exact: true }).getByRole('button', { name: 'Resetează orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.run).toBeNull();
  expect((await stored(page)).planning.schedules).toHaveLength(2);
});

test('only one schedule runs; replacement confirms and preserves the independent stopwatch', async ({ page }) => {
  const data = scheduleData(); data.stopwatch.startedAt = Date.parse('2026-11-05T10:00:00Z');
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
  const original = (await stored(page)).planning.run;
  await expect(page.getByRole('button', { name: 'Editează orarul Studiu', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Șterge orarul Studiu', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Editează orarul Relaxare', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Pornește orarul Relaxare', exact: true }).click();
  await page.getByRole('button', { name: 'Renunță', exact: true }).click(); await page.clock.runFor(300);
  expect((await stored(page)).planning.run).toEqual(original);
  await page.getByRole('button', { name: 'Pornește orarul Relaxare', exact: true }).click();
  await page.getByRole('button', { name: 'Înlocuiește orarul', exact: true }).click(); await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.run?.scheduleId).toBe('rest');
  expect((await stored(page)).stopwatch).toEqual(data.stopwatch);
  expect((await stored(page)).sessions).toEqual([]);
});

test('schedule notices and sound stop preserve an open editor and its draft', async ({ page }) => {
  await seed(page, scheduleData()); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
  await page.getByRole('button', { name: 'Editează orarul Relaxare', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Editează orarul', exact: true });
  await editor.getByLabel('Nume orar', { exact: true }).fill('Respirație');
  await page.clock.runFor(2000);
  await expect(editor.getByLabel('Etapă finalizată', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
  expect((await stored(page)).planning.run?.status).toBe('running');
  await expect(editor.getByLabel('Nume orar', { exact: true })).toHaveValue('Respirație');
  await page.clock.runFor(1000);
  await expect(editor.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
  await editor.getByRole('button', { name: 'Salvează orarul', exact: true }).click(); await page.clock.runFor(300);
  expect((await stored(page)).planning.run?.status).toBe('completed');
  expect((await stored(page)).planning.schedules[1].name).toBe('Respirație');
  expect(await playCount(page)).toBe(2);
});

test('settings can stop completion audio without clearing the schedule', async ({ page }) => {
  const data = scheduleData(); data.planning.schedules[0].steps = [data.planning.schedules[0].steps[1]];
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
  const dialog = await settings(page); await page.clock.runFor(1000);
  await expect(dialog.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
  const completed = (await stored(page)).planning.run;
  await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
  expect((await stored(page)).planning.run).toEqual(completed);
  await expect(dialog.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
});

test('hidden schedule expiry and completed hydration return silently across tabs', async ({ page }) => {
  await seed(page, scheduleData()); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(10000);
  expect((await stored(page)).planning.run?.status).toBe('running');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await stored(page)).planning.run?.status).toBe('completed');
  expect(await playCount(page)).toBe(0);
  await page.getByRole('tab', { name: 'Timer', exact: true }).click();
  await expect(page.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(0);
});

test('a successful next action completion clears a previous planning audio warning', async ({ page }) => {
  await seed(page, scheduleData()); await audioSpy(page, true); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByLabel('Etapă finalizată', { exact: true })).toContainText('Sunetul nu este disponibil acum.');
  await page.evaluate(() => { HTMLMediaElement.prototype.play = function () {
    (window as unknown as { timerPlayCount: number }).timerPlayCount++; return Promise.resolve();
  }; });
  await page.clock.runFor(1000);
  await expect(page.getByLabel('Orar finalizat', { exact: true })).not.toContainText('Sunetul nu este disponibil acum.');
  expect(await playCount(page)).toBe(2);
});

for (const first of ['timer', 'planning']) {
  test(`three activities remain independent and coinciding alerts prefer timer (${first} first)`, async ({ page }) => {
    const data = scheduleData(); data.planning.schedules[0].steps = [data.planning.schedules[0].steps[0]];
    await seed(page, data); await audioSpy(page); await page.goto('/');
    await page.getByRole('button', { name: 'Pornește', exact: true }).click();
    const stopwatch = (await stored(page)).stopwatch;
    for (const target of first === 'timer' ? ['timer', 'planning'] : ['planning', 'timer']) {
      await page.getByRole('tab', { name: target === 'timer' ? 'Timer' : 'Planificare', exact: true }).click();
      if (target === 'timer') { await duration(page, '02'); await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click(); }
      else await page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true }).click();
    }
    await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
    const dialog = await settings(page);
    await dialog.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
    await expectTheme(page, true);
    await page.clock.runFor(2000);
    await expect(dialog.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Sunet timer', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
    const result = await stored(page);
    expect(result.stopwatch).toEqual(stopwatch); expect(result.timer.status).toBe('completed');
    expect(result.planning.run?.status).toBe('completed'); expect(result.sessions).toEqual([]);
  });
}
