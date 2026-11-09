import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { startSchedule } from '../../src/core/planning';
import { initialTimer } from '../../src/core/timer';
import { getMessages } from '../../src/i18n';
import { selectTheme, selectWheel, settingsGroup, scheduleOptions, audioEvents, audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, settings, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

type ThemeMediaProbe = { blocked: boolean; received: number; suppressed: number; delivered: number; writtenThemes: string[] };
async function observeMissedThemeEvents(page: Page) {
  await page.addInitScript(() => {
    const probe: ThemeMediaProbe = { blocked: false, received: 0, suppressed: 0, delivered: 0, writtenThemes: [] };
    Object.assign(window, { themeMediaProbe: probe });
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const media = matchMedia(query);
      if (query !== '(prefers-color-scheme: dark)') return media;
      const add = media.addEventListener.bind(media), remove = media.removeEventListener.bind(media);
      add('change', () => { probe.received++; });
      const listeners = new Map<EventListenerOrEventListenerObject, EventListener>();
      const wrapped = (listener: EventListenerOrEventListenerObject) => {
        let callback = listeners.get(listener);
        if (!callback) {
          callback = (event) => {
            if (probe.blocked) { probe.suppressed++; return; }
            probe.delivered++;
            if (typeof listener === 'function') listener.call(media, event); else listener.handleEvent(event);
          };
          listeners.set(listener, callback);
        }
        return callback;
      };
      Object.defineProperties(media, {
        addListener: { value: (listener: Parameters<MediaQueryList['addListener']>[0]) => { if (listener) add('change', wrapped(listener as EventListener)); } },
        removeListener: { value: (listener: Parameters<MediaQueryList['removeListener']>[0]) => { if (listener) remove('change', listeners.get(listener as EventListener) ?? listener as EventListener); } },
        addEventListener: { value: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
          if (listener) add(type, type === 'change' ? wrapped(listener) : listener, options);
        } },
        removeEventListener: { value: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => {
          if (listener) remove(type, type === 'change' ? listeners.get(listener) ?? listener : listener, options);
        } },
      });
      return media;
    };
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') probe.writtenThemes.push(JSON.parse(value).preferences.theme);
      return write.call(this, key, value);
    };
  });
}

