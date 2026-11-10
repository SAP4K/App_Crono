import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { MAX_SCHEDULES, MAX_STEPS, reconcileSchedule, startSchedule } from '../../src/core/planning';
import { selectTheme, scheduleOptions, audioEvents, audioSpy, expectNoPageErrors, observePageErrors, playCount, seed, settings, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

function schedule(id: string, steps = 1) {
  return { id, name: id, steps: Array.from({ length: steps }, (_, index) => ({
    id: `${id}-${index}`, name: `Acțiune ${index + 1}`, durationMs: 600000,
  })) };
}

async function hold(page: Page, button: Locator) {
  // Font reflow can move a sheet between measuring its button and mouseup.
  await page.evaluate(() => document.fonts.ready);
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
}

async function pressed(button: Locator) {
  await expect(button).toHaveCSS('opacity', '0.72');
  await expect(button).toHaveCSS('transform', 'matrix(0.98, 0, 0, 0.98, 0, 0)');
}

async function released(button: Locator, opacity = '1') {
  await expect(button).toHaveCSS('opacity', opacity);
  await expect.poll(() => button.evaluate((node) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return [m.a, m.b, m.c, m.d, m.e, m.f];
  })).toEqual([1, 0, 0, 1, 0, 0]);
}

async function cancelPress(page: Page, button: Locator) {
  await hold(page, button); await pressed(button);
  // Move well beyond Pressable's retention region before releasing.
  await page.mouse.move(0, 0); await page.mouse.up();
  await released(button);
}

async function disabledPress(page: Page, button: Locator, opacity = '0.4') {
  await expect(button).toBeDisabled();
  await hold(page, button); await released(button, opacity);
  await page.mouse.up(); await released(button, opacity);
}

