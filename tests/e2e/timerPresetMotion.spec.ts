import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer } from '../../src/core/timer';
import { startSchedule } from '../../src/core/planning';
import { LANGUAGES } from '../../src/core/language';
import { parseBackup } from '../../src/core/backup';
import { getMessages } from '../../src/i18n';
import { audioSpy, expectNoPageErrors, observePageErrors, playCount, seed, settings, stored } from './helpers';

const m = getMessages('ro');
test.beforeEach(async ({ page }) => {
  observePageErrors(page); await page.emulateMedia({ reducedMotion: 'no-preference' }); await audioSpy(page);
});
test.afterEach(({ page }) => expectNoPageErrors(page));

async function centered(wheel: Locator) {
  await expect.poll(() => wheel.evaluate((node) => {
    const row = node.querySelectorAll('button')[Number(node.getAttribute('aria-valuenow'))];
    const box = node.getBoundingClientRect(), selected = row.getBoundingClientRect();
    return Math.abs(selected.y + selected.height / 2 - box.y - box.height / 2);
  })).toBeLessThan(1);
}
async function ready(page: Page) {
  await expect(page.getByRole('spinbutton')).toHaveCount(3);
  for (const wheel of await page.getByRole('spinbutton').all()) await centered(wheel);
}
// Observe real frames and real storage writes; never drive scrolling or selection.
async function record(page: Page) {
  return page.evaluateHandle((startLabel) => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="spinbutton"]'));
    // The existing fling-cancellation frame can use a translated row container.
    // Measure the displayed offset so that frame must stay centered too.
    const offset = (node: HTMLElement) => {
      const box = node.getBoundingClientRect(), first = node.querySelector('button')!.getBoundingClientRect();
      return box.y + box.height / 2 - first.y - first.height / 2;
    };
    const start = nodes.map(offset);
    const heights = nodes.map((node) => node.querySelector('button')!.getBoundingClientRect().height);
    const ancestors: HTMLElement[] = [];
    for (let parent = nodes[0].parentElement; parent; parent = parent.parentElement) ancestors.push(parent);
    const outer = ancestors.map((node) => node.scrollTop);
    const frames: { offsets: number[]; values: number[]; duration: number; enabled: boolean }[] = [];
    const writes: number[] = []; const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') writes.push(JSON.parse(value).timer.durationMs);
      return original.call(this, key, value);
    };
    let handle = 0;
    function frame() {
      const button = Array.from(document.querySelectorAll('[role="button"]')).find((node) => node.getAttribute('aria-label') === startLabel);
      frames.push({ offsets: nodes.map(offset), values: nodes.map((node) => Number(node.getAttribute('aria-valuenow'))),
        duration: JSON.parse(localStorage.getItem('@crono/app-v1')!).timer.durationMs, enabled: !!button && button.getAttribute('aria-disabled') !== 'true' });
      handle = requestAnimationFrame(frame);
    }
    handle = requestAnimationFrame(frame);
    return { stop: () => {
      cancelAnimationFrame(handle); Storage.prototype.setItem = original;
      return { start, heights, frames, writes, outer, afterOuter: ancestors.map((node) => node.scrollTop) };
    } };
  }, m.startTimer);
}
async function stop(recording: Awaited<ReturnType<typeof record>>) {
  const result = await recording.evaluate((value) => value.stop()); await recording.dispose(); return result;
}
async function press(page: Page, minutes: number) {
  await page.getByRole('button', { name: m.presetMinutes(minutes), exact: true }).click();
}

