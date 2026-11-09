import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { settingsGroup, audioEvents, audioSpy, duration, expectNoPageErrors, observePageErrors, playCount, seed, settings, stepDuration, stored } from './helpers';

test.beforeEach(async ({ page }) => {
  observePageErrors(page);
  await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
});
test.afterEach(({ page }) => expectNoPageErrors(page));

test('sound selections persist and a looping preview lasts the saved 15 seconds', async ({ page }) => {
  await audioSpy(page); await page.goto('/'); let dialog = await settings(page, 'sounds');
  await expect(dialog.getByRole('radio', { name: 'Sunet Clasic', exact: true })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Durata sunetului 60 secunde', exact: true })).toBeChecked();
  for (const [label, id] of [['Clopoțel', 'bell'], ['Digital', 'digital'], ['Clasic', 'classic'], ['Gong', 'gong']]) {
    await dialog.getByRole('radio', { name: `Sunet ${label}`, exact: true }).click();
    await expect.poll(async () => (await stored(page)).preferences.alertSoundId).toBe(id);
  }
  await dialog.getByRole('radio', { name: 'Durata sunetului 5 secunde', exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.alertDurationSeconds).toBe(5);
  await page.reload(); dialog = await settings(page, 'sounds');
  await expect(dialog.getByRole('radio', { name: 'Durata sunetului 5 secunde', exact: true })).toBeChecked();
  await dialog.getByRole('radio', { name: 'Durata sunetului 15 secunde', exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.alertDurationSeconds).toBe(15);
  await page.reload(); dialog = await settings(page, 'sounds');
  await expect(dialog.getByRole('radio', { name: 'Sunet Gong', exact: true })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Durata sunetului 15 secunde', exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect.poll(() => playCount(page)).toBe(1);
  const played = (await audioEvents(page)).find((event) => event.type === 'play')!;
  expect(played.loop).toBe(true); expect(played.src).toMatch(/gong[^/]*\.wav/);
  await page.clock.runFor(14999);
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(0);
  await page.clock.runFor(1);
  await expect(dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true })).toBeVisible();
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(1);
});

test('manual preview works while automatic alerts are muted and stops on change or close', async ({ page }) => {
  await audioSpy(page); await page.goto('/'); const dialog = await settings(page, 'sounds');
  await dialog.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  await dialog.getByRole('radio', { name: 'Durata sunetului 30 secunde', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect.poll(() => playCount(page)).toBe(1);
  await page.clock.runFor(10000);
  await expect(dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true })).toBeVisible();
  await dialog.getByRole('radio', { name: 'Sunet Digital', exact: true }).click();
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect.poll(() => playCount(page)).toBe(2);
  await dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true }).click();
  expect((await stored(page)).timer.status).toBe('idle');
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect.poll(() => playCount(page)).toBe(3);
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(3);
});

test('preview errors recover on a later attempt without retaining the previous warning', async ({ page }) => {
  await audioSpy(page, true); await page.goto('/'); const dialog = await settings(page, 'sounds');
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect(dialog.getByText('Sunetul nu este disponibil acum.', { exact: true })).toBeVisible();
  await page.evaluate(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true })).toBeVisible();
  await expect(dialog.getByText('Sunetul nu este disponibil acum.', { exact: true })).not.toBeVisible();
});