for (const [preference, initial, next] of [
  ['system', 'light', 'dark'], ['system', 'dark', 'light'],
  ['light', 'light', 'dark'], ['dark', 'dark', 'light'],
] as const) test(`${preference} refresh after a missed ${initial}-to-${next} browser event preserves clocks and drafts`, async ({ page }) => {
  const m = getMessages('ro'), now = Date.parse('2026-11-09T12:00:00Z');
  await page.clock.install({ time: now }); await page.clock.pauseAt(now + 1000);
  const data = initialData(); data.preferences.theme = preference; data.stopwatch.startedAt = now - 2000;
  data.timer = { ...initialTimer(600000), status: 'running', deadlineAt: now + 600000, runId: 'foreground-timer' };
  data.planning.schedules = [{ id: 'foreground', name: 'Existing schedule', steps: [{ id: 'work', name: 'Keep working', durationMs: 600000 }] }];
  data.planning = startSchedule(data.planning, 'foreground', now, 'foreground-planning');
  await observeMissedThemeEvents(page); await seed(page, data); await page.emulateMedia({ colorScheme: initial });
  await page.goto('/planning'); await expectTheme(page, initial === 'dark');
  await page.getByRole('button', { name: m.newSchedule, exact: true }).click(); await page.clock.runFor(300);
  const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
  const name = editor.getByRole('textbox', { name: m.scheduleName, exact: true }); await name.fill('Foreground · Учёба');
  await editor.getByRole('textbox', { name: m.stepName(1), exact: true }).fill('Unsaved action');
  await editor.getByRole('button', { name: m.editStepDuration(1), exact: true }).click(); await page.clock.runFor(300);
  const panel = page.getByRole('dialog', { name: m.durationPickerTitle(1), exact: true });
  const minutes = panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[1], 1), exact: true });
  await selectWheel(minutes, 2); await minutes.focus();
  const before = await stored(page), readProbe = () => page.evaluate(() => (window as unknown as { themeMediaProbe: ThemeMediaProbe }).themeMediaProbe);
  await page.evaluate(() => {
    const probe = (window as unknown as { themeMediaProbe: ThemeMediaProbe }).themeMediaProbe;
    probe.blocked = true; probe.writtenThemes = [];
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await readProbe()).writtenThemes).toEqual([preference]);
  const delivered = (await readProbe()).delivered;
  await page.emulateMedia({ colorScheme: next });
  await expect.poll(async () => (await readProbe()).suppressed).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.matchMedia('(prefers-color-scheme: dark)').matches)).toBe(next === 'dark');
  await expectTheme(page, initial === 'dark'); expect((await readProbe()).delivered).toBe(delivered);
  expect(await stored(page)).toEqual(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const dark = (preference === 'system' ? next : preference) === 'dark';
  await expectTheme(page, dark);
  await expect(panel.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
  await expect(minutes).toBeFocused(); await expect(minutes).toHaveAttribute('aria-valuenow', '2');
  expect((await readProbe()).delivered).toBe(delivered); expect((await readProbe()).writtenThemes).toEqual([preference]);
  expect(await stored(page)).toEqual(before);
  await panel.getByRole('button', { name: m.applyDuration, exact: true }).click(); await page.clock.runFor(300);
  await expect(name).toHaveValue('Foreground · Учёба');
  await expect(editor.getByRole('textbox', { name: m.stepName(1), exact: true })).toHaveValue('Unsaved action');
  expect(await stored(page)).toEqual(before);
  await page.evaluate(() => { (window as unknown as { themeMediaProbe: ThemeMediaProbe }).themeMediaProbe.blocked = false; });
  await page.emulateMedia({ colorScheme: initial }); await expectTheme(page, initial === 'dark');
  await expect.poll(async () => (await readProbe()).delivered).toBeGreaterThan(delivered);
  expect((await readProbe()).writtenThemes).toEqual([preference]); expect(await stored(page)).toEqual(before);
});

for (const colorScheme of ['light', 'dark'] as const) test(`fresh System follows ${colorScheme} and live changes without preference writes`, async ({ page }) => {
  await page.emulateMedia({ colorScheme }); await page.goto('/'); await expectTheme(page, colorScheme === 'dark');
  const dialog = await settings(page, 'appearance');
  await expect(dialog.getByRole('radio', { name: 'Sistem', exact: true })).toBeChecked();
  const before = await page.evaluate(() => localStorage.getItem('@crono/app-v1'));
  await page.evaluate(() => {
    Object.assign(window, { themeWrites: 0 }); const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') (window as unknown as { themeWrites: number }).themeWrites++;
      return write.call(this, key, value);
    };
  });
  await page.emulateMedia({ colorScheme: colorScheme === 'dark' ? 'light' : 'dark' });
  await expectTheme(page, colorScheme !== 'dark');
  await expect(dialog.getByTestId('sheet-surface')).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
  await selectTheme(dialog, 'system');
  expect(await page.evaluate(() => localStorage.getItem('@crono/app-v1'))).toBe(before);
  expect(await page.evaluate(() => (window as unknown as { themeWrites: number }).themeWrites)).toBe(0);
  await selectTheme(dialog, colorScheme); await selectTheme(dialog, 'system');
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('system');
  await page.reload(); await expectTheme(page, colorScheme !== 'dark');
  await settings(page, 'appearance');
  await expect(page.getByRole('radio', { name: 'Sistem', exact: true })).toBeChecked();
});

