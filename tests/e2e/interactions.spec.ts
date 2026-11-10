import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { getMessages } from '../../src/i18n';
import { expectNoPageErrors, observePageErrors, seed, settings, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

async function hold(page: Page, button: Locator) {
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
}

async function scale(button: Locator) {
  return button.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
}

async function neutral(button: Locator, opacity = '1') {
  await expect(button).toHaveCSS('opacity', opacity);
  await expect.poll(() => scale(button)).toBeCloseTo(1, 5);
}

test('shared Close animates a hold, cancels without acting and keeps its layout and focus host', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seed(page); await page.goto('/'); const sheet = await settings(page);
  const close = sheet.getByRole('button', { name: 'Închide', exact: true });
  const layout = () => close.evaluate((node) => {
    const el = node as HTMLElement; return [el.offsetWidth, el.offsetHeight, el.offsetLeft, el.offsetTop];
  });
  const before = await layout(); await hold(page, close);
  await expect(close).toHaveCSS('opacity', '0.72'); await expect.poll(() => scale(close)).toBeCloseTo(0.98, 5);
  expect(await layout()).toEqual(before); await expect(sheet).toBeVisible();
  await page.mouse.move(0, 0); await page.mouse.up(); await neutral(close);
  await expect(sheet).toBeVisible(); await close.focus(); await expect(close).toBeFocused();
  await close.press('Enter'); await expect(sheet).not.toBeVisible();
});

test('live reduced motion during a held press removes scale, retains feedback and keeps cancellation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seed(page); await page.goto('/'); const sheet = await settings(page);
  const close = sheet.getByRole('button', { name: 'Închide', exact: true });
  await hold(page, close); await expect.poll(() => scale(close)).toBeCloseTo(0.98, 5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => scale(close)).toBeCloseTo(1, 5); await expect(close).toHaveCSS('opacity', '0.72');
  await page.mouse.move(0, 0); await page.mouse.up(); await neutral(close); await expect(sheet).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await hold(page, close); await expect.poll(() => scale(close)).toBeCloseTo(0.98, 5);
  await page.mouse.up(); await expect(sheet).not.toBeVisible();
});

test('reduced motion starts with immediate non-scaling feedback and preserves the legacy fixture', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await page.goto('/'); const sheet = await settings(page);
  const close = sheet.getByRole('button', { name: 'Închide', exact: true });
  const before = await stored(page); await hold(page, close);
  await expect(close).toHaveCSS('opacity', '0.72'); expect(await scale(close)).toBe(1);
  expect(await stored(page)).toEqual(before); await page.mouse.move(0, 0); await page.mouse.up();
  await neutral(close); await close.press('Space'); await expect(sheet).not.toBeVisible();
  expect((await stored(page)).sessions).toEqual(legacy.sessions);
});

test('History Link keeps its real href and keyboard navigation; Space starts and pauses exactly once', async ({ page }) => {
  const m = getMessages('ro'); await seed(page); await page.goto('/history');
  const link = page.getByRole('link', { name: m.toStopwatch, exact: true });
  await expect(link).toHaveAttribute('href', '/'); await link.focus(); await expect(link).toBeFocused();
  await link.press('Enter'); await expect(page).toHaveURL(/\/$/);
  const start = page.getByRole('button', { name: m.start, exact: true });
  await start.focus(); await page.keyboard.down('Space');
  expect((await stored(page)).stopwatch.startedAt).toBeNull(); await page.keyboard.up('Space');
  await expect.poll(async () => (await stored(page)).stopwatch.startedAt).not.toBeNull();
  const pause = page.getByRole('button', { name: m.pause, exact: true }); await pause.press('Space');
  await expect.poll(async () => (await stored(page)).stopwatch.startedAt).toBeNull();
  expect((await stored(page)).stopwatch.accumulatedMs).toBeGreaterThan(0);
});

