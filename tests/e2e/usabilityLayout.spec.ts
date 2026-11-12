import { expect, test, type Locator, type Page } from '@playwright/test';
import { LANGUAGES } from '../../src/core/language';
import { initialData } from '../../src/core/stopwatch';
import { getMessages } from '../../src/i18n';
import { expectNoPageErrors, expectTheme, observePageErrors, seed, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

async function enlargeBodyText(page: Page) {
  await page.evaluate(() => {
    // Enlarge body/actions; wheel rows and capped clock numerals have separate checks.
    for (const node of document.querySelectorAll<HTMLElement>('[class*="css-text"], input[type="text"]')) {
      if (node.dataset.cronoEnlarged || node.closest('[role="spinbutton"]')) continue;
      const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize);
      if (size > 24 && node.getAttribute('role') !== 'heading') continue;
      node.dataset.cronoEnlarged = 'true'; node.style.fontSize = `${size * 1.3}px`;
      if (style.lineHeight !== 'normal') node.style.lineHeight = `${Number.parseFloat(style.lineHeight) * 1.3}px`;
    }
  });
  // Newly visible Inter weights can still be loading after panel mount.
  // Measure enlarged text and press geometry only after the real font is ready.
  await page.evaluate(() => document.fonts.ready);
}

async function expectStudioHeading(page: Page) {
  const heading = page.getByRole('heading').first();
  await expect(heading).toHaveCSS('font-family', /Georgia/);
  await expect(heading).toHaveCSS('font-weight', '400');
  const metrics = await heading.evaluate((node) => {
    const style = getComputedStyle(node), box = node.getBoundingClientRect();
    return { size: Number.parseFloat(style.fontSize), line: Number.parseFloat(style.lineHeight), left: box.left, right: box.right, width: innerWidth };
  });
  expect(metrics.line).toBeGreaterThanOrEqual(metrics.size * 1.1);
  expect(metrics.left).toBeGreaterThanOrEqual(0); expect(metrics.right).toBeLessThanOrEqual(metrics.width);
}

async function expectFit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, [role="tab"], [role="switch"], [role="radio"]')]
    .filter((node) => {
      // Inactive and covered scenes retain layout but expose no controls.
      if (node.closest('[inert], [aria-hidden="true"]')) return false;
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight
        && (box.x < -1 || box.right > innerWidth + 1);
    }).map((node) => node.getAttribute('aria-label') ?? node.textContent?.slice(0, 80)));
  expect(overflow).toEqual([]);
}

async function pressedFit(page: Page, choice: Locator) {
  const before = await choice.evaluate((node) => {
    const el = node as HTMLElement;
    return { size: [el.offsetWidth, el.offsetHeight, el.offsetLeft, el.offsetTop], color: getComputedStyle(el).backgroundColor };
  });
  await choice.scrollIntoViewIfNeeded(); const box = (await choice.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await expect(choice).toHaveCSS('opacity', '0.72');
  await expect.poll(() => choice.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a)).toBeCloseTo(0.98, 5);
  await expect(choice).toBeChecked(); await expect(choice).toHaveCSS('background-color', before.color);
  expect(await choice.evaluate((node) => {
    const el = node as HTMLElement; return [el.offsetWidth, el.offsetHeight, el.offsetLeft, el.offsetTop];
  })).toEqual(before.size);
  await expectFit(page); await page.mouse.move(0, 0); await page.mouse.up();
  await expect(choice).toHaveCSS('opacity', '1');
  await expect.poll(() => choice.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a)).toBeCloseTo(1, 5);
}

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) for (const width of [320, 390]) {
  test(`readable ${id} ${theme} layout at ${width}px keeps primary controls and Settings panels usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    const data = initialData(); data.preferences.language = id; data.preferences.theme = 'system';
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    data.planning.schedules = [{ id: 'layout', name: 'Учёба · Școală', steps: [
      { id: 'a', name: 'Concentration', durationMs: 1500000 }, { id: 'b', name: 'Pause', durationMs: 300000 },
    ] }];
    const m = getMessages(id); await seed(page, data); await page.goto('/timer');
    await expect(page.getByRole('button', { name: m.presetMinutes(25), exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
    await page.getByRole('button', { name: m.startTimer, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
    await page.getByRole('button', { name: m.startTimer, exact: true }).click();
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
    await expect(page.getByRole('button', { name: m.startSchedule('Учёба · Școală'), exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
    await page.getByRole('button', { name: m.pauseTimer, exact: true }).click();
    await enlargeBodyText(page);
    const resumeLabel = page.getByRole('button', { name: m.resumeTimer, exact: true }).getByText(m.resume, { exact: true });
    expect(await resumeLabel.evaluate((node) => {
      const text = document.createRange(); text.selectNodeContents(node);
      return text.getClientRects().length;
    })).toBe(1);
    await page.getByRole('button', { name: m.startSchedule('Учёба · Școală'), exact: true }).click();
    await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
    await expect(page.getByRole('button', { name: m.openActiveTimer, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: m.openActivePlanning, exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    await expect(page.getByRole('dialog', { name: m.settingsTitle, exact: true })).toBeVisible();
    await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
    for (const group of ['appearance', 'language', 'sounds', 'notifications', 'device', 'data', 'about'] as const) {
      await page.getByRole('button', { name: m.settingsGroups[group], exact: true }).click();
      await expect(page.getByRole('dialog', { name: m.settingsGroups[group], exact: true })).toBeVisible();
      await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
      if (group === 'appearance') {
        await expect(page.getByRole('radio', { name: m.systemMode, exact: true })).toBeChecked();
        const before = await stored(page);
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
        await pressedFit(page, page.getByRole('radio', { name: m.systemMode, exact: true }));
        expect(await stored(page)).toEqual(before);
        await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark', reducedMotion: 'reduce' });
        await expectTheme(page, theme !== 'dark'); await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
        for (const choice of await page.getByRole('radio').all()) {
          const box = (await choice.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
        }
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' }); await expectTheme(page, theme === 'dark');
        expect(await stored(page)).toEqual(before);
        if (width === 320 && (id === 'ro' || id === 'ru')) {
          await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: `previews/system-${id}-${theme}-${width}.png`, animations: 'disabled' });
        }
      }
      for (const toggle of await page.getByRole('switch').all()) {
        const box = (await toggle.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
      }
      await page.getByRole('button', { name: m.back, exact: true }).click();
      if (group === 'appearance') await expect(page.getByRole('button', { name: m.settingsGroups.appearance, exact: true }).getByText(m.systemMode, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: m.close, exact: true }).click();
    await page.getByRole('tab', { name: m.stopwatchTab, exact: true }).click();
    await enlargeBodyText(page); await expectStudioHeading(page); await expectFit(page);
  });
}
