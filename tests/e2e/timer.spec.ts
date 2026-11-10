import { expect, test } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer, startTimer } from '../../src/core/timer';
import { selectTheme, settingsGroup, audioSpy, duration, expectNoPageErrors, observePageErrors, playCount, seed, selectWheel, settings, stored } from './helpers';

test.beforeEach(async ({ page }) => {
  observePageErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
});
test.afterEach(({ page }) => expectNoPageErrors(page));

test('bounds duration wheels and preserves fractional remaining time across pause/reload/resume', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await audioSpy(page); await page.goto('/timer');
  const start = page.getByRole('button', { name: 'Pornește temporizatorul', exact: true });
  await expect(start).toBeVisible();
  await duration(page, '00'); await expect(start).toBeDisabled();
  const hours = page.getByRole('spinbutton', { name: 'Ore', exact: true });
  await hours.press('End'); await hours.press('ArrowUp');
  await expect(hours).toHaveAttribute('aria-valuenow', '23');
  await hours.press('Home'); await hours.press('ArrowDown');
  await expect(hours).toHaveAttribute('aria-valuenow', '0');
  const seconds = page.getByRole('spinbutton', { name: 'Secunde', exact: true });
  await seconds.press('End'); await seconds.press('ArrowUp');
  await expect(seconds).toHaveAttribute('aria-valuenow', '59');
  await seconds.press('Home'); await expect(start).toBeDisabled();
  await duration(page, '03'); await start.click();
  await page.clock.runFor(1001);
  await page.getByRole('button', { name: 'Pauză temporizator', exact: true }).click();
  await expect(page.getByLabel('Timp rămas 00:00:02')).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  expect((await stored(page)).timer.durationMs).toBe(3000);
  const paused = (await stored(page)).timer;
  expect(paused.remainingMs).toBeGreaterThan(0); expect(paused.remainingMs).toBeLessThan(2000);
  await page.clock.runFor(10000); await page.reload();
  await expect(page.getByRole('button', { name: 'Continuă temporizatorul', exact: true })).toBeVisible();
  expect((await stored(page)).timer).toEqual(paused);
  await page.getByRole('button', { name: 'Continuă temporizatorul', exact: true }).click();
  await page.clock.runFor(paused.remainingMs - 1);
  // Pause samples the exact positive remainder; the UI must round it up.
  await page.getByRole('button', { name: 'Pauză temporizator', exact: true }).click();
  await expect(page.getByLabel('Timp rămas 00:00:01')).toBeVisible();
  await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
  await page.getByRole('button', { name: 'Renunță', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.getByRole('dialog', { name: 'Resetezi temporizatorul?' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuă temporizatorul', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
  await expect(page.getByLabel('Timp rămas 00:00:03')).toBeVisible();
  expect(await playCount(page)).toBe(0); expect(errors).toEqual([]);
});

test('running timer persists and completes once in settings while stopwatch remains independent', async ({ page }) => {
  await audioSpy(page); await page.goto('/');
  await page.getByRole('button', { name: 'Pornește', exact: true }).click();
  await page.getByRole('tab', { name: 'Timer', exact: true }).click();
  await duration(page, '10'); await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  const running = (await stored(page)).timer;
  await page.reload(); await expect(page.getByText('Numărătoare inversă', { exact: true })).toBeVisible();
  expect((await stored(page)).timer).toEqual(running);
  await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
  const dialog = await settings(page, 'appearance');
  await selectTheme(dialog, 'dark');
  await page.clock.runFor(10000);
  await expect(dialog.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  await expect.poll(() => playCount(page)).toBe(1);
  await settingsGroup(page, 'sounds');
  await dialog.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  await dialog.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  expect(await playCount(page)).toBe(1);
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.getByRole('tab', { name: 'Cronometru', exact: true }).click();
  await expect(page.getByText('În desfășurare', { exact: true })).toBeVisible();
  expect((await stored(page)).stopwatch.startedAt).not.toBeNull();
  expect((await stored(page)).sessions).toEqual([]);
  await page.reload(); await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(0);
  await page.getByRole('tab', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Repornește temporizatorul', exact: true }).click();
  expect((await stored(page)).timer.runId).not.toBe(running.runId);
  await page.clock.runFor(10000); await expect.poll(() => playCount(page)).toBe(1);
});

for (const target of ['details', 'delete', 'reset'] as const) {
  test(`expiry remains visible inside ${target} dialog and preserves its actions`, async ({ page }) => {
    const data = initialData();
    data.sessions = [{ id: 'saved', savedAt: Date.parse('2026-11-04T10:00:00Z'), durationMs: 2500, laps: [] }];
    await seed(page, data); await audioSpy(page); await page.goto('/timer');
    await duration(page, '05'); await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
    if (target === 'reset') await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
    else {
      await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
      await page.getByRole('button', { name: /^Sesiune / }).click();
      if (target === 'delete') {
        await page.getByRole('dialog', { name: 'Sesiunea ta.' }).getByRole('button', { name: 'Șterge sesiunea', exact: true }).click();
        await page.clock.runFor(300);
      }
    }
    await page.clock.runFor(5000);
    const dialog = page.getByRole('dialog', { name: target === 'delete' ? 'Ștergi sesiunea?' : target === 'reset' ? 'Resetezi temporizatorul?' : 'Sesiunea ta.', exact: true });
    await expect(dialog.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
    expect(await playCount(page)).toBe(1);
    await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
    expect((await stored(page)).timer.status).toBe('completed');
    if (target === 'details') await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
    else await dialog.getByRole('button', { name: target === 'delete' ? 'Șterge sesiunea' : 'Resetează temporizatorul', exact: true }).click();
    if (target === 'delete') await expect(page.getByText('Primul pas e un start.', { exact: true })).toBeVisible();
    if (target === 'reset') await expect(page.getByRole('button', { name: 'Pornește temporizatorul', exact: true })).toBeVisible();
  });
}

test('muted preference persists; blocked playback falls back without an unhandled rejection', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await audioSpy(page, true); await page.goto('/timer');
  await settings(page, 'sounds'); await page.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.timerSound).toBe(false);
  await page.reload(); const dialog = await settings(page, 'sounds');
  await expect(dialog.getByRole('switch', { name: 'Alerte sonore', exact: true })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.clock.runFor(300);
  await expect(dialog).not.toBeVisible();
  await duration(page, '01'); await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000); await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(0);
  await settings(page, 'sounds'); await page.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  expect(await playCount(page)).toBe(0);
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.clock.runFor(300);
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Repornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator('#root').getByLabel('Temporizator finalizat', { exact: true })).toContainText('Timpul a expirat. Sunetul nu este disponibil acum.');
  expect(await playCount(page)).toBe(1); expect(errors).toEqual([]);
});

test('overdue hydration and hidden-tab expiry reconcile silently', async ({ page }) => {
  const now = Date.parse('2026-11-05T10:00:00Z');
  const data = initialData(); data.timer = startTimer(initialTimer(1000), now - 5000, 'overdue');
  await seed(page, data); await audioSpy(page); await page.goto('/timer');
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible(); expect(await playCount(page)).toBe(0);
  await page.getByRole('button', { name: 'Repornește temporizatorul', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  expect((await stored(page)).timer.status).toBe('running'); expect(await playCount(page)).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible(); expect(await playCount(page)).toBe(0);
});

test('shipped completion effect is served and decodable', async ({ page }) => {
  let assetUrl = '';
  page.on('request', (request) => { if (/timer-complete[^/]*\.wav/.test(request.url())) assetUrl = request.url(); });
  await page.goto('/timer'); await expect(page.getByRole('button', { name: 'Pornește temporizatorul', exact: true })).toBeVisible();
  await duration(page, '01');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000);
  await expect.poll(() => assetUrl).not.toBe('');
  const decoded = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      return { ok: response.ok, duration: buffer.duration, channels: buffer.numberOfChannels };
    } finally { await context.close(); }
  }, assetUrl);
  expect(decoded.ok).toBe(true); expect(decoded.channels).toBe(1);
  expect(decoded.duration).toBeGreaterThan(0.5); expect(decoded.duration).toBeLessThan(2);
});

test('completed timer survives focusing duration wheels without edits', async ({ page }) => {
  await audioSpy(page); await page.goto('/timer');
  await duration(page, '01');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  const completed = (await stored(page)).timer;
  expect(completed.status).toBe('completed');

  await page.getByLabel('Secunde', { exact: true }).focus();
  const dialog = await settings(page, 'sounds');
  await page.clock.runFor(300);
  await expect(dialog.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  expect((await stored(page)).timer).toEqual(completed);
  expect(await playCount(page)).toBe(1);

  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.clock.runFor(300);
  await expect(dialog).not.toBeVisible();
  await selectWheel(page.getByRole('spinbutton', { name: 'Secunde', exact: true }), 2);
  await page.getByRole('heading', { name: 'Temporizator', exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer).toMatchObject({ status: 'idle', durationMs: 2000, runId: null });
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Pornește temporizatorul', exact: true })).toBeVisible();
});

test('successful timer completion clears the previous run audio error', async ({ page }) => {
  await audioSpy(page, true); await page.goto('/timer');
  await duration(page, '01');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000);
  const completion = page.getByLabel('Temporizator finalizat', { exact: true });
  await expect(completion).toContainText('Sunetul nu este disponibil acum.');

  // Recover playback before the previous warning's 3.5-second timeout expires.
  await page.evaluate(() => {
    HTMLMediaElement.prototype.play = function () {
      const target = window as unknown as { timerPlayCount: number };
      target.timerPlayCount++;
      return Promise.resolve();
    };
  });
  await page.getByRole('button', { name: 'Repornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000);
  await expect.poll(() => playCount(page)).toBe(2);
  await expect(completion).toHaveText('Timpul a expirat.');
  await page.clock.runFor(3500);
  await expect(completion).toHaveText('Timpul a expirat.');
  expect(await playCount(page)).toBe(2);
});

test('timer completion preserves an unrelated session-save notice', async ({ page }) => {
  const data = initialData(); data.stopwatch.accumulatedMs = 1000;
  await seed(page, data); await audioSpy(page); await page.goto('/timer');
  await duration(page, '01');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await page.getByRole('tab', { name: 'Cronometru', exact: true }).click();
  await page.getByRole('button', { name: 'Salvează sesiunea', exact: true }).click();
  await expect(page.getByText('Sesiune salvată în istoric.', { exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  await expect(page.getByText('Sesiune salvată în istoric.', { exact: true })).toBeVisible();
});
