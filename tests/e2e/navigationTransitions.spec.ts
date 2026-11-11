import { expect, test, type Page } from '@playwright/test';
import { LANGUAGES } from '../../src/core/language';
import { readFileSync } from 'node:fs';
import { getMessages } from '../../src/i18n';
import { initialData } from '../../src/core/stopwatch';
import { startSchedule } from '../../src/core/planning';
import { expectNoPageErrors, observePageErrors, seed, selectDuration, selectTheme, settings, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));
const m = getMessages('ro');

type SlideFrame = { incoming: number; outgoing: number | null; width: number; opacity: number; fits: boolean; headerTop: number; tabTop: number };
function collectSlide({ incoming, outgoing }: { incoming: string; outgoing?: string }) {
  const frames: SlideFrame[] = []; let frame = 0;
  const record = () => {
    const viewport = document.querySelector('[data-testid="app-viewport"]')?.getBoundingClientRect();
    const node = document.querySelector<HTMLElement>(`[data-testid="scene-${incoming}"]`);
    const rect = node?.getBoundingClientRect();
    if (viewport && rect && rect.width > 0) {
      const previous = outgoing && document.querySelector(`[data-testid="scene-${outgoing}"]`)?.getBoundingClientRect();
      let opacity = 1, parent: HTMLElement | null = node!;
      while (parent && parent.id !== 'crono-app') { opacity *= Number(getComputedStyle(parent).opacity); parent = parent.parentElement; }
      frames.push({ incoming: rect.left - viewport.left, outgoing: previous && previous.width > 0 ? previous.left - viewport.left : null, width: viewport.width, opacity,
        fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        headerTop: document.querySelector('[data-testid="app-viewport"]')!.firstElementChild!.getBoundingClientRect().top,
        tabTop: document.querySelector('[role="tab"]')!.getBoundingClientRect().top });
    }
    frame = requestAnimationFrame(record);
  };
  frame = requestAnimationFrame(record);
  Object.assign(window, { transitionSamples: frames, stopTransitionSamples: () => cancelAnimationFrame(frame) });
}
async function observeSlide(page: Page, incoming: string, outgoing?: string) {
  await page.evaluate(collectSlide, { incoming, outgoing });
}

async function samples(page: Page) {
  return page.evaluate(() => (window as unknown as { transitionSamples: SlideFrame[] }).transitionSamples);
}
async function stopSamples(page: Page) {
  await page.evaluate(() => (window as unknown as { stopTransitionSamples: () => void }).stopTransitionSamples());
}

async function centered(page: Page, name: string) {
  await expect.poll(() => page.getByTestId(`scene-${name}`).evaluate((node) => {
    const viewport = document.querySelector('[data-testid="app-viewport"]')!.getBoundingClientRect();
    return node.getBoundingClientRect().left - viewport.left;
  })).toBeCloseTo(0, 3);
}
async function expectSlide(page: Page, direction: 1 | -1) {
  await expect.poll(async () => (await samples(page)).some((frame) =>
    frame.incoming * direction > 1 && frame.incoming * direction < frame.width - 1 &&
    frame.outgoing !== null && frame.outgoing * direction < -1)).toBe(true);
  await expect.poll(async () => (await samples(page)).at(-1)?.incoming).toBeCloseTo(0, 3);
  await stopSamples(page);
  const frames = await samples(page);
  expect(frames.some((frame) => frame.incoming * direction > frame.width / 2)).toBe(true);
  expect(frames.every((frame) => Math.abs(frame.incoming) <= frame.width + 1 && frame.opacity === 1 && frame.fits)).toBe(true);
  expect(frames.every((frame) => frame.headerTop === frames[0].headerTop && frame.tabTop === frames[0].tabTop)).toBe(true);
}