test('web switch changes immediately with keyboard and disables transitions for live reduced motion', async ({ page }) => {
  const m = getMessages('ro'); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seed(page); await page.goto('/'); const sheet = await settings(page, 'device');
  const toggle = sheet.getByRole('switch', { name: m.haptics, exact: true });
  const thumb = toggle.locator('span span'); await expect(toggle).toBeChecked();
  await expect(thumb).toHaveCSS('transition-duration', '0.14s');
  await toggle.press('Space'); await expect(toggle).not.toBeChecked();
  await expect.poll(async () => (await stored(page)).preferences.haptics).toBe(false);
  await expect(thumb).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(thumb).toHaveCSS('transition-duration', '0s');
  await toggle.press('Enter'); await expect(toggle).toBeChecked();
  await expect(thumb).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 18, 0)');
  await sheet.getByRole('button', { name: m.back, exact: true }).click();
  await expect(page.getByRole('button', { name: m.settingsGroups.device, exact: true })).toBeFocused();
});

test('rapid re-presses and window blur cancel safely and leave no recurring animation frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const pending = new Set<number>(), request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => { pending.delete(id); callback(time); }); pending.add(id); return id;
    };
    window.cancelAnimationFrame = (id) => { if (id != null) pending.delete(id); cancel(id); };
    Object.assign(window, { cronoPendingFrames: () => pending.size });
  });
  await seed(page); await page.goto('/history'); const sheet = await settings(page);
  const close = sheet.getByRole('button', { name: 'Închide', exact: true }), before = await stored(page);
  const box = (await close.boundingBox())!;
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(0, 0); await page.mouse.up();
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await expect(close).toHaveCSS('opacity', '0.72');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.move(0, 0); await page.mouse.up(); await neutral(close);
  await expect(sheet).toBeVisible(); expect(await stored(page)).toEqual(before);
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve((window as unknown as { cronoPendingFrames: () => number }).cronoPendingFrames())));
  }))).toBe(0);
});

test('background suspension clears a held visual and foreground return permits a fresh press', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seed(page); await page.goto('/'); const sheet = await settings(page), before = await stored(page);
  // Background controls are intentionally excluded from the accessibility tree.
  const close = sheet.getByRole('button', { name: 'Închide', exact: true, includeHidden: true });
  const visibility = (state: 'visible' | 'hidden') => page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
  await hold(page, close); await expect(close).toHaveCSS('opacity', '0.72');
  await visibility('hidden'); await neutral(close); await page.mouse.move(0, 0); await page.mouse.up();
  await visibility('visible'); await hold(page, close); await expect(close).toHaveCSS('opacity', '0.72');
  await page.mouse.move(0, 0); await page.mouse.up(); await neutral(close);
  await expect(sheet).toBeVisible(); expect(await stored(page)).toEqual(before);
});

test('a Save disabled during a hold stays inert and recovers after valid input', async ({ page }) => {
  const m = getMessages('ro'); await seed(page); await page.goto('/planning');
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true }).click();
  const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
  const save = editor.getByRole('button', { name: m.saveSchedule, exact: true });
  const before = await stored(page); await hold(page, save); await expect(save).toHaveCSS('opacity', '0.72');
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('');
  await expect(save).toBeDisabled(); await neutral(save, '0.4');
  await page.mouse.move(0, 0); await page.mouse.up(); expect(await stored(page)).toEqual(before);
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Draft valid');
  await expect(save).toBeEnabled(); await neutral(save); await save.press('Enter');
  await expect(editor).not.toBeVisible();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  expect((await stored(page)).planning.schedules[0].name).toBe('Draft valid');
});

test('closing a sheet during a hold fences its transition and reopening restores a neutral host', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seed(page); await page.goto('/'); let sheet = await settings(page);
  const before = await stored(page); let close = sheet.getByRole('button', { name: 'Închide', exact: true });
  await hold(page, close); await expect(close).toHaveCSS('opacity', '0.72');
  await page.keyboard.press('Escape'); await expect(sheet).not.toBeVisible();
  await page.mouse.move(0, 0); await page.mouse.up();
  sheet = await settings(page); close = sheet.getByRole('button', { name: 'Închide', exact: true });
  await neutral(close); await close.focus(); await expect(close).toBeFocused(); expect(await stored(page)).toEqual(before);
});
