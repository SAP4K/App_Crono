import { expect, test } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { expectTheme, seed, settings, stored } from './helpers';

test('manual theme defaults light, survives rapid toggles and ignores OS appearance', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, false);
  const dialog = await settings(page);
  const toggle = dialog.getByRole('switch', { name: 'Mod întunecat', exact: true });
  await expect(toggle).not.toBeChecked();
  for (let index = 0; index < 5; index++) await toggle.click();
  await expect(toggle).toBeChecked();
  await expectTheme(page, true);
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  await page.reload();
  await expectTheme(page, true);
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, true);
  await settings(page);
  await page.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('light');
  await page.reload();
  await expectTheme(page, false);
});

test('legacy running stopwatch, laps and history survive theme changes and reload', async ({ page }) => {
  const now = new Date('2026-11-05T10:00:00Z').getTime();
  await page.clock.setFixedTime(now);
  const data = initialData();
  data.sessions = [{ id: 'saved', savedAt: now - 1000, durationMs: 2000, laps: [] }];
  await seed(page, { ...data, preferences: { haptics: false, keepAwake: false } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Pornește', exact: true }).click();
  await page.clock.setFixedTime(now + 1234);
  await page.getByRole('button', { name: 'Înregistrează o tură' }).click();
  const before = (await stored(page)).stopwatch;
  await settings(page);
  await page.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
  await page.clock.setFixedTime(now + 4000);
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.getByLabel('Timp total 00:04.00')).toBeVisible();
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  await page.reload();
  await expectTheme(page, true);
  expect((await stored(page)).stopwatch).toEqual(before);
  expect((await stored(page)).sessions).toEqual(data.sessions);
  await page.getByRole('button', { name: 'Pauză', exact: true }).click();
  await settings(page);
  await page.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.getByLabel('Timp total 00:04.00')).toBeVisible();
  await page.getByRole('button', { name: 'Resetează cronometrul', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Un nou început?' })).toBeVisible();
});

for (const dark of [false, true]) for (const width of [320, 430, 1024]) {
  test(`${dark ? 'dark' : 'light'} screens and sheets fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    const data = initialData(); data.preferences.theme = dark ? 'dark' : 'light';
    data.stopwatch = { accumulatedMs: 3500, startedAt: null, laps: [{ number: 1, elapsedMs: 2000, splitMs: 2000 }] };
    data.sessions = [{ id: 'saved', savedAt: 1700000000000, durationMs: 2500, laps: data.stopwatch.laps }];
    await seed(page, data); await page.goto('/');
    await expect(page.getByRole('button', { name: 'Continuă', exact: true })).toBeVisible();
    await expectTheme(page, dark);
    for (const name of ['Timer', 'Istoric', 'Cronometru']) {
      await page.getByRole('tab', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
    await page.getByRole('button', { name: /^Sesiune / }).click();
    const details = page.getByRole('dialog', { name: 'Sesiunea ta.' });
    await expect(details).toBeVisible();
    await expect(details).toHaveCSS('background-color', dark ? 'rgb(20, 26, 21)' : 'rgb(246, 247, 242)');
    await details.getByRole('button', { name: 'Șterge sesiunea', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Ștergi sesiunea?' })).toHaveCSS('background-color', dark ? 'rgb(20, 26, 21)' : 'rgb(246, 247, 242)');
    await page.getByRole('button', { name: 'Renunță', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Ștergi sesiunea?' })).not.toBeVisible();
    await expect(details).not.toBeVisible();
    await settings(page);
    await page.screenshot({ path: `previews/theme-${dark ? 'dark' : 'light'}-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
