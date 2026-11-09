import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LANGUAGES } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { initialData } from '../../src/core/stopwatch';
import { expectNoPageErrors, expectTheme, observePageErrors, seed, settings, settingsGroup, stored } from './helpers';

// Fake clocks accept detached clearTimeout calls that Chrome's native timers reject.
test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

const classicWav = readFileSync(new URL('../../assets/audio/timer-complete.wav', import.meta.url));
const classicUrl = /timer-complete[^/]*\.wav/;

function dataWithPausedStopwatch() {
  const data = initialData();
  // Keep existing saved five-second selections covered with real native timers.
  data.preferences.alertDurationSeconds = 5;
  data.stopwatch.accumulatedMs = 1500;
  return data;
}

async function observeRealAudio(page: Page) {
  await page.addInitScript(() => {
    const players: HTMLAudioElement[] = [];
    Object.assign(window, { cronoObservedAudio: players });
    // Observe actual players while preserving native construction, play and pause.
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const player = Reflect.construct(target, args) as HTMLAudioElement;
        players.push(player);
        return player;
      },
    });
  });
}

async function audioState(page: Page) {
  return page.evaluate(() => (window as unknown as { cronoObservedAudio: HTMLAudioElement[] }).cronoObservedAudio
    .map((player) => ({ paused: player.paused, currentTime: player.currentTime, loop: player.loop })));
}

test('real timers cancel preview on leaving Sounds and retain natural expiry and Stop after a theme change', async ({ page }) => {
  const data = dataWithPausedStopwatch();
  data.preferences.alertDurationSeconds = 15;
  // Keep native media/timers and real WAV bytes; isolate Metro's asset-transfer latency.
  await page.route(classicUrl, (route) => route.fulfill({ contentType: 'audio/wav', body: classicWav }));
  await seed(page, data); await observeRealAudio(page); await page.goto('/');
  const dialog = await settings(page, 'sounds');
  const audition = dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true });
  const stop = dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true });
  await audition.click();
  await expect.poll(async () => (await audioState(page))[0]?.currentTime ?? 0).toBeGreaterThan(0);
  expectNoPageErrors(page);
  await settingsGroup(page, 'appearance');
  expect((await audioState(page))[0].paused).toBe(true);
  await dialog.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
  await settingsGroup(page, 'sounds');
  await audition.click();
  await expect.poll(async () => (await audioState(page))[1]?.currentTime ?? 0).toBeGreaterThan(0);
  await expectTheme(page, true);
  const playing = await audioState(page);
  expect(playing).toHaveLength(2);
  expect(playing[1]).toMatchObject({ paused: false, loop: true });
  await expect(audition).toBeVisible({ timeout: 20000 });
  expect((await audioState(page))[1].paused).toBe(true);
  await audition.click();
  await expect.poll(async () => (await audioState(page))[2]?.currentTime ?? 0).toBeGreaterThan(0);
  await stop.click(); await expect(audition).toBeVisible();
  expect((await audioState(page))[2].paused).toBe(true);
  const saved = await stored(page);
  expect(saved.stopwatch).toEqual(data.stopwatch);
  expect(saved.timer).toEqual(data.timer);
  expect(saved.planning).toEqual(data.planning);
});

test('real media loops for the selected full minute and then releases the player', async ({ page }) => {
  test.setTimeout(120000);
  const data = dataWithPausedStopwatch(); data.preferences.alertDurationSeconds = 60;
  await page.route(classicUrl, (route) => route.fulfill({ contentType: 'audio/wav', body: classicWav }));
  await seed(page, data); await observeRealAudio(page); await page.goto('/');
  const dialog = await settings(page, 'sounds'); await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect.poll(async () => (await audioState(page))[0]?.currentTime ?? 0).toBeGreaterThan(0);
  const started = Date.now();
  await expect(dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true })).toBeVisible({ timeout: 65000 });
  expect(Date.now() - started).toBeGreaterThan(58000);
  expect(Date.now() - started).toBeLessThan(65000);
  expect((await audioState(page))[0]).toMatchObject({ paused: true, loop: true });
});

test('real timers recover from a failed media load without uncaught errors', async ({ page }) => {
  let blocked = true;
  await page.route(classicUrl, (route) => blocked ? route.abort()
    : route.fulfill({ contentType: 'audio/wav', body: classicWav }));
  await seed(page); await observeRealAudio(page); await page.goto('/');
  const dialog = await settings(page, 'sounds');
  const audition = dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true });
  await audition.click();
  await expect(dialog.getByText('Sunetul nu este disponibil acum.', { exact: true })).toBeVisible();
  await expect(audition).toBeVisible();
  expectNoPageErrors(page);
  blocked = false;
  await audition.click();
  await expect.poll(async () => (await audioState(page))[1]?.currentTime ?? 0).toBeGreaterThan(0);
  await expect(dialog.getByText('Sunetul nu este disponibil acum.', { exact: true })).not.toBeVisible();
  await dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true }).click();
  await expect(audition).toBeVisible();
});

