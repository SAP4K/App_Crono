import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer, startTimer } from '../../src/core/timer';
import { startSchedule } from '../../src/core/planning';
import { LANGUAGES } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { selectTheme, settingsGroup, scheduleOptions, audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, selectDuration, selectWheel, stored } from './helpers';

// Keep the actual browser clock: CSS snapping and native timer receivers are part of this adapter.
const warnings = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  observePageErrors(page); const messages: string[] = []; warnings.set(page, messages);
  page.on('console', (message) => { if (message.type() === 'warning' || message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(({ page }) => { expectNoPageErrors(page); expect(warnings.get(page)).toEqual([]); });

async function clockGeometry(scope: Page | Locator, fitted = false) {
  const picker = scope.getByTestId('duration-picker');
  await picker.scrollIntoViewIfNeeded();
  await expect(picker.getByRole('spinbutton')).toHaveCount(3);
  await expect(picker.getByTestId('duration-separator')).toHaveCount(2);
  await expect(picker.getByTestId('duration-selection')).toHaveAttribute('aria-hidden', 'true');
  await expect(picker.getByTestId('duration-selection')).toHaveCSS('pointer-events', 'none');
  await expect(picker.getByTestId('duration-format')).toHaveAttribute('aria-hidden', 'true');
  await expect(picker.getByTestId('duration-format')).toHaveCSS('pointer-events', 'none');
  const geometry = await picker.evaluate((root) => {
    const bounds = (node: Element) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const textBounds = (node: Element) => {
      const range = document.createRange(); range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const parent = root.parentElement!, parentBox = bounds(parent), parentStyle = getComputedStyle(parent), frameStyle = getComputedStyle(root);
    return {
      frame: bounds(root), band: bounds(root.querySelector('[data-testid="duration-selection"]')!),
      track: bounds(root.querySelector('[data-testid="duration-track"]')!),
      parent: { left: parentBox.left + parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.borderLeftWidth),
        right: parentBox.right - parseFloat(parentStyle.paddingRight) - parseFloat(parentStyle.borderRightWidth) },
      border: { left: parseFloat(frameStyle.borderLeftWidth), right: parseFloat(frameStyle.borderRightWidth) },
      wheels: Array.from(root.querySelectorAll('[role="spinbutton"]')).map((node) => {
        const row = node.querySelectorAll('button')[Number(node.getAttribute('aria-valuenow'))];
        const label = node.parentElement!.parentElement!.lastElementChild!;
        return { viewport: bounds(node), row: bounds(row), text: textBounds(row), font: getComputedStyle(row).fontSize,
          label: bounds(label), caption: textBounds(label) };
      }),
      separators: Array.from(root.querySelectorAll('[data-testid="duration-separator"]')).map((node) => ({
        box: bounds(node), text: textBounds(node), font: getComputedStyle(node).fontSize,
      })),
    };
  });
  expect(Math.abs(geometry.frame.left - geometry.parent.left)).toBeLessThan(1);
  expect(Math.abs(geometry.frame.right - geometry.parent.right)).toBeLessThan(1);
  expect(Math.abs(geometry.band.left - geometry.frame.left - geometry.border.left)).toBeLessThan(1);
  expect(Math.abs(geometry.frame.right - geometry.band.right - geometry.border.right)).toBeLessThan(1);
  expect(geometry.track.width).toBeCloseTo(Math.min(360, geometry.frame.width - geometry.border.left - geometry.border.right), 0);
  expect(Math.abs(geometry.track.left + geometry.track.width / 2 - geometry.frame.left - geometry.frame.width / 2)).toBeLessThan(1);
  if (geometry.frame.width > 362) expect(geometry.frame.width).toBeGreaterThan(geometry.track.width);
  expect(geometry.band.height).toBe(50);
  const center = geometry.band.top + geometry.band.height / 2;
  for (const wheel of geometry.wheels) {
    if (fitted) { expect(parseFloat(wheel.font)).toBeLessThan(40); expect(parseFloat(wheel.font)).toBeGreaterThan(0); }
    else expect(wheel.font).toBe('40px');
    expect(wheel.row.height).toBe(50); expect(wheel.viewport.height).toBe(150);
    expect(wheel.viewport.width).toBeGreaterThanOrEqual(44);
    expect(Math.abs(wheel.viewport.width - geometry.track.width / 3)).toBeLessThan(1);
    expect(wheel.text.width).toBeLessThanOrEqual(wheel.row.width);
    expect(wheel.text.height).toBeLessThanOrEqual(wheel.row.height);
    expect(wheel.text.left).toBeGreaterThanOrEqual(wheel.row.left); expect(wheel.text.right).toBeLessThanOrEqual(wheel.row.right);
    expect(wheel.caption.left).toBeGreaterThanOrEqual(wheel.label.left); expect(wheel.caption.right).toBeLessThanOrEqual(wheel.label.right);
    expect(wheel.caption.top).toBeGreaterThanOrEqual(wheel.label.top); expect(wheel.caption.bottom).toBeLessThanOrEqual(wheel.label.bottom);
    expect(Math.abs(wheel.row.top + wheel.row.height / 2 - center)).toBeLessThan(1);
  }
  for (const [index, separator] of geometry.separators.entries()) {
    if (fitted) { expect(parseFloat(separator.font)).toBeLessThan(32); expect(parseFloat(separator.font)).toBeGreaterThan(0); }
    else expect(separator.font).toBe('32px');
    expect(Math.abs(separator.box.top + separator.box.height / 2 - center)).toBeLessThan(1);
    expect(Math.abs(separator.box.left + separator.box.width / 2 - geometry.wheels[index].viewport.right)).toBeLessThan(1);
    expect(separator.text.left - geometry.wheels[index].text.right).toBeGreaterThanOrEqual(4);
    expect(geometry.wheels[index + 1].text.left - separator.text.right).toBeGreaterThanOrEqual(4);
  }
  return picker;
}

async function narrowParent(page: Page, scope: Page | Locator, action: Locator) {
  const picker = scope.getByTestId('duration-picker'), wheels = picker.getByRole('spinbutton'), hours = wheels.first();
  await hours.focus(); const host = await hours.elementHandle(), before = await stored(page);
  const values = await wheels.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-valuenow')));
  const original = await picker.evaluate(root => {
    const parent = root.parentElement!, style = parent.getAttribute('style'), c = getComputedStyle(parent);
    const inset = parseFloat(c.paddingLeft) + parseFloat(c.paddingRight) + parseFloat(c.borderLeftWidth) + parseFloat(c.borderRightWidth);
    const width = `${180 + (c.boxSizing === 'border-box' ? inset : 0)}px`;
    Object.assign(parent.style, { width, maxWidth: width, minWidth: '0', alignSelf: 'center' });
    return style;
  });
  try {
    await expect.poll(() => picker.evaluate(node => node.getBoundingClientRect().width)).toBe(180);
    await expect.poll(() => hours.locator('button').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeLessThan(40);
    await clockGeometry(scope, true); await expect(hours).toBeFocused();
    expect(await hours.evaluate((node, original) => node === original, host)).toBe(true);
    expect(await wheels.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-valuenow')))).toEqual(values);
    expect(await stored(page)).toEqual(before); await expect(action).toBeEnabled();
  } finally {
    await picker.evaluate((node, style) => style === null ? node.parentElement!.removeAttribute('style') : node.parentElement!.setAttribute('style', style), original);
  }
  await clockGeometry(scope); await expect(hours).toBeFocused();
  expect(await hours.evaluate((node, original) => node === original, host)).toBe(true);
  expect(await wheels.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-valuenow')))).toEqual(values);
  expect(await stored(page)).toEqual(before); await expect(action).toBeEnabled();
  await host?.dispose();
}

for (const theme of ['light', 'dark'] as const) for (const width of [320, 390, 1024]) {
  test(`full-width-clock ${theme} at ${width}px fits both callers and passes input through separators`, async ({ page }, info) => {
    const m = getMessages('ro'), data = initialData(), name = 'Școală · Учёба';
    data.preferences.theme = theme; data.timer = initialTimer(3425000);
    data.planning.schedules = [{ id: 'compact', name, steps: [{ id: 'step', name: 'Respiră · Отдых', durationMs: 3663000 }] }];
    await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page, data); await page.goto('/timer'); await page.evaluate(() => document.fonts.ready);
    const picker = await clockGeometry(page);
    await picker.screenshot({ path: info.outputPath('timer-clock.png'), animations: 'disabled' });
    await narrowParent(page, page, page.getByRole('button', { name: m.startTimer, exact: true }));
    const wheels = picker.getByRole('spinbutton');
    for (const index of [0, 1]) {
      const separator = (await picker.getByTestId('duration-separator').nth(index).boundingBox())!;
      const before = await stored(page);
      await page.mouse.click(separator.x + separator.width / 2 + 2, separator.y + separator.height / 2);
      await expect(wheels.nth(index + 1)).toBeFocused(); expect(await stored(page)).toEqual(before);
      await wheels.nth(index + 1).press('ArrowUp'); await centered(wheels.nth(index + 1));
    }
    expect((await stored(page)).timer).toEqual(initialTimer(3486000));
    const beforePlanning = await stored(page);
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click(); await scheduleOptions(page, name, m);
    await page.getByRole('button', { name: m.editSchedule(name), exact: true }).click();
    const edit = page.getByRole('button', { name: m.editStepDuration(1), exact: true }); await edit.click();
    const panel = page.getByRole('dialog', { name: m.durationPickerTitle(1), exact: true });
    await page.evaluate(() => document.fonts.ready); const planningPicker = await clockGeometry(panel);
    await planningPicker.screenshot({ path: info.outputPath('planning-clock.png'), animations: 'disabled' });
    await narrowParent(page, panel, panel.getByRole('button', { name: m.applyDuration, exact: true }));
    const seconds = panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[2], 1), exact: true });
    await seconds.press('ArrowUp'); await centered(seconds);
    await panel.getByRole('button', { name: m.cancel, exact: true }).click();
    await expect(edit).toBeFocused(); await expect(edit).toContainText('01:01:03');
    expect(await stored(page)).toEqual(beforePlanning);
    await edit.click(); await seconds.press('ArrowUp');
    await panel.getByRole('button', { name: m.applyDuration, exact: true }).click();
    await expect(edit).toContainText('01:01:04'); expect(await stored(page)).toEqual(beforePlanning);
    await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
    const expected = structuredClone(beforePlanning); expected.planning.schedules[0].steps[0].durationMs = 3664000;
    await expect.poll(() => stored(page)).toEqual(expected);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const theme of ['light', 'dark'] as const) test(`full-width-clock ${theme} browser zoom enlarges rows and glyphs together without replacing focus`, async ({ page }) => {
  const m = getMessages('ro'), data = initialData(); data.preferences.theme = theme; data.timer = initialTimer(3663000);
  await page.setViewportSize({ width: 1024, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page, data); await page.goto('/timer'); await page.evaluate(() => document.fonts.ready);
  await clockGeometry(page);
  const hours = page.getByRole('spinbutton', { name: m.timeUnits[0], exact: true });
  await hours.focus(); const host = await hours.elementHandle();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.25 });
    await expect.poll(() => page.evaluate(() => visualViewport?.scale)).toBe(1.25);
    await clockGeometry(page); await expect(hours).toBeFocused();
    expect(await hours.evaluate((node, original) => node === original, host)).toBe(true);
    // This is browser magnification, not native OS text-scale emulation.
    const physical = await hours.evaluate((node) => {
      const row = node.querySelector('button')!, scale = visualViewport!.scale;
      return { font: Number.parseFloat(getComputedStyle(row).fontSize) * scale, row: row.getBoundingClientRect().height * scale };
    });
    expect(physical).toEqual({ font: 50, row: 62.5 });
    await hours.press('ArrowUp'); await centered(hours);
    expect(await stored(page)).toEqual({ ...data, timer: initialTimer(7263000) });
  } finally { try { await session.send('Emulation.resetPageScaleFactor'); } finally { await session.detach(); } }
});

async function openTimer(page: Page) {
  const data = initialData(); data.timer = initialTimer(1000); data.preferences.timerSound = false;
  await seed(page, data); await page.goto('/timer');
  await expect(page.getByRole('spinbutton')).toHaveCount(3);
  return page.getByRole('button', { name: 'Pornește temporizatorul', exact: true });
}
async function wheelBy(page: Page, wheel: Locator, rows: number) {
  const height = await wheel.locator('button').first().evaluate((row) => row.getBoundingClientRect().height);
  await wheel.hover(); await page.mouse.wheel(0, rows * height * await page.evaluate(() => devicePixelRatio));
}
async function observeBusy(action: Locator) {
  const record = await action.evaluateHandle((node) => {
    const result = { seen: false, observer: new MutationObserver((changes) => {
      if (node.getAttribute('aria-disabled') === 'true' || changes.some((change) => change.oldValue === 'true')) result.seen = true;
    }) };
    result.observer.observe(node, { attributes: true, attributeFilter: ['aria-disabled'], attributeOldValue: true });
    return result;
  });
  return async () => {
    expect(await record.evaluate((result) => { result.observer.disconnect(); return result.seen; })).toBe(true);
    await record.dispose();
  };
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
async function parentOffsets(wheel: Locator) {
  return wheel.evaluate((node) => {
    const offsets = [window.scrollY];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) offsets.push(parent.scrollTop);
    return offsets;
  });
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
  const wasBusy = await observeBusy(start);
  await wheelBy(page, minutes, 1);
  await wheelBy(page, seconds, 2);
  await expect(minutes).toHaveAttribute('aria-valuenow', '1');
  await expect(seconds).toHaveAttribute('aria-valuenow', '3');
  await expect(start).toBeEnabled(); await wasBusy(); await centered(minutes); await centered(seconds);
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
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  expect((await stored(page)).timer).toEqual(running);
  await page.getByRole('button', { name: 'Pauză temporizator', exact: true }).click();
  const paused = (await stored(page)).timer;
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
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
  const outer = await parentOffsets(seconds);
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
    expect(await parentOffsets(seconds)).toEqual(outer);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 70 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(start).toBeEnabled(); await centered(seconds);
    expect(Number(await seconds.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(59);
  } finally { await session.detach(); }
});

test('Planning discards temporary selection and applies only settled values to its local action draft', async ({ page }) => {
  const data = initialData(); data.planning.schedules = [{ id: 'plan', name: 'Secvență', steps: [
    { id: 'a', name: 'Prima', durationMs: 1000 }, { id: 'b', name: 'A doua', durationMs: 2000 },
  ] }];
  await seed(page, data); await page.goto('/planning');
  await scheduleOptions(page, 'Secvență');
  await page.getByRole('button', { name: 'Editează orarul Secvență', exact: true }).click();
  const edit = page.getByRole('button', { name: 'Modifică durata etapei 2', exact: true });
  await edit.click();
  const seconds = page.getByRole('spinbutton', { name: 'Secunde etapa 2', exact: true });
  const apply = page.getByRole('button', { name: 'Aplică durata', exact: true });
  const cancelledBusy = await observeBusy(apply);
  await wheelBy(page, seconds, 10);
  await expect(apply).toBeEnabled(); await cancelledBusy();
  await page.getByRole('button', { name: 'Renunță', exact: true }).click();
  await expect(edit).toContainText('00:00:02'); await edit.click();
  await expect(seconds).toHaveAttribute('aria-valuenow', '2');
  const appliedBusy = await observeBusy(apply);
  await wheelBy(page, seconds, 1);
  await expect(seconds).toHaveAttribute('aria-valuenow', '3');
  await expect(apply).toBeEnabled(); await appliedBusy(); await apply.click();
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
  // A small fraction of one row exercises a real scroll without selecting another value.
  await wheelBy(page, seconds, 0.02);
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
  await wheelBy(page, page.getByRole('spinbutton', { name: 'Secunde', exact: true }), 0.02);
  await expect(restart).toBeDisabled(); await expect(restart).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { durationWrites: number }).durationWrites)).toBe(count);
  expect((await stored(page)).timer).toEqual(legacy.timer); expect(await playCount(page)).toBe(0);
  await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
  await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nume orar', exact: true }).fill('Учёба · Școală');
  await page.getByRole('textbox', { name: 'Nume etapa 1', exact: true }).fill('Respiră · Отдых');
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
  await scheduleOptions(page, 'Cincizeci');
  await page.getByRole('button', { name: 'Editează orarul Cincizeci', exact: true }).click();
  const first = page.getByRole('button', { name: 'Modifică durata etapei 1', exact: true });
  const list = await first.evaluateHandle((node) => {
    let parent = node.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY === 'auto')) parent = parent.parentElement;
    return parent;
  });
  const calendar = page.getByRole('button', { name: 'Programare · Manual', exact: true });
  await calendar.click();
  const headerOffset = await list.evaluate((node) => node!.scrollTop);
  await page.getByRole('dialog', { name: 'Programare', exact: true }).getByRole('button', { name: 'Renunță', exact: true }).click();
  await expect(calendar).toBeFocused();
  expect(Math.abs(await list.evaluate((node) => node!.scrollTop) - headerOffset)).toBeLessThanOrEqual(1);
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
  await expect(page.getByRole('textbox', { name: 'Nume etapa 49', exact: true })).toHaveValue('Acțiune 50');
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
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install({ time: now - 1000 }); await page.clock.pauseAt(now);
  const data = initialData(); data.timer = startTimer(initialTimer(2000), now, 'parallel-timer');
  data.planning.schedules = [
    { id: 'run', name: 'Activ', steps: [{ id: 'a', name: 'Lucru', durationMs: 2000 }, { id: 'b', name: 'Pauză', durationMs: 1000 }] },
    { id: 'edit', name: 'Schiță', steps: [{ id: 'c', name: 'Respiră · Отдых', durationMs: 1000 }] },
  ];
  data.planning = startSchedule(data.planning, 'run', now, 'parallel-schedule');
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  await scheduleOptions(page, 'Schiță');
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
  await expect(page.getByRole('textbox', { name: 'Nume etapa 1', exact: true })).toHaveValue('Respiră · Отдых');
  await page.getByRole('button', { name: 'Salvează orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules[1].steps[0].durationMs).toBe(4000);
  const saved = await stored(page);
  expect(saved.timer).toMatchObject({ status: 'completed', runId: 'parallel-timer' });
  expect(saved.planning.run).toMatchObject({ status: 'completed', runId: 'parallel-schedule' });
  expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.sessions).toEqual(data.sessions);
  expect(await playCount(page)).toBe(2);
});

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) for (const width of new Set([320, { ro: 390, en: 430, ru: 320, es: 320, fr: 320, de: 320 }[id]])) {
  test(`${id} ${theme} ${width}px wheel labels, resizing and enlarged web text preserve selection and fit mobile layouts`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const data = initialData(); data.preferences.language = id; data.preferences.theme = theme; data.timer = initialTimer(3663000);
    const name = 'Учёба · Școală'; data.planning.schedules = [{ id: 'layout', name, steps: [{ id: 'step', name: 'Respiră · Отдых', durationMs: 3663000 }] }];
    await seed(page, data); await page.goto('/timer'); const m = getMessages(id);
    for (const [index, value] of [1, 1, 3].entries()) {
      const wheel = page.getByRole('spinbutton', { name: m.timeUnits[index], exact: true });
      await expect(wheel).toHaveAttribute('aria-valuenow', String(value)); await centered(wheel);
    }
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    await page.getByRole('button', { name: m.settingsGroups.language, exact: true }).click();
    const next = LANGUAGES.find((language) => language.id !== id)!;
    await page.getByRole('radio', { name: next.label, exact: true }).click();
    await page.getByRole('radio', { name: LANGUAGES.find((language) => language.id === id)!.label, exact: true }).click();
    await settingsGroup(page, 'appearance', m);
    const settings = page.getByRole('dialog', { name: m.settingsGroups.appearance, exact: true });
    await selectTheme(settings, theme === 'dark' ? 'light' : 'dark', m);
    await expectTheme(page, theme !== 'dark');
    await selectTheme(settings, theme, m);
    await settings.getByRole('button', { name: m.close, exact: true }).click(); await expect(settings).not.toBeVisible();
    expect((await stored(page)).timer).toEqual(data.timer);
    await clockGeometry(page);
    await page.screenshot({ path: `previews/wheels-${id}-${theme}-${width}-timer.png`, animations: 'disabled' });
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
    await scheduleOptions(page, name, m);
    await page.getByRole('button', { name: m.editSchedule(name), exact: true }).click();
    await page.getByRole('button', { name: m.editStepDuration(1), exact: true }).click();
    const panel = page.getByRole('dialog', { name: m.durationPickerTitle(1), exact: true });
    await panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[0], 1), exact: true }).press('Shift+Tab');
    await expect(panel.getByRole('button', { name: m.close, exact: true })).toBeFocused();
    // Enlarge captions without shrinking the new 40px numeric default. Native OS
    // font scaling is separate; coherent browser zoom has its own case below.
    await page.addStyleTag({ content: '[data-testid="duration-track"] > div:not([data-testid="duration-format"]) > :last-child { font-size: 16px !important; }' });
    const captions = panel.getByTestId('duration-picker').locator('[data-testid="duration-track"] > div:not([data-testid="duration-format"]) > :last-child');
    await expect(captions).toHaveCount(3);
    for (const caption of await captions.all()) await expect(caption).toHaveCSS('font-size', '16px');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: width + 40, height: 844 }); await page.setViewportSize({ width, height: 844 });
    for (const [index, value] of [1, 1, 3].entries()) {
      const wheel = panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[index], 1), exact: true });
      await expect(wheel).toHaveAttribute('aria-valuenow', String(value)); await centered(wheel);
      await expect(wheel.locator('button').first()).toHaveCSS('font-size', '40px');
      const box = (await wheel.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await wheel.evaluate((element) => {
        const selected = element.querySelectorAll('button')[Number(element.getAttribute('aria-valuenow'))];
        const text = document.createRange(); text.selectNodeContents(selected);
        return text.getBoundingClientRect().height <= selected.getBoundingClientRect().height;
      })).toBe(true);
    }
    await expect(panel.getByRole('button', { name: m.applyDuration, exact: true })).toBeEnabled();
    await clockGeometry(panel);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `previews/wheels-${id}-${theme}-${width}-panel-large-text.png`, animations: 'disabled' });
    await panel.getByRole('button', { name: m.cancel, exact: true }).click();
    expect((await stored(page)).planning).toEqual(data.planning); expect((await stored(page)).timer).toEqual(data.timer);
  });
}