for (const manual of ['light', 'dark'] as const) test(`saved ${manual} yields to the current system immediately when System is selected`, async ({ page }) => {
  const data = initialData(); data.preferences.theme = manual;
  const system = manual === 'dark' ? 'light' : 'dark';
  await seed(page, data); await page.emulateMedia({ colorScheme: system }); await page.goto('/');
  await expectTheme(page, manual === 'dark');
  const dialog = await settings(page, 'appearance'); await selectTheme(dialog, 'system');
  await expectTheme(page, system === 'dark');
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('system');
  await page.emulateMedia({ colorScheme: manual }); await expectTheme(page, manual === 'dark');
  await page.reload(); await expectTheme(page, manual === 'dark');
  expect((await stored(page)).preferences.theme).toBe('system');
});

for (const invalid of [false, true]) test(`${invalid ? 'invalid' : 'missing'} legacy theme restores System without dropping real saved data`, async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  if (invalid) legacy.preferences.theme = 'DARK'; else delete legacy.preferences.theme;
  await seed(page, legacy); await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/'); await expectTheme(page, true);
  await settings(page, 'appearance'); await expect(page.getByRole('radio', { name: 'Sistem', exact: true })).toBeChecked();
  await selectTheme(page, 'light'); await selectTheme(page, 'system');
  const restored = await stored(page);
  expect(restored.preferences.theme).toBe('system'); expect(restored.preferences.timerSound).toBe(false);
  expect(restored.preferences.haptics).toBe(false); expect(restored.preferences.keepAwake).toBe(false);
  expect(restored.stopwatch).toEqual(legacy.stopwatch); expect(restored.timer).toEqual(legacy.timer); expect(restored.sessions).toEqual(legacy.sessions);
});

test('failed storage hydration keeps theme choices read-only while appearance remains usable', async ({ page }) => {
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === '@crono/app-v1') throw Error('test read failure');
      return read.call(this, key);
    };
  });
  await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/'); await expectTheme(page, true);
  const dialog = await settings(page, 'appearance');
  await expect(dialog.getByRole('radio')).toHaveCount(3);
  for (const radio of await dialog.getByRole('radio').all()) await expect(radio).toBeDisabled();
  await page.emulateMedia({ colorScheme: 'light' }); await expectTheme(page, false);
  await dialog.getByRole('button', { name: 'Închide', exact: true }).click(); await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Închide avertizarea de salvare', exact: true })).toBeVisible();
});

