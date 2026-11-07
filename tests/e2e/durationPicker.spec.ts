import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer, startTimer } from '../../src/core/timer';
import { startSchedule } from '../../src/core/planning';
import { LANGUAGES } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, selectDuration, selectWheel, stored } from './helpers';

// Keep the actual browser clock: CSS snapping and native timer receivers are part of this adapter.
const warnings = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  observePageErrors(page); const messages: string[] = []; warnings.set(page, messages);
  page.on('console', (message) => { if (message.type() === 'warning' || message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(({ page }) => { expectNoPageErrors(page); expect(warnings.get(page)).toEqual([]); });

async function openTimer(page: Page) {
  const data = initialData(); data.timer = initialTimer(1000); data.preferences.timerSound = false;
  await seed(page, data); await page.goto('/timer');
  await expect(page.getByRole('spinbutton')).toHaveCount(3);
  return page.getByRole('button', { name: 'Pornește temporizatorul', exact: true });
}
async function wheelBy(page: Page, wheel: Locator, delta: number) {
  await wheel.hover(); await page.mouse.wheel(0, delta);
}
async function centered(wheel: Locator) {
  await expect.poll(() => wheel.evaluate((element) => {
    const row = element.querySelectorAll('button')[Number(element.getAttribute('aria-valuenow'))];
    const viewport = element.getBoundingClientRect(), selected = row.getBoundingClientRect();
    return Math.abs(selected.y + selected.height / 2 - viewport.y - viewport.height / 2);
  })).toBeLessThan(1);
}
async function noNumericKeyboard(page: Page) {
  expect(await page.evaluate(() => ({ tag: document.activeElement?.tagName, numeric: document.querySelectorAll('input[inputmode="numeric"], input[type="number"]').length })))
    .toEqual({ tag: 'DIV', numeric: 0 });
}

test('real wheel motion gates Start, combines columns, snaps and preserves running and paused clocks', async ({ page }) => {
  const start = await openTimer(page);
  const minutes = page.getByRole('spinbutton', { name: 'Minute', exact: true });
  const seconds = page.getByRole('spinbutton', { name: 'Secunde', exact: true });
  const outer = await seconds.evaluate((node) => {
    let parent = node.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY === 'auto')) parent = parent.parentElement;
    return parent?.scrollTop ?? 0;
  });
  await wheelBy(page, minutes, 44);
  await wheelBy(page, seconds, 88);
  await expect(start).toBeDisabled();
  await expect(minutes).toHaveAttribute('aria-valuenow', '1');
  await expect(seconds).toHaveAttribute('aria-valuenow', '3');
  await expect(start).toBeEnabled(); await centered(minutes); await centered(seconds);
  expect(await seconds.evaluate((node) => {
    let parent = node.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY === 'auto')) parent = parent.parentElement;
    return parent?.scrollTop ?? 0;
  })).toBe(outer);
  await seconds.focus(); await noNumericKeyboard(page);
  const before = await page.evaluate(() => Date.now()); await start.click();
  const running = (await stored(page)).timer;
  expect(running).toMatchObject({ status: 'running', durationMs: 63000, remainingMs: 63000 });
  expect(running.deadlineAt).toBeGreaterThanOrEqual(before + 63000);
  expect(running.deadlineAt).toBeLessThanOrEqual(await page.evaluate(() => Date.now()) + 63000);
  await seconds.press('End'); await wheelBy(page, seconds, 440);
  await expect(seconds).toHaveAttribute('aria-disabled', 'true');
  await expect(seconds).toHaveAttribute('aria-valuenow', '3');
  expect((await stored(page)).timer).toEqual(running);
  await page.getByRole('button', { name: 'Pauză temporizator', exact: true }).click();
  const paused = (await stored(page)).timer;
  await minutes.press('Home'); await wheelBy(page, minutes, -440);
  expect((await stored(page)).timer).toEqual(paused);
});