for (const status of ['idle', 'completed'] as const) for (const reduced of [false, true]) for (const minutes of [1, 5, 10, 25]) {
  test(`${status} ${minutes}-minute preset accepts immediately with ${reduced ? 'reduced' : 'normal'} motion`, async ({ page }) => {
    const data = initialData(); data.timer = initialTimer(4117000);
    if (status === 'completed') data.timer = { ...data.timer, status, remainingMs: 0, runId: 'old-run' };
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await seed(page, data); await page.goto('/timer'); await ready(page);
    const recording = await record(page); await press(page, minutes);
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
    await expect.poll(async () => (await stored(page)).timer.durationMs).toBe(minutes * 60000);
    await ready(page); const motion = await stop(recording), target = [0, minutes, 0];
    expect(motion.writes).toEqual([minutes * 60000]); expect(motion.afterOuter).toEqual(motion.outer);
    if (!reduced) {
      for (const [index, value] of target.entries()) {
        const end = value * motion.heights[index], from = motion.start[index];
        expect(motion.frames.some((frame) => frame.offsets[index] > Math.min(from, end) + 1 && frame.offsets[index] < Math.max(from, end) - 1)).toBe(true);
        expect(motion.frames.every((frame) => frame.offsets[index] >= Math.min(from, end) - 1 && frame.offsets[index] <= Math.max(from, end) + 1)).toBe(true);
      }
      expect(motion.frames.some((frame) => frame.enabled && frame.duration === minutes * 60000 && frame.values.every((value, i) => value === target[i])
        && frame.offsets.some((offset, i) => Math.abs(offset - target[i] * motion.heights[i]) > 1))).toBe(true);
    } else {
      expect(motion.frames.every((frame) => frame.offsets.every((offset, i) =>
        Math.abs(offset - motion.start[i]) < 1 || Math.abs(offset - target[i] * motion.heights[i]) < 1))).toBe(true);
    }
    const after = await stored(page);
    expect(after.timer).toEqual(initialTimer(minutes * 60000)); expect(after.stopwatch).toEqual(data.stopwatch);
    expect(after.planning).toEqual(data.planning); expect(after.sessions).toEqual(data.sessions); expect(await playCount(page)).toBe(0);
  });
}

test('rapid presets replace the current glide, repeated targets do not write, and unchanged columns stay still', async ({ page }) => {
  const data = initialData(); data.timer = initialTimer(1800000); await seed(page, data); await page.goto('/timer'); await ready(page);
  const recording = await record(page);
  for (const minutes of [1, 25, 5, 5]) { await press(page, minutes); await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled(); }
  await ready(page); const motion = await stop(recording);
  expect(motion.writes).toEqual([60000, 1500000, 300000]);
  expect(motion.frames.every((frame) => frame.offsets[0] === 0 && frame.offsets[2] === 0)).toBe(true);
  const settled = await record(page); await press(page, 5); await page.waitForTimeout(1100);
  const unchanged = await stop(settled); expect(unchanged.writes).toEqual([]);
  expect(unchanged.frames.every((frame) => frame.offsets.every((offset, i) => Math.abs(offset - unchanged.start[i]) < 1))).toBe(true);
  expect((await stored(page)).timer).toEqual(initialTimer(300000));
});

test('Start during long-distance motion uses the accepted preset and preserves independent clocks through pause, resume and reload', async ({ page }) => {
  const data = initialData(), now = Date.now(); data.timer = initialTimer(86399000); data.preferences.timerSound = false;
  data.stopwatch.startedAt = now;
  data.planning.schedules = [{ id: 'independent', name: 'Independent', steps: [{ id: 'long', name: 'Work', durationMs: 3600000 }] }];
  data.planning = startSchedule(data.planning, 'independent', now, 'independent-run');
  await seed(page, data); await page.goto('/timer'); await ready(page);
  const recording = await record(page); await press(page, 1);
  const stillMoving = await page.getByRole('spinbutton').evaluateAll((nodes) => nodes.some((node) => {
    const row = node.querySelectorAll('button')[Number(node.getAttribute('aria-valuenow'))];
    return Math.abs((node as HTMLElement).scrollTop - Number(node.getAttribute('aria-valuenow')) * row.getBoundingClientRect().height) > 1;
  })); expect(stillMoving).toBe(true);
  await page.getByRole('button', { name: m.startTimer, exact: true }).click(); await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await stop(recording); const started = (await stored(page)).timer;
  expect(started.durationMs).toBe(60000); expect(started.status).toBe('running'); expect(started.deadlineAt).toBeGreaterThan(now + 60000);
  await page.getByRole('button', { name: m.pauseTimer, exact: true }).click();
  await page.getByRole('button', { name: m.resumeTimer, exact: true }).click(); await page.reload();
  await expect(page.getByRole('button', { name: m.pauseTimer, exact: true })).toBeVisible();
  const after = await stored(page); expect(after.timer.runId).toBe(started.runId); expect(after.timer.durationMs).toBe(60000);
  expect(after.stopwatch).toEqual(data.stopwatch); expect(after.planning).toEqual(data.planning); expect(await playCount(page)).toBe(0);
});

