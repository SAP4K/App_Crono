import { expect, test } from '@playwright/test';
import { audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, selectDuration, settings, stepDuration, stored } from './helpers';
import { initialData } from '../../src/core/stopwatch';

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