test('keyboard endpoints, row clicks and releasing a pointer outside the wheel leave a usable control', async ({ page }) => {
  const start = await openTimer(page);
  await duration(page, '00'); await expect(start).toBeDisabled();
  const hours = page.getByRole('spinbutton', { name: 'Ore', exact: true });
  const minutes = page.getByRole('spinbutton', { name: 'Minute', exact: true });
  const seconds = page.getByRole('spinbutton', { name: 'Secunde', exact: true });
  for (const [wheel, maximum] of [[hours, '23'], [minutes, '59'], [seconds, '59']] as const) {
    await expect(wheel).toHaveAttribute('aria-valuemin', '0');
    await expect(wheel).toHaveAttribute('aria-valuemax', maximum);
    await wheel.press('End'); await wheel.press('ArrowUp');
    await expect(wheel).toHaveAttribute('aria-valuenow', maximum); await centered(wheel);
  }
  expect((await stored(page)).timer.durationMs).toBe(86399000);
  await duration(page, '01');
  await seconds.locator('button').nth(2).click();
  await expect(seconds).toHaveAttribute('aria-valuenow', '2'); await centered(seconds);
  await expect(seconds).toBeFocused(); await noNumericKeyboard(page);
  const box = (await seconds.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await expect(start).toBeDisabled();
  await page.mouse.move(box.x - 30, box.y + box.height + 30); await page.mouse.up();
  await expect(start).toBeEnabled();
  await expect(seconds).toHaveAttribute('aria-valuenow', '2');
});

test('real touch dragging and a quick cancelled gesture settle without moving the outer page', async ({ page, context }) => {
  const start = await openTimer(page); const seconds = page.getByRole('spinbutton', { name: 'Secunde', exact: true });
  await selectWheel(seconds, 20); const box = (await seconds.boundingBox())!;
  const session = await context.newCDPSession(page);
  const x = box.x + box.width / 2, y = box.y + box.height * 0.85;
  const top = box.y;
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 6; index++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 11 }] });
      await page.waitForTimeout(40); // A deliberately slow, real gesture, not a settling substitute.
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => Number(await seconds.getAttribute('aria-valuenow'))).toBeGreaterThan(20);
    await expect(start).toBeEnabled(); await centered(seconds); await noNumericKeyboard(page);
    const selected = Number(await seconds.getAttribute('aria-valuenow'));
    expect((await stored(page)).timer.durationMs).toBe(selected * 1000);
    expect((await seconds.boundingBox())!.y).toBe(top);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 70 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(start).toBeEnabled(); await centered(seconds);
    expect(Number(await seconds.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(59);
  } finally { await session.detach(); }
});

