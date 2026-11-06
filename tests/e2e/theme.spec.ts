import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { audioEvents, audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, settings, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

test('manual theme defaults light, survives rapid toggles and ignores OS appearance', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, false);
  await expect(page.getByRole('button', { name: 'Pornește', exact: true })).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  const dialog = await settings(page);
  await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const toggle = dialog.getByRole('switch', { name: 'Mod întunecat', exact: true });
  await expect(toggle).not.toBeChecked();
  for (let index = 0; index < 5; index++) await toggle.click();
  await expect(toggle).toBeChecked();
  await expectTheme(page, true);
  await expect(dialog).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  await page.reload();
  await expectTheme(page, true);
  await expect(page.getByRole('button', { name: 'Pornește', exact: true })).toHaveCSS('background-color', 'rgb(96, 165, 250)');
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

test('literal legacy-v1 clocks, history and false preferences survive the blue theme refresh', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await page.goto('/'); await expectTheme(page, true);
  const dialog = await settings(page);
  for (const name of ['Alerte sonore', 'Feedback tactil', 'Ecran mereu activ']) {
    await expect(dialog.getByRole('switch', { name, exact: true })).not.toBeChecked();
  }
  await dialog.getByRole('switch', { name: 'Mod întunecat', exact: true }).click();
  await expectTheme(page, false);
  await expect(dialog).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('tab', { name: 'Timer', exact: true }).click();
  await expect(page.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orar nou', exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('light');
  await page.reload(); await expectTheme(page, false);
  const restored = await stored(page);
  expect(restored.version).toBe(1);
  expect(restored.stopwatch).toEqual(legacy.stopwatch);
  expect(restored.timer).toEqual(legacy.timer);
  expect(restored.sessions).toEqual(legacy.sessions);
  expect(restored.planning).toEqual({ schedules: [], run: null });
  expect(restored.preferences).toEqual({ ...legacy.preferences, theme: 'light', alertSoundId: 'classic', alertDurationSeconds: 5 });
});

for (const owner of ['timer', 'planning']) for (const startup of ['pending', 'playing']) {
  test(`theme changes preserve a ${startup} ${owner} alert without canceling or replaying`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
    const data = initialData();
    data.planning.schedules = [{ id: 'short', name: 'Respirație', steps: [{ id: 'one', name: 'Respiră', durationMs: 1000 }] }];
    await seed(page, data); await audioSpy(page); await page.goto(owner === 'timer' ? '/timer' : '/planning');
    if (startup === 'pending') await page.evaluate(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        void play.call(this);
        return new Promise<void>((resolve) => Object.assign(window, { finishThemeAudio: resolve }));
      };
    });
    if (owner === 'timer') {
      await duration(page, '01');
      await page.getByRole('button', { name: 'Pornește temporizatorul', exact: true }).click();
    } else await page.getByRole('button', { name: 'Pornește orarul Respirație', exact: true }).click();
    const dialog = await settings(page); await page.clock.runFor(1000);
    await expect.poll(() => playCount(page)).toBe(1);
    const before = await stored(page); const events = await audioEvents(page);
    const toggle = dialog.getByRole('switch', { name: 'Mod întunecat', exact: true });
    for (const dark of [true, false]) { await toggle.click(); await expectTheme(page, dark); }
    expect(await audioEvents(page)).toEqual(events);
    expect((await stored(page)).timer).toEqual(before.timer);
    expect((await stored(page)).planning).toEqual(before.planning);
    expect((await stored(page)).stopwatch).toEqual(before.stopwatch);
    if (startup === 'pending') await page.evaluate(() => (window as unknown as { finishThemeAudio: () => void }).finishThemeAudio());
    await expect(dialog.getByRole('button', { name: 'Oprește sunetul', exact: true })).toBeVisible();
    await page.clock.runFor(4999);
    expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(0);
    await page.clock.runFor(1);
    await expect(dialog.getByRole('button', { name: 'Oprește sunetul', exact: true })).not.toBeVisible();
    expect(await playCount(page)).toBe(1);
    expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(1);
  });
}