test('tab navigation really slides scenes and immediately excludes the outgoing controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/');
  await expect(page.getByRole('tab', { name: m.timerTab, exact: true })).toBeVisible();
  const before = await stored(page); await observeSlide(page, 'timer', 'index');
  await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
  await expect(page.getByTestId('scene-index')).toHaveAttribute('inert', '');
  await expect(page.getByTestId('scene-timer')).toHaveAttribute('aria-hidden', 'false');
  await expectSlide(page, 1); expect(await stored(page)).toEqual(before);
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
  await centered(page, 'timer'); await page.waitForTimeout(300);
  await expect(page.locator('[data-testid^="scene-"][aria-hidden="false"]')).toHaveCount(1);
  expect(await stored(page)).toEqual(before);
});

test('live reduced motion settles a route slide and the real History Link still navigates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/');
  await expect(page.getByRole('tab', { name: m.historyTab, exact: true })).toBeVisible();
  await observeSlide(page, 'history'); await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await samples(page)).at(-1)?.incoming).toBeCloseTo(0, 3); await stopSamples(page);
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

test('same-route activation leaves a settled scene visible without replaying its slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/timer');
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  await centered(page, 'timer'); await observeSlide(page, 'timer'); const before = await stored(page);
  await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  await page.waitForTimeout(250); await stopSamples(page); expect((await samples(page)).every((frame) => frame.incoming === 0)).toBe(true);
  expect(await stored(page)).toEqual(before);
});

test('ActiveActivities imperative navigation slides the destination without rewriting concurrent run deadlines', async ({ page }) => {
  const now = Date.now(), data = initialData();
  data.stopwatch.startedAt = now;
  data.timer = { ...data.timer, durationMs: 3600000, remainingMs: 3600000, status: 'running', deadlineAt: now + 3600000, runId: 'route-timer' };
  data.planning.schedules = [{ id: 'route-plan', name: 'Parallel', steps: [{ id: 'route-step', name: 'Work', durationMs: 3600000 }] }];
  data.planning = startSchedule(data.planning, 'route-plan', now, 'route-planning');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/history');
  const before = await stored(page); await observeSlide(page, 'timer', 'history');
  await page.getByRole('button', { name: m.openActiveTimer, exact: true }).click();
  await expect(page).toHaveURL(/\/timer$/); await expect(page.getByRole('button', { name: m.pauseTimer, exact: true })).toBeEnabled();
  await expectSlide(page, -1); expect(await stored(page)).toEqual(before);
});

const routes = ['index', 'timer', 'planning', 'history'] as const;
const labels = [m.stopwatchTab, m.timerTab, m.planningTab, m.historyTab];
const url = (name: string) => name === 'index' ? '/' : `/${name}`;
for (const [from, to] of [[0, 1], [1, 2], [2, 3], [3, 2], [2, 1], [1, 0], [0, 3], [3, 0], [1, 3], [3, 1]]) {
  test(`${routes[from]} to ${routes[to]} travels directly in tab order`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto(url(routes[from]));
    await expect(page.getByRole('tab', { name: labels[from], exact: true })).toHaveAttribute('aria-selected', 'true');
    await centered(page, routes[from]); const before = await stored(page);
    const shell = await page.getByRole('button', { name: m.settings, exact: true }).boundingBox();
    const bar = await page.getByRole('tab', { name: labels[0], exact: true }).boundingBox();
    await observeSlide(page, routes[to], routes[from]);
    await page.getByRole('tab', { name: labels[to], exact: true }).click();
    await expect(page.getByTestId(`scene-${routes[from]}`)).toHaveAttribute('inert', '');
    await expect(page.getByRole('tab', { name: labels[to], exact: true })).toHaveAttribute('aria-selected', 'true');
    await expectSlide(page, to > from ? 1 : -1);
    expect(await page.getByRole('button', { name: m.settings, exact: true }).boundingBox()).toEqual(shell);
    expect(await page.getByRole('tab', { name: labels[0], exact: true }).boundingBox()).toEqual(bar);
    expect(await stored(page)).toEqual(before);
  });
}

for (const route of routes) test(`direct ${route} loading has no horizontal entrance`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page);
  await page.addInitScript(collectSlide, { incoming: route }); await page.goto(url(route));
  await expect(page.getByTestId(`scene-${route}`)).toHaveAttribute('aria-hidden', 'false');
  await centered(page, route); await page.waitForTimeout(250); await stopSamples(page);
  const frames = await samples(page); expect(frames.length).toBeGreaterThan(1);
  expect(frames.every((frame) => frame.incoming === 0 && frame.opacity === 1)).toBe(true);
});