test('Planning cancels moving temporary selection and applies only settled values to its local action draft', async ({ page }) => {
  const data = initialData(); data.planning.schedules = [{ id: 'plan', name: 'Secvență', steps: [
    { id: 'a', name: 'Prima', durationMs: 1000 }, { id: 'b', name: 'A doua', durationMs: 2000 },
  ] }];
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: 'Editează orarul Secvență', exact: true }).click();
  const edit = page.getByRole('button', { name: 'Modifică durata etapei 2', exact: true });
  await edit.click();
  const seconds = page.getByRole('spinbutton', { name: 'Secunde etapa 2', exact: true });
  await wheelBy(page, seconds, 440);
  await expect(page.getByRole('button', { name: 'Aplică durata', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Renunță', exact: true }).click();
  await expect(edit).toContainText('00:00:02'); await edit.click();
  await expect(seconds).toHaveAttribute('aria-valuenow', '2');
  await wheelBy(page, seconds, 44);
  const apply = page.getByRole('button', { name: 'Aplică durata', exact: true });
  await expect(apply).toBeDisabled(); await expect(seconds).toHaveAttribute('aria-valuenow', '3');
  await expect(apply).toBeEnabled(); await apply.click();
  await expect(edit).toContainText('00:00:03');
  expect((await stored(page)).planning).toEqual(data.planning);
  await page.getByRole('button', { name: 'Mută etapa 2 mai sus', exact: true }).click();
  await page.getByRole('button', { name: 'Salvează orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules[0].steps).toEqual([
    { id: 'b', name: 'A doua', durationMs: 3000 }, { id: 'a', name: 'Prima', durationMs: 1000 },
  ]);
});

test('backgrounding during motion abandons obsolete selection and releases Start', async ({ page }) => {
  const start = await openTimer(page); const seconds = page.getByRole('spinbutton', { name: 'Secunde', exact: true });
  const before = (await stored(page)).timer;
  const box = (await seconds.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await expect(start).toBeDisabled();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.mouse.up();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(start).toBeEnabled(); await expect(seconds).toHaveAttribute('aria-valuenow', '1');
  expect((await stored(page)).timer).toEqual(before);
});

test('same-value real scroll preserves completed timer identity and playing audio', async ({ page }) => {
  const data = initialData(); data.timer = initialTimer(1000);
  await seed(page, data); await audioSpy(page); await page.goto('/timer');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  await expect.poll(() => playCount(page)).toBe(1);
  const completed = (await stored(page)).timer;
  const seconds = page.getByRole('spinbutton', { name: 'Secunde', exact: true });
  await wheelBy(page, seconds, 1);
  const restart = page.getByRole('button', { name: 'Repornește temporizatorul', exact: true });
  await expect(restart).toBeDisabled(); await expect(restart).toBeEnabled(); await centered(seconds);
  expect((await stored(page)).timer).toEqual(completed);
  expect(await playCount(page)).toBe(1);
  await expect(page.getByRole('button', { name: 'Oprește sunetul', exact: true })).toBeVisible();
});

test('literal legacy data survives no-op wheels, a translated action draft, an unrelated save and reload', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await audioSpy(page);
  await page.addInitScript(() => {
    Object.assign(window, { durationWrites: 0 }); const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') (window as unknown as { durationWrites: number }).durationWrites++;
      return write.call(this, key, value);
    };
  });
  await page.goto('/timer');
  const restart = page.getByRole('button', { name: 'Repornește temporizatorul', exact: true });
  await expect(restart).toBeEnabled();
  const count = await page.evaluate(() => (window as unknown as { durationWrites: number }).durationWrites);
  for (const name of ['Ore', 'Minute', 'Secunde']) await page.getByRole('spinbutton', { name, exact: true }).focus();
  await page.getByRole('spinbutton', { name: 'Ore', exact: true }).press('ArrowDown');
  await wheelBy(page, page.getByRole('spinbutton', { name: 'Secunde', exact: true }), 1);
  await expect(restart).toBeDisabled(); await expect(restart).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { durationWrites: number }).durationWrites)).toBe(count);
  expect((await stored(page)).timer).toEqual(legacy.timer); expect(await playCount(page)).toBe(0);
  await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
  await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
  await page.getByLabel('Nume orar', { exact: true }).fill('Учёба · Școală');
  await page.getByLabel('Nume etapa 1', { exact: true }).fill('Respiră · Отдых');
  const edit = page.getByRole('button', { name: 'Modifică durata etapei 1', exact: true });
  await edit.click(); await selectDuration(page, [0, 0, 1], undefined, 1);
  await page.getByRole('button', { name: 'Renunță', exact: true }).click();
  await expect(edit).toContainText('00:05:00');
  await edit.click(); await selectDuration(page, [0, 0, 2], undefined, 1);
  await page.getByRole('button', { name: 'Aplică durata', exact: true }).click();
  await page.getByRole('button', { name: 'Salvează orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules[0]?.steps[0]?.durationMs).toBe(2000);
  const saved = await stored(page);
  expect(saved.stopwatch).toEqual(legacy.stopwatch); expect(saved.timer).toEqual(legacy.timer);
  expect(saved.sessions).toEqual(legacy.sessions);
  expect(saved.preferences).toEqual({ ...initialData().preferences, ...legacy.preferences });
  expect(saved.planning.schedules[0]).toMatchObject({ name: 'Учёба · Școală', steps: [{ name: 'Respiră · Отдых', durationMs: 2000 }] });
  await page.getByRole('tab', { name: 'Timer', exact: true }).click(); await page.reload();
  await expect(restart).toBeEnabled();
  await expect(page.getByRole('spinbutton', { name: 'Secunde', exact: true })).toHaveAttribute('aria-valuenow', '1');
  expect((await stored(page)).timer).toEqual(legacy.timer); expect(await playCount(page)).toBe(0);
});