for (const dark of [false, true]) for (const width of [320, 390, 430, 1024]) {
  test(`${dark ? 'dark' : 'light'} screens and sheets fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
    const data = initialData(); data.preferences.theme = dark ? 'dark' : 'light';
    data.stopwatch = { accumulatedMs: 3500, startedAt: null, laps: [{ number: 1, elapsedMs: 2000, splitMs: 2000 }, { number: 2, elapsedMs: 3500, splitMs: 1500 }] };
    data.sessions = [{ id: 'saved', savedAt: 1700000000000, durationMs: 4000, laps: data.stopwatch.laps }];
    const longName = 'Un orar pentru învățare și pauze cu un nume lung și lizibil pe telefon';
    data.planning.schedules = [{ id: 'long', name: longName, steps: [{ id: 'long-step', name: 'O acțiune cu un nume mai lung pentru a verifica afișarea pe telefon', durationMs: 300000 }] }];
    await seed(page, data); await page.goto('/');
    await expect(page.getByRole('button', { name: 'Continuă', exact: true })).toBeVisible();
    await expectTheme(page, dark);
    await page.getByRole('button', { name: 'Resetează cronometrul', exact: true }).click();
    await page.clock.runFor(300);
    const reset = page.getByRole('dialog', { name: 'Un nou început?', exact: true });
    await expect(reset).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await reset.getByRole('button', { name: 'Renunță', exact: true }).click();
    await page.clock.runFor(300);
    await expect(page.getByRole('tab')).toHaveCount(4);
    for (const name of ['Timer', 'Planificare', 'Istoric', 'Cronometru']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name, exact: true })).toHaveCSS('background-color', dark ? 'rgb(30, 58, 138)' : 'rgb(219, 234, 254)');
      if (name === 'Timer') {
        const input = page.getByLabel('Minute', { exact: true });
        await input.focus(); await expect(input).toBeFocused();
        await expect(input).toHaveCSS('color', dark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)');
        await expect(page.getByRole('button', { name: 'Resetează temporizatorul', exact: true })).toBeDisabled();
      }
      await page.screenshot({ path: `previews/blue-${dark ? 'dark' : 'light'}-${name}-${width}.png`, fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
    if (width === 320) await page.screenshot({ path: `previews/planning-${dark ? 'dark' : 'light'}-320.png`, fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: `Editează orarul ${longName}`, exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editează orarul', exact: true });
    await page.clock.runFor(300);
    await editor.getByLabel('Nume orar', { exact: true }).focus();
    await expect(editor.getByLabel('Nume orar', { exact: true })).toBeFocused();
    await expect(editor).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await expect(editor.getByLabel('Nume orar', { exact: true })).toHaveValue(longName);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) await page.screenshot({ path: `previews/planning-editor-${dark ? 'dark' : 'light'}-320.png`, fullPage: true, animations: 'disabled' });
    await editor.getByLabel('Nume orar', { exact: true }).fill(longName + '!');
    await editor.getByRole('button', { name: 'Închide', exact: true }).click();
    const discard = page.getByRole('dialog', { name: 'Renunți la modificări?', exact: true });
    await expect(discard).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await discard.getByRole('button', { name: 'Continuă editarea', exact: true }).click();
    await expect(editor.getByLabel('Nume orar', { exact: true })).toHaveValue(longName + '!');
    await editor.getByRole('button', { name: 'Închide', exact: true }).click();
    await discard.getByRole('button', { name: 'Renunță la modificări', exact: true }).click();
    await page.clock.runFor(300);
    await expect(editor).not.toBeVisible();
    expect((await stored(page)).planning.schedules[0].name).toBe(longName);
    await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
    await page.getByRole('button', { name: /^Sesiune / }).click();
    const details = page.getByRole('dialog', { name: 'Sesiunea ta.' });
    await page.clock.runFor(300);
    await expect(details).toBeVisible();
    await expect(details).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await details.getByRole('button', { name: 'Șterge sesiunea', exact: true }).click();
    await page.clock.runFor(300);
    const deletion = page.getByRole('dialog', { name: 'Ștergi sesiunea?' });
    await expect(deletion.getByRole('button', { name: 'Șterge sesiunea', exact: true })).toHaveCSS('background-color', dark ? 'rgb(69, 10, 10)' : 'rgb(254, 242, 242)');
    await expect(deletion).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await page.getByRole('button', { name: 'Renunță', exact: true }).click();
    await page.clock.runFor(300);
    await expect(page.getByRole('dialog', { name: 'Ștergi sesiunea?' })).not.toBeVisible();
    await expect(details).not.toBeVisible();
    const preferences = await settings(page);
    await page.clock.runFor(300);
    for (const name of ['Sunet Clasic', 'Durata sunetului 5 secunde']) {
      const selected = preferences.getByRole('radio', { name, exact: true });
      await expect(selected).toBeChecked();
      await expect(selected).toHaveCSS('background-color', dark ? 'rgb(30, 58, 138)' : 'rgb(219, 234, 254)');
    }
    await page.screenshot({ path: `previews/theme-${dark ? 'dark' : 'light'}-${width}.png`, fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const dark of [false, true]) for (const width of [320, 390, 430, 1024]) {
  test(`${dark ? 'dark' : 'light'} timing notices and confirmations fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
    const data = initialData(); data.preferences.theme = dark ? 'dark' : 'light';
    data.preferences.alertDurationSeconds = 15;
    data.planning.schedules = [
      { id: 'work', name: 'Concentrare', steps: [{ id: 'one', name: 'Învață în ritmul tău', durationMs: 60000 }, { id: 'two', name: 'Pauză', durationMs: 1000 }] },
      { id: 'rest', name: 'Relaxare', steps: [{ id: 'rest-one', name: 'Respiră', durationMs: 3000 }] },
    ];
    await seed(page, data); await audioSpy(page); await page.goto('/planning');
    await page.getByRole('button', { name: 'Pornește orarul Concentrare', exact: true }).click();
    await expect(page.getByLabel('Progres orar', { exact: true })).toContainText('Etapa 1/2');
    await expect(page.getByRole('button', { name: 'Editează orarul Concentrare', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Editează orarul Concentrare', exact: true })).toHaveCSS('opacity', '0.4');
    if (width === 320) await page.screenshot({ path: `previews/blue-run-${dark ? 'dark' : 'light'}.png`, fullPage: true, animations: 'disabled' });
    for (const [button, title] of [
      ['Resetează orarul', 'Resetezi orarul?'],
      ['Pornește orarul Relaxare', 'Înlocuiești orarul activ?'],
      ['Șterge orarul Relaxare', 'Ștergi orarul?'],
    ]) {
      const trigger = page.getByRole('button', { name: button, exact: true });
      await trigger.scrollIntoViewIfNeeded(); await trigger.click();
      const dialog = page.getByRole('dialog', { name: title, exact: true });
      await expect(dialog).toBeVisible(); await page.clock.runFor(300);
      await expect(dialog).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await dialog.getByRole('button', { name: 'Renunță', exact: true }).click(); await page.clock.runFor(300);
      await expect(dialog).not.toBeVisible();
    }
    await page.getByRole('tab', { name: 'Timer', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Timer', exact: true })).toHaveAttribute('aria-selected', 'true');
    for (const [name, value] of [['Ore', '00'], ['Minute', '00'], ['Secunde', '10']]) {
      const input = page.getByLabel(name, { exact: true });
      // Settle selectTextOnFocus before replacing a controlled value with the paused clock.
      await input.focus(); await page.clock.runFor(20); await input.fill(value);
      await expect(input).toHaveValue(value);
    }
    await page.getByLabel('Secunde', { exact: true }).blur();
    const start = page.getByRole('button', { name: 'Pornește temporizatorul', exact: true });
    await expect(start).toBeEnabled(); await start.click();
    await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click(); await page.clock.runFor(300);
    const reset = page.getByRole('dialog', { name: 'Resetezi temporizatorul?', exact: true });
    await expect(reset).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await reset.getByRole('button', { name: 'Renunță', exact: true }).click(); await page.clock.runFor(300);
    const dialog = await settings(page); await page.clock.runFor(10000);
    await expect(dialog.getByLabel('Temporizator finalizat', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
    const run = (await stored(page)).planning.run!;
    await page.clock.runFor(run.deadlineAt! - await page.evaluate(() => Date.now()));
    await expect(dialog.getByLabel('Etapă finalizată', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Oprește sunetul', exact: true })).toBeVisible();
    if (width === 320) await page.screenshot({ path: `previews/blue-notices-${dark ? 'dark' : 'light'}.png`, fullPage: true, animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
    await page.clock.runFor(1000);
    await expect(dialog.getByLabel('Orar finalizat', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Oprește sunetul', exact: true }).click();
    await dialog.getByRole('button', { name: 'Închide', exact: true }).click(); await page.clock.runFor(300);
    await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Repornește orarul', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) await page.screenshot({ path: `previews/blue-completed-${dark ? 'dark' : 'light'}.png`, fullPage: true, animations: 'disabled' });
  });
}