for (const [index, language] of LANGUAGES.entries()) test(`${language.id} slide respects ${index % 2 ? 'wide dark' : 'compact light'} viewport`, async ({ page }) => {
  const data = initialData(), messages = getMessages(language.id);
  data.preferences.language = language.id; data.preferences.theme = index % 2 ? 'dark' : 'light';
  await page.setViewportSize({ width: index % 2 ? 1200 : 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/');
  await expect(page.getByRole('tab', { name: messages.timerTab, exact: true })).toBeVisible();
  await observeSlide(page, 'timer', 'index'); await page.getByRole('tab', { name: messages.timerTab, exact: true }).click();
  await expectSlide(page, 1);
  const frames = await samples(page); expect(frames.every((frame) => frame.width === (index % 2 ? 480 : 320))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect((await stored(page)).preferences).toEqual(data.preferences);
});

test('the real History Link slides left without changing accepted records', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/history');
  const link = page.getByRole('link', { name: m.toStopwatch, exact: true }); await expect(link).toHaveAttribute('href', '/');
  const before = await stored(page); await observeSlide(page, 'index', 'history'); await link.press('Enter');
  await expect(page).toHaveURL(/\/$/); await expectSlide(page, -1); expect(await stored(page)).toEqual(before);
});

test('ActiveActivities opens Planning to the right while preserving its running deadline', async ({ page }) => {
  const now = Date.now(), data = initialData();
  data.planning.schedules = [{ id: 'planning-entry', name: 'Running', steps: [{ id: 'running-step', name: 'Work', durationMs: 3600000 }] }];
  data.planning = startSchedule(data.planning, 'planning-entry', now, 'entry-run');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/timer');
  const open = page.getByRole('button', { name: m.openActivePlanning, exact: true }); await expect(open).toBeVisible();
  const before = await stored(page); await observeSlide(page, 'planning', 'timer'); await open.click();
  await expect(page).toHaveURL(/\/planning$/); await expectSlide(page, 1); expect(await stored(page)).toEqual(before);
});

for (const policy of ['reduce', 'background', 'resize'] as const) test(`${policy} during a slide converges without replay`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/');
  await expect(page.getByRole('tab', { name: m.historyTab, exact: true })).toBeVisible(); const before = await stored(page);
  await observeSlide(page, 'history', 'index'); await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
  await expect.poll(async () => (await samples(page)).some((frame) => frame.incoming > 1 && frame.incoming < frame.width - 1)).toBe(true);
  if (policy === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
  if (policy === 'background') await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
  });
  if (policy === 'resize') await page.setViewportSize({ width: 1200, height: 844 });
  await centered(page, 'history'); await stopSamples(page); await observeSlide(page, 'history');
  if (policy === 'reduce') await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (policy === 'background') await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300); await stopSamples(page);
  expect((await samples(page)).every((frame) => frame.incoming === 0)).toBe(true);
  expect(await stored(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('link', { name: m.toStopwatch, exact: true }).press('Enter'); await centered(page, 'index');
});

test('initial reduced motion changes tabs immediately and enabling motion does not replay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await seed(page); await page.goto('/');
  await expect(page.getByRole('tab', { name: m.timerTab, exact: true })).toBeVisible();
  await observeSlide(page, 'timer'); await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
  await centered(page, 'timer'); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(300); await stopSamples(page);
  expect((await samples(page)).every((frame) => frame.incoming === 0)).toBe(true);
  await observeSlide(page, 'planning', 'timer'); await page.getByRole('tab', { name: m.planningTab, exact: true }).click(); await expectSlide(page, 1);
});