for (const dark of [false, true]) {
  test(`${dark ? 'dark' : 'light'} planning list and run effects preserve accepted actions and independent clocks`, async ({ page }) => {
    const data = initialData(); data.preferences.theme = dark ? 'dark' : 'light';
    data.stopwatch.startedAt = Date.now();
    data.timer = { status: 'running', durationMs: 600000, remainingMs: 600000, deadlineAt: Date.now() + 600000, runId: 'independent' };
    data.planning.schedules = [schedule('Studiu'), schedule('Relaxare')];
    await seed(page, data); await page.goto('/planning');
    for (const name of ['Orar nou', 'Editează orarul Studiu', 'Șterge orarul Studiu']) {
      if (name !== 'Orar nou') await scheduleOptions(page, 'Studiu');
      await cancelPress(page, page.getByRole('button', { name, exact: true }));
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    const start = page.getByRole('button', { name: 'Pornește orarul Studiu', exact: true });
    await hold(page, start); await pressed(start);
    expect((await stored(page)).planning.run).toBeNull();
    await page.mouse.up();
    const pause = page.getByRole('button', { name: 'Pauză orar', exact: true });
    await expect(pause).toBeVisible();
    const running = (await stored(page)).planning.run!;
    for (const name of ['Pornește orarul Studiu', 'Editează orarul Studiu', 'Șterge orarul Studiu']) {
      await scheduleOptions(page, 'Studiu');
      await disabledPress(page, page.getByRole('button', { name, exact: true }), '0.45');
    }
    await hold(page, pause); await pressed(pause);
    expect((await stored(page)).planning.run).toEqual(running);
    await page.mouse.up();
    const resume = page.getByRole('button', { name: 'Continuă orarul', exact: true });
    await released(resume);
    expect((await stored(page)).planning.run).toMatchObject({ status: 'paused', runId: running.runId });
    await hold(page, resume); await pressed(resume);
    expect((await stored(page)).planning.run?.status).toBe('paused');
    await page.mouse.up(); await released(pause);
    const reset = page.getByRole('button', { name: 'Resetează orarul', exact: true });
    await cancelPress(page, reset);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await reset.click();
    const confirm = page.getByRole('dialog', { name: 'Resetezi orarul?', exact: true });
    await confirm.getByRole('button', { name: 'Renunță', exact: true }).click();
    await expect(confirm).not.toBeVisible();
    const saved = await stored(page);
    expect(saved.planning.run).toMatchObject({ status: 'running', runId: running.runId });
    expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.timer).toEqual(data.timer);
    expect(saved.planning.schedules).toEqual(data.planning.schedules);
  });

  test(`${dark ? 'dark' : 'light'} editor effects preserve the literal legacy data and controlled draft`, async ({ page }) => {
    const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
    await seed(page, legacy); await page.goto('/planning');
    if (!dark) {
      const preferences = await settings(page, 'appearance');
      await selectTheme(preferences, 'light');
      await preferences.getByRole('button', { name: 'Închide', exact: true }).click();
      await expect(preferences).not.toBeVisible();
    }
    await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Orar nou', exact: true });
    const save = editor.getByRole('button', { name: 'Salvează orarul', exact: true });
    await disabledPress(page, save);
    await editor.getByRole('textbox', { name: 'Nume orar', exact: true }).fill('Draft păstrat');
    await editor.getByRole('textbox', { name: 'Nume etapa 1', exact: true }).fill('Prima');
    const add = editor.getByRole('button', { name: 'Adaugă etapă', exact: true });
    await hold(page, add); await pressed(add);
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 2', exact: true })).toHaveCount(0);
    await page.mouse.up(); await released(add);
    await editor.getByRole('textbox', { name: 'Nume etapa 2', exact: true }).fill('A doua');
    await cancelPress(page, add);
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 3', exact: true })).toHaveCount(0);
    await disabledPress(page, editor.getByRole('button', { name: 'Mută etapa 1 mai sus', exact: true }), '0.35');
    await disabledPress(page, editor.getByRole('button', { name: 'Mută etapa 2 mai jos', exact: true }), '0.35');
    const up = editor.getByRole('button', { name: 'Mută etapa 2 mai sus', exact: true });
    await hold(page, up); await pressed(up);
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 1', exact: true })).toHaveValue('Prima');
    await page.mouse.up();
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 1', exact: true })).toHaveValue('A doua');
    const remove = editor.getByRole('button', { name: 'Șterge etapa 2', exact: true });
    await hold(page, remove); await pressed(remove);
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 2', exact: true })).toHaveValue('Prima');
    await page.mouse.up();
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 2', exact: true })).toHaveCount(0);
    await editor.getByRole('button', { name: 'Închide', exact: true }).click();
    const discard = page.getByRole('dialog', { name: 'Renunți la modificări?', exact: true });
    await cancelPress(page, discard.getByRole('button', { name: 'Renunță la modificări', exact: true }));
    const stay = discard.getByRole('button', { name: 'Continuă editarea', exact: true });
    await hold(page, stay); await pressed(stay); await page.mouse.up();
    await expect(editor.getByRole('textbox', { name: 'Nume orar', exact: true })).toHaveValue('Draft păstrat');
    await expect(editor.getByRole('textbox', { name: 'Nume etapa 1', exact: true })).toHaveValue('A doua');
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await hold(page, add); await pressed(add);
      const size = await add.evaluate((element) => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
      expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `previews/planning-buttons-${dark ? 'dark' : 'light'}-${width}.png` });
      await page.mouse.move(0, 0); await page.mouse.up(); await released(add);
    }
    const beforeSave = await stored(page);
    await hold(page, save); await pressed(save);
    expect(await stored(page)).toEqual(beforeSave);
    await page.mouse.up(); await expect(editor).not.toBeVisible();
    await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
    const saved = await stored(page);
    expect(saved.stopwatch).toEqual(legacy.stopwatch); expect(saved.timer).toEqual(legacy.timer);
    expect(saved.sessions).toEqual(legacy.sessions);
    expect(saved.preferences).toEqual({ ...legacy.preferences, systemNotifications: true, language: 'ro', theme: dark ? 'dark' : 'light', alertSoundId: 'classic', alertDurationSeconds: 60 });
    expect(saved.planning.schedules[0]).toMatchObject({ name: 'Draft păstrat', steps: [{ name: 'A doua' }] });
  });
}