test('real timers allow countdown pause, resume and confirmed reset', async ({ page }) => {
  const data = dataWithPausedStopwatch();
  data.timer = { ...data.timer, durationMs: 60000, remainingMs: 60000 };
  await seed(page, data); await page.goto('/timer');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.status).toBe('running');
  const runId = (await stored(page)).timer.runId;
  await page.getByRole('button', { name: 'Pauză temporizator', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuă temporizatorul', exact: true })).toBeVisible();
  const paused = (await stored(page)).timer;
  expect(paused).toMatchObject({ status: 'paused', runId, deadlineAt: null });
  expect(paused.remainingMs).toBeGreaterThan(0);
  expect(paused.remainingMs).toBeLessThanOrEqual(60000);
  await page.getByRole('button', { name: 'Continuă temporizatorul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.status).toBe('running');
  expect((await stored(page)).timer.runId).toBe(runId);
  await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
  await page.getByRole('dialog', { name: 'Resetezi temporizatorul?', exact: true })
    .getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.status).toBe('idle');
  expect((await stored(page)).stopwatch).toEqual(data.stopwatch);
  expect((await stored(page)).planning).toEqual(data.planning);
});

test('real timers allow schedule pause, resume and confirmed reset without losing its template', async ({ page }) => {
  const data = dataWithPausedStopwatch();
  data.planning.schedules = [{ id: 'real', name: 'Concentrare', steps: [{ id: 'one', name: 'Studiu', durationMs: 60000 }] }];
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: 'Pornește orarul Concentrare', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.run?.status).toBe('running');
  const runId = (await stored(page)).planning.run!.runId;
  await page.getByRole('button', { name: 'Pauză orar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuă orarul', exact: true })).toBeVisible();
  const paused = (await stored(page)).planning.run!;
  expect(paused).toMatchObject({ status: 'paused', runId, deadlineAt: null });
  expect(paused.remainingMs).toBeGreaterThan(0);
  expect(paused.remainingMs).toBeLessThanOrEqual(60000);
  await page.getByRole('button', { name: 'Continuă orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.run?.status).toBe('running');
  expect((await stored(page)).planning.run!.runId).toBe(runId);
  await page.getByRole('button', { name: 'Resetează orarul', exact: true }).click();
  await page.getByRole('dialog', { name: 'Resetezi orarul?', exact: true })
    .getByRole('button', { name: 'Resetează orarul', exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.run).toBeNull();
  const saved = await stored(page);
  expect(saved.planning.schedules).toEqual(data.planning.schedules);
  expect(saved.stopwatch).toEqual(data.stopwatch);
  expect(saved.timer).toEqual(data.timer);
});

for (const [first, second] of [['en', 'ru'], ['es', 'fr'], ['fr', 'de'], ['de', 'es']] as const) {
  test(`real pending and playing previews cancel across ${first} and ${second}, then retain expiry and Stop`, async ({ page }) => {
    let release!: () => void; let requested = false;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route(classicUrl, async (route) => { requested = true; await pending; await route.fulfill({ contentType: 'audio/wav', body: classicWav }); });
    const data = dataWithPausedStopwatch();
    await seed(page, data); await observeRealAudio(page); await page.goto('/');
    await settings(page, 'sounds');
    try {
      await page.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
      await expect.poll(() => requested).toBe(true);
      await settingsGroup(page, 'language');
      await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === first)!.label, exact: true }).click();
      await settingsGroup(page, 'sounds', getMessages(first)); release();
      await expect.poll(async () => (await audioState(page))[0]?.paused).toBe(true);
      await page.getByRole('button', { name: getMessages(first).preview, exact: true }).click();
      await expect.poll(async () => (await audioState(page))[1]?.currentTime ?? 0).toBeGreaterThan(0);
      await settingsGroup(page, 'language', getMessages(first));
      await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === second)!.label, exact: true }).click();
      await settingsGroup(page, 'sounds', getMessages(second));
      expect((await audioState(page))[1].paused).toBe(true);
      const audition = page.getByRole('button', { name: getMessages(second).preview, exact: true });
      await audition.click();
      await expect.poll(async () => (await audioState(page))[2]?.currentTime ?? 0).toBeGreaterThan(0);
      await expect(audition).toBeVisible({ timeout: 10000 });
      expect((await audioState(page))[2].paused).toBe(true);
      await audition.click();
      await expect.poll(async () => (await audioState(page))[3]?.currentTime ?? 0).toBeGreaterThan(0);
      await page.getByRole('button', { name: getMessages(second).stopPreview, exact: true }).click();
      expect((await audioState(page))[3].paused).toBe(true); expect(await audioState(page)).toHaveLength(4);
      const saved = await stored(page);
      expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.timer).toEqual(data.timer); expect(saved.planning).toEqual(data.planning);
    } finally { release(); }
  });
}
