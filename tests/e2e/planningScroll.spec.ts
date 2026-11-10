import { expect, test, type Locator, type Page } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer, startTimer } from '../../src/core/timer';
import { pauseSchedule, reconcileSchedule, startSchedule } from '../../src/core/planning';
import { LANGUAGES } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { scheduleOptions, audioSpy, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, stepDuration, stored } from './helpers';

const m = getMessages('ro');
const scrollWarnings = new WeakMap<Page, string[]>();

function scheduleData(count = 20) {
  const data = initialData();
  data.stopwatch.accumulatedMs = 1234;
  data.planning.schedules = Array.from({ length: count }, (_, index) => ({
    id: `scroll-schedule-${index}`, name: `Orar ${String(index + 1).padStart(2, '0')}`,
    steps: [{ id: `scroll-action-${index}`, name: 'Lucru', durationMs: 300000 }],
  }));
  return data;
}

async function top(locator: Locator) {
  return locator.evaluate((element) => element.getBoundingClientRect().top);
}

async function positions(page: Page, locators: Locator[]) {
  const elements = await Promise.all(locators.map((locator) => locator.elementHandle()));
  try {
    // Compare one layout frame; wheel scrolling can continue between protocol calls.
    return await page.evaluate((nodes) => nodes.map((node) => {
      if (!node) throw new Error('Missing scroll comparison element');
      return node.getBoundingClientRect().top;
    }), elements);
  } finally {
    await Promise.all(elements.map((element) => element?.dispose()));
  }
}

async function wheelOver(page: Page, target: Locator, delta: number) {
  await expect(target).toBeInViewport();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, delta);
}

async function shellPosition(page: Page) {
  return {
    settings: await top(page.getByRole('button', { name: m.settings, exact: true })),
    timerTab: await top(page.getByRole('tab', { name: m.timerTab, exact: true })),
  };
}

async function wheelPage(page: Page, delta: number) {
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width / 2, viewport.height - 150);
  await page.mouse.wheel(0, delta);
}

async function expectHorizontalFit(page: Page) {
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  const buttons = await page.getByRole('button').evaluateAll((nodes) => nodes.map((node) => {
    const { left, right, width, height } = node.getBoundingClientRect();
    return { label: node.getAttribute('aria-label') ?? node.textContent, left, right, width, height,
      overflow: node.scrollWidth - node.clientWidth };
  }));
  for (const button of buttons) {
    expect(button.left, String(button.label)).toBeGreaterThanOrEqual(0);
    expect(button.right, String(button.label)).toBeLessThanOrEqual(viewport.width);
    expect(button.width, String(button.label)).toBeGreaterThanOrEqual(44);
    expect(button.height, String(button.label)).toBeGreaterThanOrEqual(44);
    expect(button.overflow, String(button.label)).toBeLessThanOrEqual(1);
  }
}

async function selectDay(page: Page, date: string) {
  await page.getByRole('button', { name: m.calendarChooseDay, exact: false }).click();
  const picker = page.getByRole('dialog', { name: m.calendarChooseDay, exact: true });
  const [year, month, day] = date.split('-');
  for (const [name, value] of [[m.calendarDay, day], [m.calendarMonth, month], [m.calendarYear, year]]) {
    await picker.getByRole('textbox', { name, exact: true }).fill(value);
  }
  await picker.getByRole('button', { name: m.calendarShow, exact: true }).click();
  await expect(picker).not.toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  observePageErrors(page);
  const warnings: string[] = []; scrollWarnings.set(page, warnings);
  page.on('console', (message) => {
    if (/VirtualizedLists|nested.*ScrollView/i.test(message.text())) warnings.push(message.text());
  });
});

test.afterEach(({ page }) => {
  expectNoPageErrors(page);
  expect(scrollWarnings.get(page)).toEqual([]);
});