test('live timer alerts keep priority over a settings preview', async ({ page }) => {
  await audioSpy(page); await page.goto('/timer'); await duration(page, '01');
  await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
  const dialog = await settings(page, 'sounds'); await page.clock.runFor(1000);
  await expect.poll(() => playCount(page)).toBe(1);
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect(dialog.getByText('O alertă este deja în redare.', { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(1);
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(0);
});

for (const ending of ['duration', 'stop'] as const) {
  test(`live-alert priority feedback clears after ${ending}`, async ({ page }) => {
    await audioSpy(page); await page.goto('/timer'); await duration(page, '01');
    await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
    const dialog = await settings(page, 'sounds'); await page.clock.runFor(1000);
    await expect.poll(() => playCount(page)).toBe(1);
    const completed = (await stored(page)).timer;
    await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
    const warning = dialog.getByText('O alertă este deja în redare.', { exact: true });
    await expect(warning).toBeVisible();
    expect(await playCount(page)).toBe(1);
    if (ending === 'stop') await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
    else await page.clock.runFor(60000);
    await expect(dialog.getByRole('button', { name: 'Oprește sunetul', exact: true })).not.toBeVisible();
    await expect(warning).not.toBeVisible();
    expect((await stored(page)).timer).toEqual(completed);
    await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
    await expect.poll(() => playCount(page)).toBe(2);
    await expect(dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true })).toBeVisible();
    await expect(warning).not.toBeVisible();
  });
}

test('all four actual bundled effects are served and decoded through settings audition', async ({ page }) => {
  await audioSpy(page); await page.goto('/'); const dialog = await settings(page, 'sounds');
  let count = 0;
  for (const label of ['Clasic', 'Clopoțel', 'Digital', 'Gong']) {
    await dialog.getByRole('radio', { name: `Sunet ${label}`, exact: true }).click();
    await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
    await expect.poll(() => playCount(page)).toBe(++count);
  }
  const urls = (await audioEvents(page)).filter((event) => event.type === 'play').map((event) => event.src);
  expect(new Set(urls).size).toBe(4);
  const decoded = await page.evaluate(async (sources) => {
    const context = new AudioContext();
    try {
      const results = [];
      for (const source of sources) {
        const response = await fetch(source);
        const audio = await context.decodeAudioData(await response.arrayBuffer());
        results.push({ ok: response.ok, channels: audio.numberOfChannels, duration: audio.duration });
      }
      return results;
    } finally { await context.close(); }
  }, urls);
  for (const item of decoded) {
    expect(item.ok).toBe(true); expect(item.channels).toBe(1);
    expect(item.duration).toBeGreaterThan(0.5); expect(item.duration).toBeLessThanOrEqual(4);
  }
});

test('literal legacy-v1 data survives settings, real Classic playback, completion, and reload', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await audioSpy(page); await page.goto('/timer');
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(0);
  const dialog = await settings(page, 'appearance');
  await expect(dialog.getByRole('switch', { name: 'Mod întunecat', exact: true })).toBeChecked();
  await settingsGroup(page, 'sounds');
  await expect(dialog.getByRole('switch', { name: 'Alerte sonore', exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Sunet Clasic', exact: true })).toBeChecked();
  await dialog.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect.poll(() => playCount(page)).toBe(1);
  expect((await audioEvents(page)).find((event) => event.type === 'play')?.src).toMatch(/timer-complete[^/]*\.wav/);
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click(); await page.clock.runFor(300);
  await page.getByRole('button', { name: 'Repornește temporizatorul', exact: true }).click();
  await page.clock.runFor(1000); await expect.poll(() => playCount(page)).toBe(2);
  const result = await stored(page);
  expect(result.stopwatch).toEqual(legacy.stopwatch); expect(result.sessions).toEqual(legacy.sessions);
  expect(result.preferences).toEqual({ ...legacy.preferences, systemNotifications: true, language: 'ro', timerSound: true, alertSoundId: 'classic', alertDurationSeconds: 60 });
  await page.reload(); await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(0);
});

test('late preview startup cannot revive an obsolete sound or shorten its replacement', async ({ page }) => {
  await audioSpy(page); await page.goto('/'); const dialog = await settings(page, 'sounds');
  await page.evaluate(() => {
    Object.assign(window, { pendingStarts: [] });
    HTMLMediaElement.prototype.play = function () {
      const target = window as unknown as { timerPlayCount: number; pendingStarts: (() => void)[] };
      target.timerPlayCount++;
      return new Promise<void>((resolve) => target.pendingStarts.push(resolve));
    };
  });
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click(); await expect.poll(() => playCount(page)).toBe(1);
  await page.clock.runFor(1000);
  await dialog.getByRole('radio', { name: 'Sunet Clopoțel', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click(); await expect.poll(() => playCount(page)).toBe(2);
  await page.evaluate(() => (window as unknown as { pendingStarts: (() => void)[] }).pendingStarts[0]());
  await page.clock.runFor(1500);
  await page.evaluate(() => (window as unknown as { pendingStarts: (() => void)[] }).pendingStarts[1]());
  await page.clock.runFor(59999);
  await expect(dialog.getByRole('button', { name: 'Oprește previzualizarea', exact: true })).toBeVisible();
  await page.clock.runFor(1);
  await expect(dialog.getByRole('button', { name: 'Ascultă sunetul', exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(2);
});

test('legacy data retains Bell and 60 seconds through reload, concurrent timer and two-action schedule', async ({ page }) => {
  test.setTimeout(90000);
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await audioSpy(page); await page.goto('/planning');
  let dialog = await settings(page, 'sounds');
  await dialog.getByRole('radio', { name: 'Sunet Clopoțel', exact: true }).click();
  await dialog.getByRole('radio', { name: 'Durata sunetului 60 secunde', exact: true }).click();
  await dialog.getByRole('switch', { name: 'Alerte sonore', exact: true }).click();
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click(); await page.clock.runFor(300);
  await page.getByRole('button', { name: 'Orar nou', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Orar nou', exact: true });
  await dialog.getByLabel('Nume orar', { exact: true }).fill('Un minut');
  await dialog.getByLabel('Nume etapa 1', { exact: true }).fill('Lucru');
  await stepDuration(page, 1, [0, 0, 3]);
  await dialog.getByRole('button', { name: 'Adaugă etapă', exact: true }).click();
  await dialog.getByLabel('Nume etapa 2', { exact: true }).fill('Pauză');
  await stepDuration(page, 2, [0, 0, 5]);
  await dialog.getByRole('button', { name: 'Salvează orarul', exact: true }).click(); await page.clock.runFor(300);
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pornește orarul Un minut', exact: true })).toBeVisible();
  expect((await stored(page)).preferences).toMatchObject({ alertSoundId: 'bell', alertDurationSeconds: 60, haptics: false, keepAwake: false });
  await page.getByRole('tab', { name: 'Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Repornește temporizatorul', exact: true }).click();
  await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
  await page.getByRole('button', { name: 'Pornește orarul Un minut', exact: true }).click();
  const firstDeadline = (await stored(page)).planning.run!.deadlineAt!;
  await page.clock.runFor(1000); await expect.poll(() => playCount(page)).toBe(1);
  await page.clock.runFor(2000); await expect.poll(() => playCount(page)).toBe(2);
  expect((await stored(page)).planning.run).toMatchObject({ stepIndex: 1, deadlineAt: firstDeadline + 5000 });
  await page.clock.runFor(5000); await expect.poll(() => playCount(page)).toBe(3);
  expect((await stored(page)).planning.run?.status).toBe('completed');
  await page.clock.runFor(59999);
  await expect(page.getByRole('button', { name: 'Oprește sunetul', exact: true })).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.getByRole('button', { name: 'Oprește sunetul', exact: true })).not.toBeVisible();
  expect(await playCount(page)).toBe(3);
  const saved = await stored(page); expect(saved.stopwatch).toEqual(legacy.stopwatch); expect(saved.sessions).toEqual(legacy.sessions);
  await page.reload(); await expect.poll(async () => (await stored(page)).preferences.alertDurationSeconds).toBe(60);
  expect(await playCount(page)).toBe(0);
});