for (const fallback of [false, true]) test(`manual held touch takes over preset motion ${fallback ? 'without scrollend' : 'with scrollend'}`, async ({ page }) => {
  if (fallback) await page.addInitScript(() => { for (const prototype of [HTMLElement.prototype, Element.prototype]) Reflect.deleteProperty(prototype, 'onscrollend'); });
  const data = initialData(); data.timer = initialTimer(3540000); await seed(page, data); await page.goto('/timer'); await ready(page);
  const wheel = page.getByRole('spinbutton', { name: m.timeUnits[1], exact: true });
  const box = (await wheel.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height * 0.85;
  const session = await page.context().newCDPSession(page); let held = false;
  try {
    await press(page, 1); await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); held = true;
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 40 }] });
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeDisabled();
    await page.waitForTimeout(1300);
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeDisabled();
    await expect(wheel).toHaveAttribute('aria-valuenow', '1'); expect((await stored(page)).timer.durationMs).toBe(60000);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 100 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); held = false;
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled(); await centered(wheel);
    const value = Number(await wheel.getAttribute('aria-valuenow')); expect(value).toBeGreaterThan(1);
    expect((await stored(page)).timer.durationMs).toBe(value * 60000);
    await wheel.press('ArrowUp'); await expect(wheel).toHaveAttribute('aria-valuenow', String(Math.min(59, value + 1))); await centered(wheel);
  } finally { if (held) await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await session.detach(); }
});

test('keyboard and wheel input supersede visual motion without late target writes', async ({ page }) => {
  const data = initialData(); data.timer = initialTimer(3540000); await seed(page, data); await page.goto('/timer'); await ready(page);
  const wheel = page.getByRole('spinbutton', { name: m.timeUnits[1], exact: true });
  await press(page, 1); await wheel.press('ArrowUp'); await expect(wheel).toHaveAttribute('aria-valuenow', '2'); await centered(wheel);
  await press(page, 25); await wheel.hover(); await page.mouse.wheel(0, 88);
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled(); await centered(wheel);
  const value = Number(await wheel.getAttribute('aria-valuenow')); expect(value).toBeGreaterThan(2); const accepted = (await stored(page)).timer;
  expect(accepted.durationMs).toBe(value * 60000); await page.waitForTimeout(1100);
  expect((await stored(page)).timer).toEqual(accepted); await centered(wheel);
});

for (const key of ['Home', 'End'] as const) test(`${key} interrupts a preset glide and retains its exact endpoint`, async ({ page }) => {
  const data = initialData(); data.timer = initialTimer(3540000); await seed(page, data); await page.goto('/timer'); await ready(page);
  const wheel = page.getByRole('spinbutton', { name: m.timeUnits[1], exact: true });
  await press(page, 1); await wheel.press(key);
  await expect(wheel).toHaveAttribute('aria-valuenow', key === 'Home' ? '0' : '59'); await centered(wheel);
  const accepted = await stored(page);
  expect(accepted.timer).toEqual(initialTimer(key === 'Home' ? 60000 : 3540000));
  const action = page.getByRole('button', { name: m.startTimer, exact: true });
  if (key === 'Home') await expect(action).toBeDisabled(); else await expect(action).toBeEnabled();
  await page.waitForTimeout(1100); await centered(wheel); expect(await stored(page)).toEqual(accepted);
});

