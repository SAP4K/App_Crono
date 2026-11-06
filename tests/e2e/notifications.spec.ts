import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { getMessages } from '../../src/i18n';
import { expectNoPageErrors, observePageErrors, seed, settings, stored } from './helpers';

test.beforeEach(async ({ page }) => {
  observePageErrors(page);
  await page.addInitScript(() => {
    Object.assign(window, { systemPermissionPrompts: 0 });
    Object.defineProperty(window, 'Notification', { configurable: true, value: class {
      static requestPermission() {
        (window as unknown as { systemPermissionPrompts: number }).systemPermissionPrompts++;
        return Promise.resolve('denied');
      }
    } });
  });
});
test.afterEach(async ({ page }) => {
  expectNoPageErrors(page);
  expect(await page.evaluate(() => (window as unknown as { systemPermissionPrompts: number }).systemPermissionPrompts)).toBe(0);
});

for (const language of ['ro', 'en', 'ru'] as const) for (const theme of ['light', 'dark'] as const) {
  test(`web notifications explain unsupported status in ${language} ${theme} without prompting`, async ({ page }) => {
    await page.setViewportSize({ width: language === 'ru' ? 320 : 390, height: 740 });
    const data = initialData(); data.preferences = { ...data.preferences, language, theme };
    const m = getMessages(language);
    await seed(page, data); await page.goto('/');
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
    const toggle = dialog.getByRole('switch', { name: m.systemNotifications, exact: true });
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toBeDisabled(); await expect(toggle).toBeChecked();
    await expect(dialog.getByText(m.notificationsWeb, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: m.notificationPermissionRequest, exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: m.notificationOpenSettings, exact: true })).toHaveCount(0);
    const bounds = await toggle.locator('../..').boundingBox(); expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(language === 'ru' ? 320 : 390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `previews/notifications-${language}-${theme}.png`, animations: 'disabled' });
  });
}

for (const choice of ['missing', 'false'] as const) {
  test(`legacy notifications ${choice} preference survives an unrelated save and reload`, async ({ page }) => {
    const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
    if (choice === 'false') legacy.preferences.systemNotifications = false;
    await seed(page, legacy); await page.goto('/'); const dialog = await settings(page);
    const toggle = dialog.getByRole('switch', { name: 'Notificări de sistem', exact: true });
    await expect(toggle).toBeDisabled();
    if (choice === 'false') await expect(toggle).not.toBeChecked(); else await expect(toggle).toBeChecked();
    await dialog.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
    await expect.poll(async () => (await stored(page)).preferences.theme).toBe('light');
    await page.reload(); const restored = await stored(page);
    expect(restored.preferences.systemNotifications).toBe(choice === 'missing');
    expect(restored.stopwatch).toEqual(legacy.stopwatch); expect(restored.timer).toEqual(legacy.timer);
    expect(restored.sessions).toEqual(legacy.sessions); expect(restored.preferences.timerSound).toBe(false);
    const reloaded = await settings(page);
    await expect(reloaded.getByRole('switch', { name: 'Notificări de sistem', exact: true })).toBeDisabled();
  });
}

test('a failed initial read keeps notification management disabled after dismissing the storage banner', async ({ page }) => {
  const raw = readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8');
  await page.addInitScript((saved) => {
    localStorage.setItem('@crono/app-v1', saved);
    const read = Storage.prototype.getItem;
    Object.assign(window, { restoreStorageRead: () => { Storage.prototype.getItem = read; } });
    Storage.prototype.getItem = function (key: string) {
      if (key === '@crono/app-v1') throw new Error('Test read failure');
      return read.call(this, key);
    };
  }, raw);
  await page.goto('/');
  const m = getMessages('ro'); await expect(page.getByText(m.storageWarning, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: m.dismissStorage, exact: true }).click();
  const dialog = await settings(page);
  await expect(dialog.getByText(m.notificationStorageUnavailable, { exact: true })).toBeVisible();
  await expect(dialog.getByRole('switch', { name: m.systemNotifications, exact: true })).toBeDisabled();
  await page.evaluate(() => (window as unknown as { restoreStorageRead: () => void }).restoreStorageRead());
  expect(await page.evaluate(() => localStorage.getItem('@crono/app-v1'))).toBe(raw);
});
