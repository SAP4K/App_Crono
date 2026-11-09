import { expect, test, type Page } from '@playwright/test';
import { LANGUAGES } from '../../src/core/language';
import { initialData } from '../../src/core/stopwatch';
import { getMessages } from '../../src/i18n';
import { expectNoPageErrors, observePageErrors, seed } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

async function enlargeBodyText(page: Page) {
  await page.evaluate(() => {
    // Enlarge body/actions; wheel rows and capped clock numerals have separate checks.
    for (const node of document.querySelectorAll<HTMLElement>('[class*="css-text"], input[type="text"]')) {
      if (node.dataset.cronoEnlarged || node.closest('[role="spinbutton"]')) continue;
      const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize);
      if (size > 24) continue;
      node.dataset.cronoEnlarged = 'true'; node.style.fontSize = `${size * 1.3}px`;
      if (style.lineHeight !== 'normal') node.style.lineHeight = `${Number.parseFloat(style.lineHeight) * 1.3}px`;
    }
  });
}

async function expectFit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, [role="tab"], [role="switch"], [role="radio"]')]
    .filter((node) => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight
        && (box.x < -1 || box.right > innerWidth + 1);
    }).map((node) => node.getAttribute('aria-label') ?? node.textContent?.slice(0, 80)));
  expect(overflow).toEqual([]);
}

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) for (const width of [320, 390]) {
  test(`readable ${id} ${theme} layout at ${width}px keeps primary controls and Settings panels usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    const data = initialData(); data.preferences.language = id; data.preferences.theme = theme;
    data.planning.schedules = [{ id: 'layout', name: 'Учёба · Școală', steps: [
      { id: 'a', name: 'Concentration', durationMs: 1500000 }, { id: 'b', name: 'Pause', durationMs: 300000 },
    ] }];
    const m = getMessages(id); await seed(page, data); await page.goto('/timer');
    await expect(page.getByRole('button', { name: m.presetMinutes(25), exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectFit(page);
    await page.getByRole('button', { name: m.startTimer, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
    await page.getByRole('button', { name: m.startTimer, exact: true }).click();
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await enlargeBodyText(page); await expectFit(page);
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
    await expect(page.getByRole('button', { name: m.startSchedule('Учёба · Școală'), exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectFit(page);
    await page.getByRole('button', { name: m.startSchedule('Учёба · Școală'), exact: true }).click();
    await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
    await expect(page.getByRole('button', { name: m.openActiveTimer, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: m.openActivePlanning, exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectFit(page);
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    await expect(page.getByRole('dialog', { name: m.settingsTitle, exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectFit(page);
    for (const group of ['appearance', 'language', 'sounds', 'notifications', 'device', 'data', 'about'] as const) {
      await page.getByRole('button', { name: m.settingsGroups[group], exact: true }).click();
      await expect(page.getByRole('dialog', { name: m.settingsGroups[group], exact: true })).toBeVisible();
      await enlargeBodyText(page); await expectFit(page);
      for (const toggle of await page.getByRole('switch').all()) {
        const box = (await toggle.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
      }
      await page.getByRole('button', { name: m.back, exact: true }).click();
    }
    await page.getByRole('button', { name: m.close, exact: true }).click();
  });
}