test('wheel scrolling over the page header moves all Planning content and reaches the final schedule', async ({ page }) => {
  await seed(page, scheduleData()); await audioSpy(page); await page.goto('/planning');
  const heading = page.getByRole('heading', { name: m.planningTab, exact: true });
  await expect(heading).toBeInViewport();
  const origin = await top(heading), shell = await shellPosition(page), before = await stored(page);
  await wheelOver(page, page.getByText(m.planningSubtitle, { exact: true }), 240);
  await expect.poll(() => top(heading)).toBeLessThan(origin - 80);
  expect(await shellPosition(page)).toEqual(shell);
  await page.mouse.move(195, 440); await page.mouse.wheel(0, 9000);
  const finalEdit = page.getByRole('button', { name: m.startSchedule('Orar 20'), exact: true });
  await expect(finalEdit).toBeInViewport();
  await page.mouse.wheel(0, -9000);
  await expect.poll(() => top(heading)).toBeCloseTo(origin, 0);
  await expect(page.getByRole('button', { name: m.newSchedule, exact: true })).toBeInViewport();
  expect(await shellPosition(page)).toEqual(shell);
  expect(await stored(page)).toEqual(before);
  expect(await playCount(page)).toBe(0);
});

test('wheel scrolling over a schedule also moves the page controls without changing data', async ({ page }) => {
  await seed(page, scheduleData()); await audioSpy(page); await page.goto('/planning');
  const heading = page.getByRole('heading', { name: m.planningTab, exact: true });
  await expect(heading).toBeInViewport();
  const origin = await top(heading), shell = await shellPosition(page), before = await stored(page);
  await wheelOver(page, page.getByText('Orar 01', { exact: true }), 240);
  await expect.poll(() => top(heading)).toBeLessThan(origin - 80);
  expect(await shellPosition(page)).toEqual(shell);
  expect(await stored(page)).toEqual(before);
  expect(await playCount(page)).toBe(0);
});

test('wheel scrolling over expanded built-ins moves the whole page and reaches saved schedules', async ({ page }) => {
  await seed(page, scheduleData(2)); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  const heading = page.getByRole('heading', { name: m.planningTab, exact: true });
  const first = page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true });
  const original = await positions(page, [heading, first]), shell = await shellPosition(page), before = await stored(page);
  await wheelOver(page, first, 240);
  await expect.poll(() => top(heading)).toBeLessThan(original[0] - 80);
  const moved = await positions(page, [heading, first]);
  expect(Math.abs((original[0] - moved[0]) - (original[1] - moved[1]))).toBeLessThan(2);
  const finalChoice = page.getByRole('button', { name: m.planningTemplateNames.activeBreak.name, exact: true });
  await finalChoice.scrollIntoViewIfNeeded(); await expect(finalChoice).toBeInViewport();
  const finalSaved = page.getByRole('button', { name: m.startSchedule('Orar 02'), exact: true });
  await finalSaved.scrollIntoViewIfNeeded(); await expect(finalSaved).toBeInViewport();
  expect(await shellPosition(page)).toEqual(shell); expect(await stored(page)).toEqual(before);
  expect(await playCount(page)).toBe(0); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a real touch drag over a built-in scrolls without opening its draft', async ({ page, context }) => {
  await seed(page, scheduleData(2)); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  const heading = page.getByRole('heading', { name: m.planningTab, exact: true });
  const first = page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true });
  await expect(first).toBeInViewport();
  const origin = await top(heading), shell = await shellPosition(page), before = await stored(page), box = (await first.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 6; index++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 15 }] });
      await page.waitForTimeout(35);
    }
  } finally {
    try { await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    finally { await session.detach(); }
  }
  await expect.poll(() => top(heading)).toBeLessThan(origin - 30);
  expect(await shellPosition(page)).toEqual(shell); expect(await stored(page)).toEqual(before);
  expect(await playCount(page)).toBe(0); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a real touch drag over New Schedule scrolls the page without activating the button', async ({ page, context }) => {
  await seed(page, scheduleData(8)); await audioSpy(page); await page.goto('/planning');
  const heading = page.getByRole('heading', { name: m.planningTab, exact: true });
  const create = page.getByRole('button', { name: m.newSchedule, exact: true });
  await expect(create).toBeInViewport();
  const origin = await top(heading), shell = await shellPosition(page), before = await stored(page);
  const box = (await create.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 6; index++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 15 }] });
      await page.waitForTimeout(35); // Pace the actual gesture, not an assertion or settling timeout.
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => top(heading)).toBeLessThan(origin - 30);
  expect(await shellPosition(page)).toEqual(shell);
  expect(await stored(page)).toEqual(before);
  expect(await playCount(page)).toBe(0);
});

