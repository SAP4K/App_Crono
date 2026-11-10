import { expect, test, type Page } from '@playwright/test';
import { getMessages } from '../../src/i18n';
import { initialData } from '../../src/core/stopwatch';
import { serializeBackup } from '../../src/core/backup';
import { LANGUAGES } from '../../src/core/language';
import { readFileSync } from 'node:fs';
import { expectNoPageErrors, observePageErrors, seed, settings, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));
const m = getMessages('ro');
type Frame = { y: number; backdrop: number; isolated: boolean };

async function observeSheet(page: Page) {
  await page.evaluate(() => {
    const frames: { y: number; backdrop: number; isolated: boolean }[] = []; let frame = 0;
    const record = () => {
      const node = document.querySelector<HTMLElement>('[data-testid="sheet-surface"]');
      const backdrop = document.querySelector<HTMLElement>('[data-testid="sheet-backdrop"]');
      if (node && backdrop) frames.push({ y: new DOMMatrixReadOnly(getComputedStyle(node).transform).m42,
        backdrop: Number(getComputedStyle(backdrop).opacity), isolated: document.getElementById('crono-app')!.inert });
      frame = requestAnimationFrame(record);
    };
    frame = requestAnimationFrame(record);
    Object.assign(window, { sheetFrames: frames, stopSheetFrames: () => cancelAnimationFrame(frame) });
  });
}
async function frames(page: Page): Promise<Frame[]> {
  return page.evaluate(() => (window as unknown as { sheetFrames: Frame[] }).sheetFrames);
}
async function stopFrames(page: Page) {
  await page.evaluate(() => (window as unknown as { stopSheetFrames: () => void }).stopSheetFrames());
}
async function observePanel(page: Page, innermost = false) {
  await page.evaluate((inner) => {
    const samples: number[] = []; let frame = 0;
    const record = () => {
      // The covered editor remains mounted, with its geometry intact but hidden.
      const panels = [...document.querySelectorAll('[data-testid="panel-transition"]')]
        .filter((node) => getComputedStyle(node).visibility !== 'hidden');
      const node = panels[inner ? panels.length - 1 : 0];
      if (node) samples.push(Number(getComputedStyle(node).opacity));
      frame = requestAnimationFrame(record);
    };
    frame = requestAnimationFrame(record);
    Object.assign(window, { panelSamples: samples, stopPanelSamples: () => cancelAnimationFrame(frame) });
  }, innermost);
}
async function panelSamples(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as unknown as { panelSamples: number[] }).panelSamples);
}
async function resetPanelSamples(page: Page) {
  await page.evaluate(() => { (window as unknown as { panelSamples: number[] }).panelSamples.length = 0; });
}
async function stopPanelSamples(page: Page) {
  await page.evaluate(() => (window as unknown as { stopPanelSamples: () => void }).stopPanelSamples());
}
async function prepare(page: Page, reduced: boolean) {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await seed(page); await page.goto('/'); await expect(page.getByRole('button', { name: m.settings, exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('shared sheets really slide and fade the backdrop while retaining isolation through exit', async ({ page }) => {
  await prepare(page, false); const before = await stored(page); await observeSheet(page);
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  const close = page.getByRole('button', { name: m.close, exact: true }); await expect(close).toBeFocused();
  await expect.poll(async () => (await frames(page)).some((f) => f.y > 1 && f.backdrop > 0 && f.backdrop < 1)).toBe(true);
  await expect.poll(async () => (await frames(page)).at(-1)?.y).toBeCloseTo(0, 5);
  await page.evaluate(() => { (window as unknown as { sheetFrames: Frame[] }).sheetFrames.length = 0; });
  await close.click();
  await expect.poll(async () => (await frames(page)).some((f) => f.y > 1 && f.backdrop < 1 && f.isolated)).toBe(true);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect.poll(() => page.locator('#crono-app').evaluate((node) => (node as HTMLElement).inert)).toBe(false);
  await stopFrames(page); expect(await stored(page)).toEqual(before);
});

test('reduced motion uses immediate sheet endpoints and returns focus without a transition', async ({ page }) => {
  await prepare(page, true); await observeSheet(page);
  const opener = page.getByRole('button', { name: m.settings, exact: true }); await opener.click();
  await expect(page.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  expect((await frames(page)).every((frame) => frame.y === 0 && frame.backdrop === 1)).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(opener).toBeFocused();
  await stopFrames(page);
});

test('Escape during entry and a fresh opening leave no stale modal or isolated app', async ({ page }) => {
  await prepare(page, false); const opener = page.getByRole('button', { name: m.settings, exact: true });
  await opener.click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible(); await opener.click();
  await expect(page.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(opener).toBeFocused();
  await expect.poll(() => page.locator('#crono-app').evaluate((node) => (node as HTMLElement).inert)).toBe(false);
});

test('a retained editor keeps its outgoing draft after Save and a fresh opening initializes independently', async ({ page }) => {
  await prepare(page, false); await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
  const name = page.getByRole('textbox', { name: m.scheduleName, exact: true }); await name.fill('Retained draft');
  await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('[data-testid="sheet-surface"]')!;
    const samples: boolean[] = []; let frame = 0;
    const record = () => {
      if (node.isConnected) {
        if (new DOMMatrixReadOnly(getComputedStyle(node).transform).m42 > 1 && node.inert)
          samples.push(node.querySelector<HTMLInputElement>('input')?.value === 'Retained draft');
        frame = requestAnimationFrame(record);
      }
    };
    frame = requestAnimationFrame(record); Object.assign(window, { retainedSamples: samples, stopRetained: () => cancelAnimationFrame(frame) });
  });
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { retainedSamples: boolean[] }).retainedSamples)).toContain(true);
  await page.evaluate(() => (window as unknown as { stopRetained: () => void }).stopRetained());
  await expect.poll(async () => (await stored(page)).planning.schedules.map((s) => s.name)).toEqual(['Retained draft']);
  await page.getByRole('button', { name: m.newSchedule, exact: true }).click(); await expect(name).toHaveValue('');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await stored(page)).planning.schedules).toHaveLength(1);
});