test('template and action limits keep disabled buttons inert while pressed', async ({ page }) => {
  const data = initialData();
  data.planning.schedules = Array.from({ length: MAX_SCHEDULES }, (_, index) => schedule(`Orar ${index + 1}`, index === 0 ? MAX_STEPS : 1));
  await seed(page, data); await page.goto('/planning');
  await disabledPress(page, page.getByRole('button', { name: 'Orar nou', exact: true }));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await scheduleOptions(page, 'Orar 1');
  await page.getByRole('button', { name: 'Editează orarul Orar 1', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Editează orarul', exact: true });
  await disabledPress(page, editor.getByRole('button', { name: 'Adaugă etapă', exact: true }));
  expect((await stored(page)).planning).toEqual(data.planning);
  await expect(editor.getByText('50/50 etape', { exact: false })).toBeVisible();
});

test('a completed schedule without its template keeps Restart disabled', async ({ page }) => {
  const data = initialData(); data.planning.schedules = [schedule('Finalizat')];
  data.planning = reconcileSchedule(startSchedule(data.planning, 'Finalizat', 0, 'finished'), 600000).state;
  data.planning.schedules = [];
  await seed(page, data); await page.goto('/planning');
  await disabledPress(page, page.getByRole('button', { name: 'Repornește orarul', exact: true }));
  expect((await stored(page)).planning).toEqual(data.planning);
  await cancelPress(page, page.getByRole('button', { name: 'Resetează orarul', exact: true }));
  expect((await stored(page)).planning.run?.runId).toBe('finished');
});

test('shared Cancel and audio Stop retain their actions outside Planning', async ({ page }) => {
  const data = initialData(); data.preferences.alertDurationSeconds = 30;
  data.timer = { status: 'running', durationMs: 600000, remainingMs: 600000, deadlineAt: Date.now() + 600000, runId: 'retained' };
  const wav = readFileSync(new URL('../../assets/audio/timer-complete.wav', import.meta.url));
  await page.route(/timer-complete[^/]*\.wav/, (route) => route.fulfill({ contentType: 'audio/wav', body: wav }));
  await seed(page, data); await audioSpy(page); await page.goto('/timer');
  await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Resetezi temporizatorul?', exact: true });
  const cancel = confirm.getByRole('button', { name: 'Renunță', exact: true });
  await cancelPress(page, cancel); await expect(confirm).toBeVisible();
  await hold(page, cancel); await pressed(cancel); await page.mouse.up();
  await expect(confirm).not.toBeVisible();
  const preferences = await settings(page, 'sounds');
  await preferences.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  const stop = preferences.getByRole('button', { name: 'Oprește sunetul', exact: true });
  await cancelPress(page, stop); expect(await playCount(page)).toBe(1);
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(0);
  await hold(page, stop); await pressed(stop); await page.mouse.up();
  await expect(stop).not.toBeVisible();
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(1);
  expect((await stored(page)).timer).toEqual(data.timer);
});

test('real Chrome touch cancellation restores the effect without adding an action', async ({ page, context }) => {
  await page.goto('/planning'); await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Orar nou', exact: true });
  const add = editor.getByRole('button', { name: 'Adaugă etapă', exact: true });
  await add.scrollIntoViewIfNeeded();
  const box = await add.boundingBox(); expect(box).not.toBeNull();
  const session = await context.newCDPSession(page);
  const touchPoints = [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
  await pressed(add);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await released(add);
  await expect(editor.getByRole('textbox', { name: 'Nume etapa 2', exact: true })).toHaveCount(0);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
  await pressed(add);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await released(add);
  await expect(editor.getByRole('textbox', { name: 'Nume etapa 2', exact: true })).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Nume etapa 3', exact: true })).toHaveCount(0);
  await session.detach();
});