test('a touch drag over a schedule Start button scrolls without starting a run', async ({ page, context }) => {
  await seed(page, scheduleData(8)); await audioSpy(page); await page.goto('/planning');
  const heading = page.getByRole('heading', { name: m.planningTab, exact: true });
  const start = page.getByRole('button', { name: m.startSchedule('Orar 01'), exact: true });
  await expect(start).toBeInViewport();
  const origin = await top(heading), before = await stored(page), box = (await start.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 6; index++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 15 }] });
      await page.waitForTimeout(35);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
  await expect.poll(() => top(heading)).toBeLessThan(origin - 30);
  expect(await stored(page)).toEqual(before);
  expect(await playCount(page)).toBe(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

const layouts = LANGUAGES.flatMap(({ id }) => (['light', 'dark'] as const).map((theme) => ({
  language: id, theme, width: 320, height: 568,
})));
layouts.push(
  { language: 'ro', theme: 'light', width: 390, height: 844 },
  { language: 'ro', theme: 'dark', width: 430, height: 932 },
  { language: 'ro', theme: 'light', width: 1024, height: 768 },
);
for (const { language, theme, width, height } of layouts) {
  test(`whole-page controls and final-card actions fit ${language} ${theme} at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const data = scheduleData(); data.preferences.language = language; data.preferences.theme = theme;
    await seed(page, data); await page.goto('/planning');
    const messages = getMessages(language);
    const heading = page.getByRole('heading', { name: messages.planningTab, exact: true });
    const create = page.getByRole('button', { name: messages.newSchedule, exact: true });
    const filter = page.getByRole('button', { name: messages.calendarAll, exact: true });
    await expect(heading).toBeInViewport(); await expectTheme(page, theme === 'dark');
    await expectHorizontalFit(page);
    const capture = (language === 'ro' && width === 390) || (language === 'fr' && theme === 'dark');
    const screenshot = `previews/planning-scroll-${language}-${theme}-${width}x${height}`;
    if (capture) await page.screenshot({ path: `${screenshot}-top.png` });
    await page.evaluate(async () => { await document.fonts.ready; });
    const [origin, createTop, filterTop] = await positions(page, [heading, create, filter]);
    await wheelOver(page, page.getByText(messages.planningSubtitle, { exact: true }), 240);
    await expect.poll(() => top(heading)).toBeLessThan(origin - 80);
    const [headingAfter, createAfter, filterAfter] = await positions(page, [heading, create, filter]);
    const moved = origin - headingAfter;
    expect(createTop - createAfter).toBeCloseTo(moved, 0);
    expect(filterTop - filterAfter).toBeCloseTo(moved, 0);
    await wheelPage(page, 9000);
    await expect(page.getByRole('button', { name: messages.startSchedule('Orar 20'), exact: true })).toBeInViewport();
    await expectHorizontalFit(page);
    if (capture) await page.screenshot({ path: `${screenshot}-bottom.png` });
    await wheelPage(page, -9000);
    await expect.poll(() => top(heading)).toBeCloseTo(origin, 0);
    await expect(create).toBeInViewport(); await expect(create).toBeDisabled();
  });
}

for (const count of [0, 1]) {
  test(`${count === 0 ? 'empty' : 'short'} Planning content keeps its controls reachable`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, scheduleData(count)); await page.goto('/planning');
    const create = page.getByRole('button', { name: m.newSchedule, exact: true });
    await expect(create).toBeInViewport(); await expect(create).toBeEnabled();
    await expect(page.getByRole('button', { name: m.calendarChooseDay, exact: true })).toBeInViewport();
    const before = await stored(page);
    await wheelPage(page, 1200);
    if (count === 0) await expect(page.getByText(m.planningEmpty, { exact: true })).toBeInViewport();
    else await expect(page.getByRole('button', { name: m.startSchedule('Orar 01'), exact: true })).toBeInViewport();
    await expectHorizontalFit(page); await wheelPage(page, -1200); await expect(create).toBeInViewport();
    expect(await stored(page)).toEqual(before);
  });
}

test('date filters keep the active run and the total template limit when results shrink', async ({ page }) => {
  const data = scheduleData(); const now = Date.now();
  data.planning.schedules[0].calendar = { kind: 'once', date: '2026-11-09' };
  data.planning = pauseSchedule(startSchedule(data.planning, 'scroll-schedule-0', now, 'scroll-run'), now + 1000);
  await seed(page, data); await page.goto('/planning');
  const create = page.getByRole('button', { name: m.newSchedule, exact: true });
  await expect(create).toBeDisabled(); const before = await stored(page);
  await wheelPage(page, 9000);
  await expect(page.getByRole('button', { name: m.startSchedule('Orar 20'), exact: true })).toBeInViewport();
  await wheelPage(page, -9000);
  await selectDay(page, '2026-11-10');
  await expect(page.getByRole('button', { name: m.resumeSchedule, exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: m.startSchedule('Orar 01'), exact: true })).toHaveCount(0);
  await expect(create).toBeDisabled();
  await wheelPage(page, 9000); await expect(page.getByText(m.calendarEmpty, { exact: true })).toBeInViewport();
  await wheelPage(page, -9000); await expect(create).toBeInViewport();
  await selectDay(page, '2026-11-09');
  await expect(page.getByRole('button', { name: m.startSchedule('Orar 01'), exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: m.startSchedule('Orar 02'), exact: true })).toHaveCount(0);
  await expect(create).toBeDisabled();
  await page.getByRole('button', { name: m.calendarAll, exact: true }).click();
  await expect(page.getByRole('button', { name: m.startSchedule('Orar 02'), exact: true })).toBeEnabled();
  expect(await stored(page)).toEqual(before);
});

for (const status of ['running', 'paused', 'completed'] as const) {
  test(`scrolling preserves ${status} run controls and independent clocks`, async ({ page }) => {
    const data = scheduleData(); const now = Date.now();
    data.stopwatch.startedAt = now;
    data.timer = startTimer(initialTimer(600000), now, 'independent-timer');
    data.planning = startSchedule(data.planning, 'scroll-schedule-0', status === 'completed' ? now - 300001 : now, 'scroll-run');
    if (status === 'paused') data.planning = pauseSchedule(data.planning, now + 1000);
    if (status === 'completed') data.planning = reconcileSchedule(data.planning, now).state;
    await seed(page, data); await audioSpy(page); await page.goto('/planning');
    const label = status === 'running' ? m.pauseSchedule : status === 'paused' ? m.resumeSchedule : m.restartSchedule;
    await expect(page.getByRole('button', { name: label, exact: true })).toBeEnabled();
    const before = await stored(page);
    const edit = page.getByRole('button', { name: m.startSchedule('Orar 01'), exact: true });
    if (status === 'completed') await expect(edit).toBeEnabled(); else await expect(edit).toBeDisabled();
    await wheelPage(page, 9000);
    await expect(page.getByRole('button', { name: m.startSchedule('Orar 20'), exact: true })).toBeInViewport();
    await wheelPage(page, -9000);
    expect(await stored(page)).toEqual(before); expect(await playCount(page)).toBe(0);
    if (status === 'running') {
      await page.getByRole('button', { name: m.pauseSchedule, exact: true }).click();
      await expect(page.getByRole('button', { name: m.resumeSchedule, exact: true })).toBeEnabled();
      await page.getByRole('button', { name: m.startSchedule('Orar 02'), exact: true }).click();
      const confirm = page.getByRole('dialog', { name: m.replaceScheduleTitle, exact: true });
      await confirm.getByRole('button', { name: m.replaceScheduleConfirm, exact: true }).click();
      await expect(confirm).not.toBeVisible();
      await expect(edit).toBeEnabled();
      await expect(page.getByRole('button', { name: m.startSchedule('Orar 02'), exact: true })).toBeDisabled();
      const changed = await stored(page);
      expect(changed.planning.run?.scheduleId).toBe('scroll-schedule-1');
      expect(changed.timer).toEqual(before.timer); expect(changed.stopwatch).toEqual(before.stopwatch);
    }
  });
}

test('a run reset confirmation survives a parent update from independent timer completion', async ({ page }) => {
  const now = Date.parse('2026-11-09T10:00:00Z');
  await page.clock.install({ time: now }); await page.clock.pauseAt(now);
  const data = scheduleData(3);
  data.planning = startSchedule(data.planning, 'scroll-schedule-0', now, 'scroll-run');
  data.timer = startTimer(initialTimer(1000), now, 'independent-timer');
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  const run = (await stored(page)).planning.run;
  await page.getByRole('button', { name: m.resetSchedule, exact: true }).click();
  const confirm = page.getByRole('dialog', { name: m.resetScheduleTitle, exact: true });
  await expect(confirm).toBeVisible(); await page.clock.runFor(1000);
  await expect.poll(async () => (await stored(page)).timer.status).toBe('completed');
  await expect(confirm).toBeVisible();
  expect((await stored(page)).planning.run).toEqual(run);
  expect(await playCount(page)).toBe(1);
  await confirm.getByRole('button', { name: m.cancel, exact: true }).click(); await page.clock.runFor(300);
  await expect(confirm).not.toBeVisible(); expect((await stored(page)).planning.run).toEqual(run);
});

test('editing the final scrolled schedule preserves the duration panel, saved name and discarded draft', async ({ page }) => {
  await seed(page, scheduleData(6)); await page.goto('/planning');
  await wheelPage(page, 9000);
  await scheduleOptions(page, 'Orar 06');
  const edit = page.getByRole('button', { name: m.editSchedule('Orar 06'), exact: true });
  await edit.scrollIntoViewIfNeeded(); await expect(edit).toBeInViewport(); const before = await stored(page); await edit.click();
  const editor = page.getByRole('dialog', { name: m.editScheduleTitle, exact: true });
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Orar revizuit');
  await stepDuration(page, 1, [0, 1, 30]);
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue('Orar revizuit');
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click(); await expect(editor).not.toBeVisible();
  const saved = await stored(page);
  expect(saved.planning.schedules[5]).toMatchObject({ name: 'Orar revizuit', steps: [{ durationMs: 90000 }] });
  expect(saved.timer).toEqual(before.timer); expect(saved.stopwatch).toEqual(before.stopwatch);
  await scheduleOptions(page, 'Orar revizuit');
  const updated = page.getByRole('button', { name: m.editSchedule('Orar revizuit'), exact: true });
  await updated.scrollIntoViewIfNeeded(); await expect(updated).toBeInViewport(); await updated.click();
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Nume abandonat');
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  await page.getByRole('dialog', { name: m.discardTitle, exact: true }).getByRole('button', { name: m.discardChanges, exact: true }).click();
  await expect(editor).not.toBeVisible(); expect((await stored(page)).planning.schedules[5]).toEqual(saved.planning.schedules[5]);
});
