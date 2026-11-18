import { getMessages } from '../../src/i18n';
import { expect, test } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { seed, stored, observePageErrors, expectNoPageErrors } from './helpers';

test('Settings changes do not rebuild unchanged tab routes while real navigation still does', async ({ page }) => {
  await seed(page, initialData()); observePageErrors(page);
  await page.addInitScript(() => {
    const map = Array.prototype.map;
    Object.assign(window, { routePasses: 0 });
    Array.prototype.map = function (this: { key?: string; name?: string }[], ...args: Parameters<typeof map>) {
      if (this.length === 4 && this.every((route) => route && typeof route.key === 'string'
        && ['index', 'timer', 'planning', 'history'].includes(route.name ?? ''))) {
        (window as unknown as { routePasses: number }).routePasses++;
      }
      return Reflect.apply(map, this, args);
    } as typeof map;
  });
  await page.goto('/timer');
  const m = getMessages('ro');
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeVisible();
  await page.waitForTimeout(600);
  const reset = () => page.evaluate(() => { (window as unknown as { routePasses: number }).routePasses = 0; });
  const passes = () => page.evaluate(() => (window as unknown as { routePasses: number }).routePasses);
  await reset();
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
  await expect(dialog).toBeVisible(); await page.waitForTimeout(500);
  expect(await passes(), 'opening Settings must leave unchanged route work asleep').toBe(0);
  await dialog.getByRole('button', { name: m.settingsGroups.language, exact: true }).click();
  await page.getByRole('dialog', { name: m.settingsGroups.language, exact: true }).getByRole('button', { name: m.back, exact: true }).click();
  await dialog.getByRole('button', { name: m.close, exact: true }).click();
  await expect(dialog).toHaveCount(0); await page.waitForTimeout(500);
  expect(await passes(), 'closing Settings must leave unchanged route work asleep').toBe(0);
  await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  await expect(page.getByRole('tab', { name: m.planningTab, exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(passes).toBeGreaterThan(0);
  expectNoPageErrors(page);
});

test('an unfocused stopwatch stops presentation work and reveals current elapsed time', async ({ page }) => {
  const data = initialData(); data.stopwatch.startedAt = Date.now() - 20000;
  await seed(page, data); observePageErrors(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const readout = page.getByLabel(/^Timp total /);
  await expect(readout).toBeVisible(); const before = await readout.getAttribute('aria-label');
  await page.getByRole('tab', { name: 'Timer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pornește temporizatorul', exact: true })).toBeVisible();
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const readout = document.querySelector('[data-testid="scene-index"] [aria-label^="Timp total "]')!;
    const state = { mutations: 0, observer: new MutationObserver(() => state.mutations++) };
    state.observer.observe(readout, { subtree: true, childList: true, characterData: true, attributes: true });
    Object.assign(window, { performanceClock: state });
  });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => {
    const state = (window as unknown as { performanceClock: { mutations: number; observer: MutationObserver } }).performanceClock;
    state.observer.disconnect(); return state.mutations;
  })).toBe(0);
  await page.getByRole('tab', { name: 'Cronometru', exact: true }).click();
  await expect(readout).toBeVisible(); await expect(readout).not.toHaveAttribute('aria-label', before!);
  expect((await stored(page)).stopwatch).toEqual(data.stopwatch); expectNoPageErrors(page);
});

for (const surface of ['stopwatch', 'history'] as const) test(`${surface} opens one thousand laps with bounded mounted content and reaches the final row`, async ({ page }) => {
  const data = initialData();
  const laps = Array.from({ length: 1000 }, (_, i) => ({ number: i + 1, elapsedMs: (i + 1) * 1000, splitMs: 1000 }));
  data.stopwatch = { accumulatedMs: 1000000, startedAt: null, laps };
  data.sessions = [{ id: 'large', savedAt: 1700000000000, durationMs: 1000000, laps }];
  await seed(page, data); observePageErrors(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continuă', exact: true })).toBeVisible();
  if (surface === 'history') {
    await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
    await page.getByRole('button', { name: /^Sesiune .*1000/ }).click();
    await expect(page.getByRole('dialog', { name: 'Sesiunea ta.' })).toBeVisible();
  }
  expect(await page.locator('*').count()).toBeLessThan(2000);
  const scope = surface === 'history' ? page.getByRole('dialog', { name: 'Sesiunea ta.' }) : page.getByTestId('scene-index');
  await expect(scope.getByTestId('lap-row-1000')).toBeVisible();
  const list = scope.getByTestId('lap-list');
  // RN deliberately constrains an unmeasured tail for variable-height rows.
  // Advance real gestures as new rows are measured; never assign scroll offsets.
  await list.hover();
  await expect.poll(async () => {
    await page.mouse.wheel(0, 100000); await page.waitForTimeout(75);
    return scope.getByTestId('lap-row-1').isVisible();
  }, { intervals: [20], timeout: 10000 }).toBe(true);
  expect((await stored(page)).sessions).toEqual(data.sessions); expectNoPageErrors(page);
});

test('temporary duration changes do not encode the unchanged fifty-step editor draft', async ({ page }) => {
  const m = getMessages('ro');
  const data = initialData();
  data.planning.schedules = [{ id: 'large', name: 'Large', steps: Array.from({ length: 50 }, (_, i) => ({ id: `a${i}`, name: `Step ${i}`, durationMs: 60000 })) }];
  await seed(page, data); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const stringify = JSON.stringify; Object.assign(window, { editorEncodings: 0 });
    JSON.stringify = ((value: unknown, ...args: unknown[]) => {
      if (value && typeof value === 'object' && 'steps' in value && Array.isArray(value.steps)
        && typeof value.steps[0]?.hours === 'string') {
        (window as unknown as { editorEncodings: number }).editorEncodings++;
      }
      return Reflect.apply(stringify, JSON, [value, ...args]);
    }) as typeof JSON.stringify;
  });
  await page.goto('/planning');
  await page.getByRole('button', { name: m.scheduleOptions('Large'), exact: true }).click();
  await page.getByRole('button', { name: m.editSchedule('Large'), exact: true }).click();
  await page.getByRole('button', { name: m.editStepDuration(1), exact: true }).click();
  const seconds = page.getByRole('spinbutton', { name: m.stepField(m.timeUnits[2], 1), exact: true });
  await expect(seconds).toBeVisible();
  await page.evaluate(() => { (window as unknown as { editorEncodings: number }).editorEncodings = 0; });
  for (let i = 0; i < 4; i++) await seconds.press('ArrowUp');
  expect(await page.evaluate(() => (window as unknown as { editorEncodings: number }).editorEncodings)).toBe(0);
  await page.getByRole('button', { name: 'Renunță', exact: true }).click();
  expect((await stored(page)).planning.schedules).toEqual(data.planning.schedules);
});