test('Planning retains its existing scroll position through directional departure and return', async ({ page }) => {
  const data = initialData(); data.planning.schedules = Array.from({ length: 20 }, (_, i) => ({
    id: `retained-${i}`, name: `Schedule ${i}`, steps: [{ id: `retained-step-${i}`, name: 'Work', durationMs: 60000 }],
  }));
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/planning');
  await expect(page.getByRole('button', { name: m.newSchedule, exact: true })).toBeVisible();
  const owner = await page.getByTestId('scene-planning').evaluateHandle((root) => {
    const node = [...root.querySelectorAll<HTMLElement>('div')].find((item) => getComputedStyle(item).overflowY === 'auto' && item.clientHeight > 0);
    if (!node) throw new Error('Planning scroll owner absent'); return node;
  });
  try {
    const box = await owner.evaluate((node) => node.getBoundingClientRect().toJSON());
    await page.mouse.move(box.right - 10, box.y + box.height / 2); await page.mouse.wheel(0, 500);
    await expect.poll(() => owner.evaluate((node) => node.scrollTop)).toBeGreaterThan(100); await page.waitForTimeout(250);
    const offset = await owner.evaluate((node) => node.scrollTop), before = await stored(page);
    await page.getByRole('tab', { name: m.timerTab, exact: true }).click(); await centered(page, 'timer');
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click(); await centered(page, 'planning');
    await expect.poll(() => owner.evaluate((node) => node.scrollTop)).toBeCloseTo(offset, 3);
    expect(await stored(page)).toEqual(before);
  } finally { await owner.dispose(); }
});

test('literal legacy records survive directional navigation and reload', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, legacy); await page.goto('/timer');
  await expect(page.getByRole('button', { name: m.restartTimer, exact: true })).toBeEnabled();
  // Flush the hydrated legacy snapshot through its existing inactivity persistence path.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await stored(page)).planning).toEqual({ run: null, schedules: [] });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange'));
  });
  await centered(page, 'timer'); const before = await stored(page);
  for (const [route, label] of [['history', m.historyTab], ['index', m.stopwatchTab], ['planning', m.planningTab], ['timer', m.timerTab]]) {
    await page.getByRole('tab', { name: label, exact: true }).click(); await centered(page, route);
  }
  expect(await stored(page)).toEqual(before); await page.reload();
  await expect(page.getByRole('button', { name: m.restartTimer, exact: true })).toBeEnabled(); await centered(page, 'timer');
  expect(await stored(page)).toEqual(before);
  expect(before.sessions).toEqual(legacy.sessions); expect(before.stopwatch).toEqual(legacy.stopwatch);
  expect(before.preferences.haptics).toBe(false); expect(before.preferences.keepAwake).toBe(false);
  expect(before.timer.runId).toBe('legacy-completed');
});

test('theme and language changes keep the settled route centered', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page); await page.goto('/timer');
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled(); await centered(page, 'timer');
  await observeSlide(page, 'timer'); await settings(page, 'appearance'); await selectTheme(page, 'dark');
  await page.getByRole('dialog').getByRole('button', { name: m.close, exact: true }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await settings(page, 'language'); await page.getByRole('radio', { name: 'English', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: getMessages('en').close, exact: true }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await centered(page, 'timer'); await page.waitForTimeout(250); await stopSamples(page);
  expect((await samples(page)).every((frame) => frame.incoming === 0)).toBe(true);
  const data = await stored(page); expect(data.preferences.theme).toBe('dark'); expect(data.preferences.language).toBe('en');
});

test('a saved-session notice does not replay the settled route', async ({ page }) => {
  const data = initialData(); data.stopwatch.accumulatedMs = 1234;
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, data); await page.goto('/');
  const save = page.getByRole('button', { name: m.saveSession, exact: true }); await expect(save).toBeVisible();
  await centered(page, 'index'); await observeSlide(page, 'index'); await save.click();
  await expect(page.getByText(m.sessionSaved, { exact: true })).toBeVisible();
  await page.waitForTimeout(250); await stopSamples(page);
  expect((await samples(page)).every((frame) => frame.incoming === 0)).toBe(true);
  const after = await stored(page); expect(after.sessions).toHaveLength(1); expect(after.sessions[0].durationMs).toBe(1234);
  expect(after.timer).toEqual(data.timer); expect(after.planning).toEqual(data.planning);
});