for (const policy of ['reduce', 'background', 'route', 'resize'] as const) test(`${policy} settles current motion without replay`, async ({ page }) => {
  const data = initialData(); data.timer = initialTimer(86399000); await seed(page, data); await page.goto('/timer'); await ready(page);
  await press(page, 1);
  if (policy === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
  if (policy === 'background') await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange'));
  });
  if (policy === 'route') await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  if (policy === 'resize') await page.setViewportSize({ width: 320, height: 720 });
  if (policy === 'background') await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange'));
  });
  if (policy === 'route') await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
  await ready(page); if (policy === 'reduce') await page.emulateMedia({ reducedMotion: 'no-preference' });
  const recording = await record(page); await page.waitForTimeout(1100); const motion = await stop(recording);
  expect(motion.writes).toEqual([]); expect(motion.frames.every((frame) => frame.offsets.every((offset, i) => Math.abs(offset - motion.start[i]) < 1))).toBe(true);
  expect((await stored(page)).timer).toEqual(initialTimer(60000)); await page.getByRole('spinbutton', { name: m.timeUnits[2], exact: true }).press('ArrowUp');
  await expect.poll(async () => (await stored(page)).timer.durationMs).toBe(61000);
});

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) for (const { width, enlarged } of [{ width: 320, enlarged: false }, { width: 390, enlarged: true }, { width: 320, enlarged: true }]) {
  test(`${id} ${theme} preset remains centered and usable with ${enlarged ? 'enlarged' : 'compact'} labels at ${width}px`, async ({ page }) => {
    const messages = getMessages(id), data = initialData(); data.preferences.language = id; data.preferences.theme = theme; data.timer = initialTimer(4117000);
    await page.setViewportSize({ width, height: 844 }); await seed(page, data); await page.goto('/timer'); await ready(page);
    if (enlarged) await page.addStyleTag({ content: '[data-testid="duration-track"] > div:not([data-testid="duration-format"]) > :last-child { font-size:16px !important; }' });
    const captions = page.getByTestId('duration-picker').locator('[data-testid="duration-track"] > div:not([data-testid="duration-format"]) > :last-child');
    await expect(captions).toHaveCount(3);
    for (const caption of await captions.all()) await expect(caption).toHaveCSS('font-size', enlarged ? '16px' : '12px');
    await page.getByRole('button', { name: messages.presetMinutes(25), exact: true }).click(); await ready(page);
    await expect(page.getByRole('button', { name: messages.startTimer, exact: true })).toBeEnabled();
    expect((await stored(page)).timer.durationMs).toBe(1500000);
    for (const wheel of await page.getByRole('spinbutton').all()) {
      await expect(wheel.locator('button').first()).toHaveCSS('font-size', '40px');
      const box = (await wheel.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await wheel.evaluate((node) => {
        const row = node.querySelectorAll('button')[Number(node.getAttribute('aria-valuenow'))];
        const range = document.createRange(); range.selectNodeContents(row);
        return range.getBoundingClientRect().height <= row.getBoundingClientRect().height;
      })).toBe(true);
    }
    const layout = await page.getByTestId('duration-picker').evaluate(root => {
      const r = root.getBoundingClientRect(), parent = root.parentElement!, p = parent.getBoundingClientRect(), c = getComputedStyle(parent);
      return { gaps: [r.left - p.left - parseFloat(c.paddingLeft) - parseFloat(c.borderLeftWidth),
        p.right - r.right - parseFloat(c.paddingRight) - parseFloat(c.borderRightWidth)],
      captionsFit: Array.from(root.querySelectorAll('[data-testid="duration-track"] > div:not([data-testid="duration-format"]) > :last-child')).every(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const text = range.getBoundingClientRect(), label = node.getBoundingClientRect();
        return text.left >= label.left && text.right <= label.right && text.top >= label.top && text.bottom <= label.bottom;
      }) };
    });
    expect(layout.gaps.every(gap => Math.abs(gap) < 1)).toBe(true); expect(layout.captionsFit).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('literal legacy records survive a preset, navigation and actual reviewed backup transfer then reload', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await page.goto('/timer'); await ready(page); await press(page, 10); await ready(page);
  const selected = await stored(page); expect(selected.timer).toEqual(initialTimer(600000));
  expect(selected.sessions).toEqual(legacy.sessions); expect(selected.stopwatch).toEqual(legacy.stopwatch);
  expect(selected.preferences).toEqual({ ...initialData().preferences, ...legacy.preferences });
  await page.getByRole('tab', { name: m.planningTab, exact: true }).click(); await settings(page, 'data');
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: m.backup.export, exact: true }).click();
  const raw = readFileSync((await (await downloading).path())!, 'utf8'), backup = parseBackup(raw);
  expect(backup.sessions).toEqual(legacy.sessions); expect(backup.preferences).toEqual(selected.preferences);
  const choosing = page.waitForEvent('filechooser'); await page.getByRole('button', { name: m.backup.import, exact: true }).click();
  await (await choosing).setFiles({ name: 'preset-backup.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await expect(page.getByRole('switch', { name: m.backup.applyPreferences, exact: true })).not.toBeChecked();
  expect((await stored(page)).sessions).toEqual(legacy.sessions);
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click(); await expect.poll(async () => (await stored(page)).sessions.length).toBe(2);
  const imported = await stored(page); expect(imported.sessions[0]).toEqual(legacy.sessions[0]);
  expect(imported.sessions[1]).toEqual({ ...legacy.sessions[0], id: imported.sessions[1].id }); expect(imported.sessions[1].id).not.toBe(legacy.sessions[0].id);
  expect(imported.timer).toEqual(selected.timer); expect(imported.stopwatch).toEqual(legacy.stopwatch);
  expect(imported.preferences).toEqual(selected.preferences); expect(imported.planning).toEqual(selected.planning);
  await page.reload(); await expect(page.getByRole('tab', { name: m.planningTab, exact: true })).toBeVisible(); expect(await stored(page)).toEqual(imported);
});