test('fifty-action editing restores list position and focus and preserves IDs through apply, reorder and removal', async ({ page }) => {
  const data = initialData(); data.planning.schedules = [{ id: 'many', name: 'Cincizeci', steps: Array.from({ length: 50 }, (_, index) => ({
    id: `step-${index + 1}`, name: `Acțiune ${index + 1}`, durationMs: 1000,
  })) }];
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: 'Editează orarul Cincizeci', exact: true }).click();
  const first = page.getByRole('button', { name: 'Modifică durata etapei 1', exact: true });
  const list = await first.evaluateHandle((node) => {
    let parent = node.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY === 'auto')) parent = parent.parentElement;
    return parent;
  });
  const rect = await list.evaluate((node) => node!.getBoundingClientRect().toJSON());
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  const last = page.getByRole('button', { name: 'Modifică durata etapei 50', exact: true });
  // Let virtualization measure each newly reached window before the next real scroll.
  await expect.poll(async () => {
    if (await last.isVisible()) return true;
    await page.mouse.wheel(0, 20000); return false;
  }, { intervals: [100, 200, 300] }).toBe(true);
  await last.scrollIntoViewIfNeeded();
  const offset = await list.evaluate((node) => node!.scrollTop);
  await last.click(); await selectDuration(page, [0, 0, 3], undefined, 50);
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(last).toBeFocused(); await expect(last).toContainText('00:00:01');
  expect(Math.abs(await list.evaluate((node) => node!.scrollTop) - offset)).toBeLessThanOrEqual(1);
  await last.click(); await selectDuration(page, [0, 0, 3], undefined, 50);
  await page.getByRole('button', { name: 'Aplică durata', exact: true }).click();
  await expect(last).toBeFocused(); await expect(last).toContainText('00:00:03');
  await page.getByRole('button', { name: 'Mută etapa 50 mai sus', exact: true }).click();
  await expect(page.getByLabel('Nume etapa 49', { exact: true })).toHaveValue('Acțiune 50');
  const moved = page.getByRole('button', { name: 'Modifică durata etapei 49', exact: true });
  await moved.click(); await expect(page.getByRole('spinbutton', { name: 'Secunde etapa 49', exact: true })).toHaveAttribute('aria-valuenow', '3');
  await selectDuration(page, [0, 0, 4], undefined, 49); await page.getByRole('button', { name: 'Aplică durata', exact: true }).click();
  await page.getByRole('button', { name: 'Șterge etapa 50', exact: true }).click();
  expect((await stored(page)).planning).toEqual(data.planning);
  await page.getByRole('button', { name: 'Salvează orarul', exact: true }).click();
  const expected = [...data.planning.schedules[0].steps.slice(0, 48), { id: 'step-50', name: 'Acțiune 50', durationMs: 4000 }];
  await expect.poll(async () => (await stored(page)).planning.schedules[0].steps).toEqual(expected);
  await page.reload(); await expect(page.getByText('Cincizeci', { exact: true })).toBeVisible();
  expect((await stored(page)).planning.schedules[0].steps).toEqual(expected);
});