test('manual theme choices survive rapid selections and ignore OS appearance', async ({ page }) => {
  const data = initialData(); data.preferences.theme = 'light';
  await seed(page, data); await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/'); await expectTheme(page, false);
  await expect(page.getByRole('button', { name: 'Pornește', exact: true })).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  const dialog = await settings(page, 'appearance');
  await expect(dialog.getByTestId('sheet-surface')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  for (let index = 0; index < 5; index++) await selectTheme(dialog, index % 2 === 0 ? 'dark' : 'light');
  await expectTheme(page, true);
  await expect(dialog.getByTestId('sheet-surface')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  await page.reload(); await expectTheme(page, true);
  await page.emulateMedia({ colorScheme: 'light' }); await expectTheme(page, true);
  await settings(page, 'appearance'); await selectTheme(page, 'light');
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('light');
  await page.reload(); await expectTheme(page, false);
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
  await settings(page, 'appearance');
  await selectTheme(page, 'dark');
  await page.clock.setFixedTime(now + 4000);
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.getByLabel('Timp total 00:04.00')).toBeVisible();
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  await page.reload();
  await expectTheme(page, true);
  expect((await stored(page)).stopwatch).toEqual(before);
  expect((await stored(page)).sessions).toEqual(data.sessions);
  await page.getByRole('button', { name: 'Pauză', exact: true }).click();
  await settings(page, 'appearance');
  await selectTheme(page, 'light');
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.getByLabel('Timp total 00:04.00')).toBeVisible();
  await page.getByRole('button', { name: 'Resetează cronometrul', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Un nou început?' })).toBeVisible();
});

test('literal legacy-v1 clocks, history and false preferences survive the blue theme refresh', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  await seed(page, legacy); await page.goto('/'); await expectTheme(page, true);
  const dialog = await settings(page, 'sounds');
  await expect(dialog.getByRole('switch', { name: 'Alerte sonore', exact: true })).not.toBeChecked();
  await settingsGroup(page, 'device');
  for (const name of ['Feedback tactil', 'Ecran mereu activ']) await expect(dialog.getByRole('switch', { name, exact: true })).not.toBeChecked();
  await settingsGroup(page, 'appearance');
  await selectTheme(dialog, 'light');
  await expectTheme(page, false);
  await expect(dialog.getByTestId('sheet-surface')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
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
  expect(restored.preferences).toEqual({ ...legacy.preferences, systemNotifications: true, language: 'ro', theme: 'light', alertSoundId: 'classic', alertDurationSeconds: 60 });
});

for (const source of ['manual', 'system']) for (const owner of ['timer', 'planning']) for (const startup of ['pending', 'playing']) {
  test(`${source} theme changes preserve a ${startup} ${owner} alert without canceling or replaying`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-05T10:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-05T10:00:01Z'));
    const data = initialData();
    data.preferences.theme = source === 'system' ? 'system' : 'light';
    await page.emulateMedia({ colorScheme: 'light' });
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
    const dialog = await settings(page, 'appearance'); await page.clock.runFor(1000);
    await expect.poll(() => playCount(page)).toBe(1);
    const before = await stored(page); const events = await audioEvents(page);
    for (const dark of [true, false]) {
      if (source === 'system') await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
      else await selectTheme(dialog, dark ? 'dark' : 'light');
      await expectTheme(page, dark);
    }
    expect(await audioEvents(page)).toEqual(events);
    expect((await stored(page)).timer).toEqual(before.timer);
    expect((await stored(page)).planning).toEqual(before.planning);
    expect((await stored(page)).stopwatch).toEqual(before.stopwatch);
    if (source === 'system') expect((await stored(page)).preferences).toEqual(before.preferences);
    if (startup === 'pending') await page.evaluate(() => (window as unknown as { finishThemeAudio: () => void }).finishThemeAudio());
    await expect(dialog.getByRole('button', { name: 'Oprește sunetul', exact: true })).toBeVisible();
    await page.clock.runFor(59999);
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
    await expect(reset.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await reset.getByRole('button', { name: 'Renunță', exact: true }).click();
    await page.clock.runFor(300);
    // Browser CSS dismissal outlives the fake JS clock; its focus trap must be gone.
    await expect(reset).not.toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(4);
    for (const name of ['Timer', 'Planificare', 'Istoric', 'Cronometru']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name, exact: true })).toHaveCSS('background-color', dark ? 'rgb(30, 58, 138)' : 'rgb(219, 234, 254)');
      if (name === 'Timer') {
        const wheel = page.getByRole('spinbutton', { name: 'Minute', exact: true });
        await wheel.focus(); await expect(wheel).toBeFocused();
        const selected = wheel.locator('button').nth(Number(await wheel.getAttribute('aria-valuenow')));
        await expect(selected).toHaveCSS('color', dark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)');
        await expect(page.getByRole('button', { name: 'Resetează temporizatorul', exact: true })).toBeDisabled();
      }
      await page.screenshot({ path: `previews/blue-${dark ? 'dark' : 'light'}-${name}-${width}.png`, fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole('tab', { name: 'Planificare', exact: true }).click();
    if (width === 320) await page.screenshot({ path: `previews/planning-${dark ? 'dark' : 'light'}-320.png`, fullPage: true, animations: 'disabled' });
    await scheduleOptions(page, longName);
    await page.getByRole('button', { name: `Editează orarul ${longName}`, exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editează orarul', exact: true });
    await page.clock.runFor(300);
    await editor.getByLabel('Nume orar', { exact: true }).focus();
    await expect(editor.getByLabel('Nume orar', { exact: true })).toBeFocused();
    await expect(editor.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await expect(editor.getByLabel('Nume orar', { exact: true })).toHaveValue(longName);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) await page.screenshot({ path: `previews/planning-editor-${dark ? 'dark' : 'light'}-320.png`, fullPage: true, animations: 'disabled' });
    await editor.getByLabel('Nume orar', { exact: true }).fill(longName + '!');
    await editor.getByRole('button', { name: 'Închide', exact: true }).click();
    const discard = page.getByRole('dialog', { name: 'Renunți la modificări?', exact: true });
    await expect(discard.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
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
    await expect(details.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await details.getByRole('button', { name: 'Șterge sesiunea', exact: true }).click();
    await page.clock.runFor(300);
    const deletion = page.getByRole('dialog', { name: 'Ștergi sesiunea?' });
    await expect(deletion.getByRole('button', { name: 'Șterge sesiunea', exact: true })).toHaveCSS('background-color', dark ? 'rgb(69, 10, 10)' : 'rgb(254, 242, 242)');
    await expect(deletion.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await page.getByRole('button', { name: 'Renunță', exact: true }).click();
    await page.clock.runFor(300);
    await expect(page.getByRole('dialog', { name: 'Ștergi sesiunea?' })).not.toBeVisible();
    await expect(details).not.toBeVisible();
    const preferences = await settings(page, 'sounds');
    await page.clock.runFor(300);
    for (const name of ['Sunet Clasic', 'Durata sunetului 60 secunde']) {
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
    await scheduleOptions(page, 'Concentrare');
    await expect(page.getByRole('button', { name: 'Editează orarul Concentrare', exact: true })).toBeDisabled();
    await scheduleOptions(page, 'Concentrare');
    await expect(page.getByRole('button', { name: 'Editează orarul Concentrare', exact: true })).toHaveCSS('opacity', '0.45');
    if (width === 320) await page.screenshot({ path: `previews/blue-run-${dark ? 'dark' : 'light'}.png`, fullPage: true, animations: 'disabled' });
    for (const [button, title] of [
      ['Resetează orarul', 'Resetezi orarul?'],
      ['Pornește orarul Relaxare', 'Înlocuiești orarul activ?'],
      ['Șterge orarul Relaxare', 'Ștergi orarul?'],
    ]) {
      if (button.startsWith('Șterge orarul ')) await scheduleOptions(page, 'Relaxare');
      const trigger = page.getByRole('button', { name: button, exact: true });
      await trigger.scrollIntoViewIfNeeded(); await trigger.click();
      const dialog = page.getByRole('dialog', { name: title, exact: true });
      await expect(dialog).toBeVisible(); await page.clock.runFor(300);
      await expect(dialog.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await dialog.getByRole('button', { name: 'Renunță', exact: true }).click(); await page.clock.runFor(300);
      await expect(dialog).not.toBeVisible();
    }
    await page.getByRole('tab', { name: 'Timer', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Timer', exact: true })).toHaveAttribute('aria-selected', 'true');
    await duration(page, '10');
    const start = page.getByRole('button', { name: 'Pornește temporizatorul', exact: true });
    await expect(start).toBeEnabled(); await start.click();
    await page.getByRole('button', { name: 'Resetează temporizatorul', exact: true }).click(); await page.clock.runFor(300);
    const reset = page.getByRole('dialog', { name: 'Resetezi temporizatorul?', exact: true });
    await expect(reset.getByTestId('sheet-surface')).toHaveCSS('background-color', dark ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)');
    await reset.getByRole('button', { name: 'Renunță', exact: true }).click(); await page.clock.runFor(300);
    const dialog = await settings(page, 'appearance'); await page.clock.runFor(10000);
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