test('a retained Data section cancels a held real file read before exit and rejects its late result', async ({ page }) => {
  await prepare(page, false); await settings(page, 'data'); const before = await stored(page);
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise<string>((resolve, reject) => {
        Object.assign(window, { releaseHeldFile: () => original.call(file).then(resolve, reject), heldFile: true });
      });
    };
  });
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: m.backup.import, exact: true }).click();
  await (await chooser).setFiles({ name: 'held.json', mimeType: 'application/json', buffer: Buffer.from(serializeBackup(initialData(), 1)) });
  await expect.poll(() => page.evaluate(() => (window as unknown as { heldFile?: boolean }).heldFile)).toBe(true);
  await expect(page.getByText(m.backup.busy, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: m.close, exact: true }).click();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { releaseHeldFile: () => Promise<void> }).releaseHeldFile());
  await expect(page.getByRole('dialog')).not.toBeVisible(); expect(await stored(page)).toEqual(before);
  await settings(page, 'data'); await expect(page.getByRole('button', { name: m.backup.import, exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: m.backup.confirm, exact: true })).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
});

test('Settings panel entries move once, keep live selections and restore Back focus after readiness', async ({ page }) => {
  await prepare(page, false); await settings(page); await expect(page.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await observePanel(page);
  await page.getByRole('button', { name: m.settingsGroups.appearance, exact: true }).click();
  await expect(page.getByRole('radio', { name: m.systemMode, exact: true })).toBeChecked();
  await expect.poll(async () => (await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await expect(page.getByTestId('panel-transition')).toHaveCSS('opacity', '1'); await resetPanelSamples(page);
  await page.getByRole('radio', { name: m.darkMode, exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  expect((await panelSamples(page)).every((value) => value === 1)).toBe(true);
  await resetPanelSamples(page); await page.getByRole('button', { name: m.back, exact: true }).click();
  await expect(page.getByRole('button', { name: m.settingsGroups.appearance, exact: true })).toBeFocused();
  expect((await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await page.getByRole('button', { name: m.settingsGroups.language, exact: true }).click();
  await expect(page.getByRole('radio', { name: 'English', exact: true })).toBeVisible();
  await expect(page.getByTestId('panel-transition')).toHaveCSS('opacity', '1'); await resetPanelSamples(page);
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.language).toBe('en');
  expect((await panelSamples(page)).every((value) => value === 1)).toBe(true); await stopPanelSamples(page);
});

test('real backup review and Cancel animate by view identity without changing saved records', async ({ page }) => {
  await prepare(page, false); await settings(page, 'data'); const before = await stored(page);
  const panels = page.getByTestId('panel-transition'); await expect(panels.last()).toHaveCSS('opacity', '1');
  await observePanel(page, true);
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: m.backup.import, exact: true }).click();
  await (await chooser).setFiles({ name: 'review.json', mimeType: 'application/json', buffer: Buffer.from(serializeBackup(initialData(), 1)) });
  await expect(page.getByRole('button', { name: m.backup.confirm, exact: true })).toBeVisible();
  await expect.poll(async () => (await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await expect(panels.last()).toHaveCSS('opacity', '1'); await resetPanelSamples(page);
  await page.getByRole('button', { name: m.cancel, exact: true }).click();
  await expect(page.getByRole('button', { name: m.backup.import, exact: true })).toBeEnabled();
  await expect.poll(async () => (await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await stopPanelSamples(page); expect(await stored(page)).toEqual(before);
});

test('Planning panel entries and editor returns preserve one draft, source focus and staged cancellation', async ({ page }) => {
  await prepare(page, false); await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true }).click();
  const name = page.getByRole('textbox', { name: m.scheduleName, exact: true }); await name.fill('One stable draft');
  const before = await stored(page); await observePanel(page, true);
  await name.fill('One stable draft · typed');
  expect((await panelSamples(page)).every((value) => value === 1)).toBe(true);
  const panels = [
    { button: m.editStepDuration(1), title: m.durationPickerTitle(1) },
    { button: `${m.calendarSchedule} · ${m.calendarManual}`, title: m.calendarSchedule },
    { button: m.repeatSequence, title: m.repeatSequence },
  ];
  for (const panel of panels) {
    const source = page.getByRole('button', { name: panel.button, exact: true }); await resetPanelSamples(page); await source.click();
    await expect(page.getByRole('dialog', { name: panel.title, exact: true })).toBeVisible();
    await expect.poll(async () => (await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
    if (panel.title === m.durationPickerTitle(1)) await expect(page.getByRole('spinbutton', { name: m.stepField(m.timeUnits[0], 1), exact: true })).toBeFocused();
    await page.getByRole('button', { name: m.cancel, exact: true }).click(); await expect(source).toBeFocused();
    await expect(name).toHaveValue('One stable draft · typed'); expect(await stored(page)).toEqual(before);
  }
  await resetPanelSamples(page); await page.getByRole('button', { name: m.close, exact: true }).click();
  await expect(page.getByRole('button', { name: m.continueEditing, exact: true })).toBeVisible();
  await expect.poll(async () => (await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true);
  await page.getByRole('button', { name: m.continueEditing, exact: true }).click();
  await expect(page.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await expect(name).toHaveValue('One stable draft · typed'); await stopPanelSamples(page); expect(await stored(page)).toEqual(before);
});

test('live reduced motion and background suspension settle current sheets without replay on return', async ({ page }) => {
  await prepare(page, false); const before = await stored(page); await observeSheet(page);
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await expect(page.getByTestId('sheet-surface')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const visibility = (state: 'visible' | 'hidden') => page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value }); document.dispatchEvent(new Event('visibilitychange'));
  }, state);
  await visibility('hidden'); await expect(page.getByTestId('sheet-surface')).toHaveAttribute('aria-hidden', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { (window as unknown as { sheetFrames: Frame[] }).sheetFrames.length = 0; });
  await visibility('visible'); await expect(page.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  expect((await frames(page)).every((frame) => frame.y === 0 && frame.backdrop === 1)).toBe(true);
  await page.keyboard.press('Escape'); await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('dialog')).not.toBeVisible(); await stopFrames(page); expect(await stored(page)).toEqual(before);
});

test('History details hand off to confirmation without releasing the new modal isolation or deleting on Cancel', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await seed(page, legacy); await page.goto('/history');
  // The card is the only saved-session opener; use its actual displayed duration.
  const card = page.getByRole('button').filter({ hasText: '00:02.50' });
  await expect(card).toHaveCount(1); await card.click();
  const before = await stored(page); await page.getByRole('button', { name: m.deleteSession, exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: m.deleteSessionTitle, exact: true });
  await expect(confirmation.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await expect.poll(() => page.getByTestId('sheet-surface').count()).toBe(1);
  expect(await page.locator('#crono-app').evaluate((node) => (node as HTMLElement).inert)).toBe(true);
  await confirmation.getByRole('button', { name: m.cancel, exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible(); expect(await stored(page)).toEqual(before);
  await expect.poll(() => page.locator('#crono-app').evaluate((node) => (node as HTMLElement).inert)).toBe(false);
  await expect(card).toBeVisible();
});

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) {
  test(`${id} ${theme} compact enlarged sheets and Settings panels retain real incoming motion and fit`, async ({ page }) => {
    const copy = getMessages(id), data = initialData(); data.preferences.language = id; data.preferences.theme = theme;
    await page.setViewportSize({ width: 320, height: 568 }); await page.emulateMedia({ reducedMotion: 'no-preference' });
    await seed(page, data); await page.goto('/timer'); await page.evaluate(() => document.fonts.ready);
    await observeSheet(page); await settings(page, undefined, copy);
    await expect(page.getByRole('button', { name: copy.close, exact: true })).toBeFocused();
    expect((await frames(page)).some((frame) => frame.y > 1 && frame.backdrop > 0 && frame.backdrop < 1)).toBe(true);
    await stopFrames(page); await observePanel(page);
    await page.getByRole('button', { name: copy.settingsGroups.appearance, exact: true }).click();
    await expect(page.getByRole('radio', { name: theme === 'dark' ? copy.darkMode : copy.lightMode, exact: true })).toBeChecked();
    expect((await panelSamples(page)).some((value) => value > 0 && value < 0.99)).toBe(true); await stopPanelSamples(page);
    await page.getByRole('dialog').evaluate((root) => {
      for (const node of root.querySelectorAll<HTMLElement>('[class*="css-text"]')) {
        const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize);
        node.style.fontSize = `${size * 1.3}px`;
        if (style.lineHeight !== 'normal') node.style.lineHeight = `${Number.parseFloat(style.lineHeight) * 1.3}px`;
      }
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const choice of await page.getByRole('radio').all()) {
      const box = (await choice.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: copy.back, exact: true }).click();
    await expect(page.getByRole('button', { name: copy.settingsGroups.appearance, exact: true })).toBeFocused();
    await page.getByRole('button', { name: copy.close, exact: true }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await stored(page)).preferences).toEqual(data.preferences);
  });
}