test('timer and schedule completions remain visible and stoppable inside an unsaved duration panel', async ({ page }) => {
  const now = Date.parse('2026-11-06T10:00:00Z');
  await page.clock.install({ time: now }); await page.clock.pauseAt(now);
  const data = initialData(); data.timer = startTimer(initialTimer(2000), now, 'parallel-timer');
  data.planning.schedules = [
    { id: 'run', name: 'Activ', steps: [{ id: 'a', name: 'Lucru', durationMs: 2000 }, { id: 'b', name: 'Pauză', durationMs: 1000 }] },
    { id: 'edit', name: 'Schiță', steps: [{ id: 'c', name: 'Respiră · Отдых', durationMs: 1000 }] },
  ];
  data.planning = startSchedule(data.planning, 'run', now, 'parallel-schedule');
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: 'Editează orarul Schiță', exact: true }).click();
  await page.getByRole('button', { name: 'Modifică durata etapei 1', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Durata etapei 1', exact: true });
  await selectDuration(panel, [0, 0, 4], undefined, 1);
  await page.clock.runFor(2000);
  await expect(panel.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  await expect(panel.getByLabel('Etapă finalizată', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
  await expect(panel.getByRole('spinbutton', { name: 'Secunde etapa 1', exact: true })).toHaveAttribute('aria-valuenow', '4');
  expect((await stored(page)).planning.schedules).toEqual(data.planning.schedules);
  await page.clock.runFor(1000);
  await expect(panel.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
  await panel.getByRole('button', { name: 'Aplică durata', exact: true }).click();
  await expect(page.getByLabel('Nume etapa 1', { exact: true })).toHaveValue('Respiră · Отдых');
  await page.getByRole('button', { name: 'Salvează orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules[1].steps[0].durationMs).toBe(4000);
  const saved = await stored(page);
  expect(saved.timer).toMatchObject({ status: 'completed', runId: 'parallel-timer' });
  expect(saved.planning.run).toMatchObject({ status: 'completed', runId: 'parallel-schedule' });
  expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.sessions).toEqual(data.sessions);
  expect(await playCount(page)).toBe(2);
});

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) {
  test(`${id} ${theme} wheel labels, resizing and enlarged web text preserve selection and fit mobile layouts`, async ({ page }) => {
    const width = { ro: 390, en: 430, ru: 320, es: 320, fr: 320, de: 320 }[id]; await page.setViewportSize({ width, height: 844 });
    const data = initialData(); data.preferences.language = id; data.preferences.theme = theme; data.timer = initialTimer(3663000);
    const name = 'Учёба · Școală'; data.planning.schedules = [{ id: 'layout', name, steps: [{ id: 'step', name: 'Respiră · Отдых', durationMs: 3663000 }] }];
    await seed(page, data); await page.goto('/timer'); const m = getMessages(id);
    for (const [index, value] of [1, 1, 3].entries()) {
      const wheel = page.getByRole('spinbutton', { name: m.timeUnits[index], exact: true });
      await expect(wheel).toHaveAttribute('aria-valuenow', String(value)); await centered(wheel);
    }
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    const next = LANGUAGES.find((language) => language.id !== id)!;
    await page.getByRole('radio', { name: next.label, exact: true }).click();
    await page.getByRole('radio', { name: LANGUAGES.find((language) => language.id === id)!.label, exact: true }).click();
    const settings = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
    await settings.getByRole('switch', { name: m.darkMode, exact: true }).click();
    await expectTheme(page, theme !== 'dark');
    await settings.getByRole('switch', { name: m.darkMode, exact: true }).click();
    await settings.getByRole('button', { name: m.close, exact: true }).click(); await expect(settings).not.toBeVisible();
    expect((await stored(page)).timer).toEqual(data.timer);
    await page.screenshot({ path: `previews/wheels-${id}-${theme}-${width}-timer.png`, animations: 'disabled' });
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
    await page.getByRole('button', { name: m.editSchedule(name), exact: true }).click();
    await page.getByRole('button', { name: m.editStepDuration(1), exact: true }).click();
    const panel = page.getByRole('dialog', { name: m.durationPickerTitle(1), exact: true });
    await panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[0], 1), exact: true }).press('Shift+Tab');
    await expect(panel.getByRole('button', { name: m.close, exact: true })).toBeFocused();
    // User-style enlargement exercises web text fit; native OS font scaling is a separate device check.
    await page.addStyleTag({ content: '[role="spinbutton"] button { font-size: 32px !important; }' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: width + 40, height: 844 }); await page.setViewportSize({ width, height: 844 });
    for (const [index, value] of [1, 1, 3].entries()) {
      const wheel = panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[index], 1), exact: true });
      await expect(wheel).toHaveAttribute('aria-valuenow', String(value)); await centered(wheel);
      const box = (await wheel.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await wheel.evaluate((element) => {
        const selected = element.querySelectorAll('button')[Number(element.getAttribute('aria-valuenow'))];
        const text = document.createRange(); text.selectNodeContents(selected);
        return text.getBoundingClientRect().height <= selected.getBoundingClientRect().height;
      })).toBe(true);
    }
    await expect(panel.getByRole('button', { name: m.applyDuration, exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `previews/wheels-${id}-${theme}-${width}-panel-large-text.png`, animations: 'disabled' });
    await panel.getByRole('button', { name: m.cancel, exact: true }).click();
    expect((await stored(page)).planning).toEqual(data.planning); expect((await stored(page)).timer).toEqual(data.timer);
  });
}
