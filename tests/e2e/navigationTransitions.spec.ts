import { expect, test, type Page } from '@playwright/test';
import { getMessages } from '../../src/i18n';
import { initialData } from '../../src/core/stopwatch';
import { startSchedule } from '../../src/core/planning';
import { expectNoPageErrors, observePageErrors, seed, selectDuration, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));
const m = getMessages('ro');

async function observeFade(page: Page, name: string) {
  await page.evaluate((scene) => {
    const samples: number[] = []; let frame = 0;
    const record = () => {
      let node = document.querySelector<HTMLElement>(`[data-testid="scene-${scene}"]`), opacity = 1;
      if (node) {
        while (node && node.id !== 'crono-app') { opacity *= Number(getComputedStyle(node).opacity); node = node.parentElement; }
        samples.push(opacity);
      }
      frame = requestAnimationFrame(record);
    };
    frame = requestAnimationFrame(record);
    Object.assign(window, { transitionSamples: samples, stopTransitionSamples: () => cancelAnimationFrame(frame) });
  }, name);
}

async function samples(page: Page) {
  return page.evaluate(() => (window as unknown as { transitionSamples: number[] }).transitionSamples);
}
async function stopSamples(page: Page) {
  await page.evaluate(() => (window as unknown as { stopTransitionSamples: () => void }).stopTransitionSamples());
}

test('tab navigation really fades scenes and immediately excludes the outgoing controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/');
  await expect(page.getByRole('tab', { name: m.timerTab, exact: true })).toBeVisible();
  const before = await stored(page); await observeFade(page, 'timer');
  await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
  await expect(page.getByTestId('scene-index')).toHaveAttribute('inert', '');
  await expect(page.getByTestId('scene-timer')).toHaveAttribute('aria-hidden', 'false');
  await expect.poll(async () => (await samples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await expect.poll(async () => (await samples(page)).at(-1)).toBeCloseTo(1, 5);
  await stopSamples(page); expect(await stored(page)).toEqual(before);
});

test('rapid navigation retains the timer selection, independent clocks and the final active scene', async ({ page }) => {
  const data = initialData(); data.stopwatch.startedAt = Date.now();
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/timer');
  await selectDuration(page, [0, 0, 17]);
  const before = await stored(page);
  for (const label of [m.planningTab, m.historyTab, m.stopwatchTab, m.timerTab]) {
    await page.getByRole('tab', { name: label, exact: true }).click();
  }
  await expect(page.getByTestId('scene-timer')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('spinbutton', { name: m.timeUnits[2], exact: true })).toHaveAttribute('aria-valuenow', '17');
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  expect(await stored(page)).toEqual(before);
});

test('live reduced motion settles a route fade and the real History Link still navigates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/');
  await expect(page.getByRole('tab', { name: m.historyTab, exact: true })).toBeVisible();
  await observeFade(page, 'history'); await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await samples(page)).at(-1)).toBeCloseTo(1, 5); await stopSamples(page);
  const link = page.getByRole('link', { name: m.toStopwatch, exact: true });
  await expect(link).toHaveAttribute('href', '/'); await link.press('Enter'); await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: m.start, exact: true })).toBeEnabled();
});

test('imperative activity navigation beneath a portaled editor preserves its draft and current controls', async ({ page }) => {
  const data = initialData(), now = Date.now();
  data.timer = { ...data.timer, durationMs: 3600000, remainingMs: 3600000, status: 'running', deadlineAt: now + 3600000, runId: 'portal-timer' };
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
  const name = page.getByRole('textbox', { name: m.scheduleName, exact: true }); await name.fill('Portal draft');
  const before = await stored(page);
  // Invoke the existing imperative handler as an external navigation request while the root is inert.
  await page.getByRole('button', { name: m.openActiveTimer, exact: true, includeHidden: true }).evaluate((node) => (node as HTMLElement).click());
  await expect(page).toHaveURL(/\/timer$/); await expect(page.getByTestId('scene-planning')).toHaveAttribute('inert', '');
  await expect(name).toHaveValue('Portal draft'); await name.fill('Portal draft retained');
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: m.pauseTimer, exact: true })).toBeEnabled();
  await expect.poll(async () => (await stored(page)).planning.schedules[0]?.name).toBe('Portal draft retained');
  const after = await stored(page); expect(after.timer).toEqual(before.timer); expect(after.stopwatch).toEqual(before.stopwatch);
});

test('browser Back restores the requested URL without stranding modal isolation or changing saved records', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/timer');
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  // Tabs replace browser entries; an earlier host entry exercises the actual popstate owner.
  await page.evaluate(() => history.pushState(history.state, '', location.href));
  await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  await page.getByRole('button', { name: m.settingsGroups.appearance, exact: true }).click();
  const before = await stored(page); await page.goBack(); await expect(page).toHaveURL(/\/timer$/);
  await expect(page.getByTestId('scene-timer')).toHaveAttribute('aria-hidden', 'false');
  // An entry outside the navigator's own history restores the document and drops transient UI.
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.locator('#crono-app').evaluate((node) => (node as HTMLElement).inert)).toBe(false);
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled(); expect(await stored(page)).toEqual(before);
});

test('same-route activation leaves a settled scene visible without replaying its fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/timer');
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  await observeFade(page, 'timer'); const before = await stored(page);
  await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  await stopSamples(page); expect((await samples(page)).every((value) => value === 1)).toBe(true);
  expect(await stored(page)).toEqual(before);
});

test('ActiveActivities imperative navigation fades the destination without rewriting concurrent run deadlines', async ({ page }) => {
  const now = Date.now(), data = initialData();
  data.stopwatch.startedAt = now;
  data.timer = { ...data.timer, durationMs: 3600000, remainingMs: 3600000, status: 'running', deadlineAt: now + 3600000, runId: 'route-timer' };
  data.planning.schedules = [{ id: 'route-plan', name: 'Parallel', steps: [{ id: 'route-step', name: 'Work', durationMs: 3600000 }] }];
  data.planning = startSchedule(data.planning, 'route-plan', now, 'route-planning');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/history');
  const before = await stored(page); await observeFade(page, 'timer');
  await page.getByRole('button', { name: m.openActiveTimer, exact: true }).click();
  await expect(page).toHaveURL(/\/timer$/); await expect(page.getByRole('button', { name: m.pauseTimer, exact: true })).toBeEnabled();
  await expect.poll(async () => (await samples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await stopSamples(page); expect(await stored(page)).toEqual(before);
});
