import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { LANGUAGES, type AppLanguage } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { initialData } from '../../src/core/stopwatch';
import { startSchedule } from '../../src/core/planning';
import { audioEvents, audioSpy, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, stored } from './helpers';

test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

test('manual selection updates Settings and tabs, repeated choice is a no-op and last rapid choice persists', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => {
    Object.assign(window, { languageWrites: 0 });
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') (window as unknown as { languageWrites: number }).languageWrites++;
      return write.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Română', exact: true })).toBeChecked();
  await page.evaluate(() => { (window as unknown as { languageWrites: number }).languageWrites = 0; });
  const before = await stored(page);
  await page.getByRole('radio', { name: 'Română', exact: true }).click();
  expect(await stored(page)).toEqual(before);
  expect(await page.evaluate(() => (window as unknown as { languageWrites: number }).languageWrites)).toBe(0);
  for (const { id, label } of LANGUAGES) {
    await page.getByRole('radio', { name: label, exact: true }).click();
    const m = getMessages(id);
    await expect(page.getByRole('dialog', { name: m.settingsTitle, exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: m.planningTab, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', id);
    await expect(page.getByRole('radio', { name: label, exact: true })).toBeChecked();
  }
  for (const label of ['English', 'Română', 'Русский']) await page.getByRole('radio', { name: label, exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.language).toBe('ru');
  await page.reload();
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Русский', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

async function selectLanguage(page: Page, from: AppLanguage, to: AppLanguage) {
  await page.getByRole('button', { name: getMessages(from).settings, exact: true }).click();
  await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === to)!.label, exact: true }).click();
  const m = getMessages(to);
  const dialog = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
  await dialog.getByRole('button', { name: m.close, exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

for (const { id } of LANGUAGES) {
  test(`${id} legacy hydration, selected language, history sharing and reload preserve real saved data`, async ({ page }) => {
    const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
    await seed(page, legacy); await audioSpy(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (text: string) => { Object.assign(window, { sharedText: text }); },
      } });
    });
    await page.goto('/');
    await selectLanguage(page, 'ro', 'en');
    if (id !== 'en') await selectLanguage(page, 'en', id);
    const m = getMessages(id);
    await expectTheme(page, true);
    await expect(page.getByLabel(m.timerCompleted, { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
    const session = page.getByRole('button', { name: /00:02\.50/ });
    await session.click();
    const details = page.getByRole('dialog', { name: m.sessionTitle, exact: true });
    await details.getByRole('button', { name: m.shareResults, exact: true }).click();
    const text = await page.evaluate(() => (window as unknown as { sharedText: string }).sharedText);
    expect(text).toContain(m.shareTotal('00:02.50'));
    expect(text).toContain(m.shareLap(2, '00:01.20', '00:02.20'));
    await details.getByRole('button', { name: m.deleteSession, exact: true }).click();
    const confirm = page.getByRole('dialog', { name: m.deleteSessionTitle, exact: true });
    await confirm.getByRole('button', { name: m.cancel, exact: true }).click();
    await expect(session).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', id);
    await expect(page.getByRole('tab', { name: m.historyTab, exact: true })).toBeVisible();
    const saved = await stored(page);
    expect(saved.version).toBe(1);
    expect(saved.stopwatch).toEqual(legacy.stopwatch); expect(saved.timer).toEqual(legacy.timer);
    expect(saved.sessions).toEqual(legacy.sessions);
    expect(saved.preferences).toEqual({ ...legacy.preferences, language: id, alertSoundId: 'classic', alertDurationSeconds: 5 });
    expect(await playCount(page)).toBe(0);
  });

  test(`${id} stopwatch timer and planning flows retain controlled user text and confirmations`, async ({ page }) => {
    const data = initialData(); data.preferences.language = id; data.preferences.timerSound = false;
    let now = Date.now(); await page.clock.setFixedTime(now);
    await seed(page, data); await page.goto('/');
    const m = getMessages(id);
    await page.getByRole('button', { name: m.start, exact: true }).click();
    now += 1250; await page.clock.setFixedTime(now);
    await page.getByRole('button', { name: m.recordLap, exact: true }).click();
    now += 1000; await page.clock.setFixedTime(now);
    await page.getByRole('button', { name: m.pause, exact: true }).click();
    await page.getByRole('button', { name: m.resetStopwatch, exact: true }).click();
    await page.getByRole('dialog', { name: m.resetStopwatchTitle, exact: true }).getByRole('button', { name: m.cancel, exact: true }).click();
    const retainedStopwatch = (await stored(page)).stopwatch;
    expect(retainedStopwatch.accumulatedMs).toBe(2250);
    await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
    await page.getByLabel(m.timeUnits[0], { exact: true }).fill('99');
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeDisabled();
    await expect(page.getByText(m.durationInvalid, { exact: true })).toBeVisible();
    await page.getByLabel(m.timeUnits[0], { exact: true }).fill('00');
    await page.getByRole('button', { name: m.startTimer, exact: true }).click();
    await page.getByRole('button', { name: m.pauseTimer, exact: true }).click();
    const retainedTimer = (await stored(page)).timer;
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
    await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
    const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
    await expect(editor.getByRole('button', { name: m.saveSchedule, exact: true })).toBeDisabled();
    const name = 'Учёба · Școală'; const action = 'Respiră · Отдых';
    await editor.getByLabel(m.scheduleName, { exact: true }).fill(name);
    await editor.getByLabel(m.stepName(1), { exact: true }).fill(action);
    await editor.getByRole('button', { name: m.addStep, exact: true }).click();
    await expect(editor.getByLabel(m.stepName(2), { exact: true })).toHaveValue(m.stepNumber(2));
    await editor.getByRole('button', { name: m.moveStepUp(2), exact: true }).click();
    await expect(editor.getByLabel(m.stepName(2), { exact: true })).toHaveValue(action);
    await editor.getByRole('button', { name: m.moveStepDown(1), exact: true }).click();
    await editor.getByRole('button', { name: m.removeStep(2), exact: true }).click();
    await editor.getByRole('button', { name: m.close, exact: true }).click();
    await page.getByRole('dialog', { name: m.discardTitle, exact: true }).getByRole('button', { name: m.continueEditing, exact: true }).click();
    await expect(editor.getByLabel(m.scheduleName, { exact: true })).toHaveValue(name);
    await expect(editor.getByLabel(m.stepName(1), { exact: true })).toHaveValue(action);
    await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
    await expect(editor).not.toBeVisible();
    const template = (await stored(page)).planning.schedules[0];
    const next: AppLanguage = id === 'ru' ? 'en' : 'ru'; const n = getMessages(next);
    await selectLanguage(page, id, next);
    await page.getByRole('button', { name: n.editSchedule(name), exact: true }).click();
    const edit = page.getByRole('dialog', { name: n.editScheduleTitle, exact: true });
    await expect(edit.getByLabel(n.stepName(1), { exact: true })).toHaveValue(action);
    await edit.getByRole('button', { name: n.addStep, exact: true }).click();
    await expect(edit.getByLabel(n.stepName(2), { exact: true })).toHaveValue(n.stepNumber(2));
    await edit.getByRole('button', { name: n.close, exact: true }).click();
    await page.getByRole('button', { name: n.discardChanges, exact: true }).click();
    expect((await stored(page)).planning.schedules[0]).toEqual(template);
    await page.getByRole('button', { name: n.startSchedule(name), exact: true }).click();
    await expect(page.getByRole('button', { name: n.editSchedule(name), exact: true })).toBeDisabled();
    await page.getByRole('button', { name: n.pauseSchedule, exact: true }).click();
    await page.getByRole('button', { name: n.resumeSchedule, exact: true }).click();
    await page.getByRole('button', { name: n.resetSchedule, exact: true }).click();
    await page.getByRole('dialog', { name: n.resetScheduleTitle, exact: true }).getByRole('button', { name: n.resetSchedule, exact: true }).click();
    await page.getByRole('button', { name: n.deleteSchedule(name), exact: true }).click();
    await page.getByRole('dialog', { name: n.deleteScheduleTitle, exact: true }).getByRole('button', { name: n.deleteScheduleConfirm, exact: true }).click();
    const saved = await stored(page);
    expect(saved.planning.schedules).toEqual([]);
    expect(saved.stopwatch).toEqual(retainedStopwatch); expect(saved.timer).toEqual(retainedTimer);
  });
}

for (const [locale, language] of [['en-GB', undefined], ['ru-RU', 'unsupported']] as const) {
  test.describe(`browser ${locale} with ${language ?? 'missing'} saved language`, () => {
    test.use({ locale });
    test('defaults to Romanian independently of browser language and other preferences', async ({ page }) => {
      await seed(page, { ...initialData(), preferences: { haptics: false, theme: 'dark', language } });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
      await expect(page.getByRole('button', { name: 'Pornește', exact: true })).toBeVisible();
      await expectTheme(page, true);
    });
  });
}

test('translated web share payloads handle cancellation and show real failures without altering history', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en';
  data.sessions = [{ id: 's', savedAt: 1700000000000, durationMs: 2500, laps: [] }];
  await seed(page, data);
  await page.addInitScript(() => {
    Object.assign(window, { shareMode: 'success' });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload: ShareData) => {
      const state = window as unknown as { shareMode: string; sharePayload: ShareData };
      state.sharePayload = payload;
      if (state.shareMode !== 'success') throw new DOMException('Sharing failed', state.shareMode === 'cancel' ? 'AbortError' : 'NotAllowedError');
    } });
  });
  await page.goto('/history');
  await page.getByRole('button', { name: /00:02\.50/ }).click();
  const share = page.getByRole('button', { name: 'Share results', exact: true });
  await share.click();
  expect(await page.evaluate(() => (window as unknown as { sharePayload: ShareData }).sharePayload)).toMatchObject({ title: 'CRONO session', text: expect.stringContaining('Total time: 00:02.50') });
  await page.evaluate(() => Object.assign(window, { shareMode: 'cancel' })); await share.click();
  await expect(page.getByText('Sharing is unavailable right now.', { exact: true })).toHaveCount(0);
  await page.evaluate(() => Object.assign(window, { shareMode: 'error' })); await share.click();
  await expect(page.getByText('Sharing is unavailable right now.', { exact: true })).toBeVisible();
  expect((await stored(page)).sessions).toEqual(data.sessions);
});

async function timingFixture(page: Page) {
  const now = Date.parse('2026-11-06T10:00:01Z');
  await page.clock.install({ time: new Date(now - 1000) }); await page.clock.pauseAt(new Date(now));
  const data = initialData(); data.stopwatch.startedAt = now;
  data.timer = { status: 'running', durationMs: 5000, remainingMs: 5000, deadlineAt: now + 5000, runId: 'language-timer' };
  data.planning.schedules = [{ id: 'study', name: 'Учёба · Studiu', steps: [
    { id: 'a', name: 'Lucru', durationMs: 3000 }, { id: 'b', name: 'Pauză', durationMs: 4000 },
  ] }];
  data.planning = startSchedule(data.planning, 'study', now, 'language-schedule');
  const wav = readFileSync(new URL('../../assets/audio/timer-complete.wav', import.meta.url));
  await page.route(/timer-complete[^/]*\.wav/, (route) => route.fulfill({ contentType: 'audio/wav', body: wav }));
  await seed(page, data); await audioSpy(page); await page.goto('/');
  return data;
}

test('language changes at live boundaries preserve three independent clocks and one playback per event', async ({ page }) => {
  const data = await timingFixture(page);
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: getMessages('en').settingsTitle, exact: true });
  const saved = await stored(page);
  expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.timer).toEqual(data.timer); expect(saved.planning).toEqual(data.planning);
  await page.clock.runFor(2999);
  await page.getByRole('radio', { name: 'Русский', exact: true }).click();
  expect(await playCount(page)).toBe(0);
  await page.clock.runFor(1);
  dialog = page.getByRole('dialog', { name: getMessages('ru').settingsTitle, exact: true });
  await expect(dialog.getByLabel(getMessages('ru').stepCompleted, { exact: true })).toBeVisible();
  await expect.poll(() => playCount(page)).toBe(1);
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  dialog = page.getByRole('dialog', { name: getMessages('en').settingsTitle, exact: true });
  await expect(dialog.getByLabel(getMessages('en').stepCompleted, { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(1);
  expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(0);
  await page.clock.runFor(2000);
  await expect(dialog.getByLabel(getMessages('en').timerCompleted, { exact: true })).toBeVisible();
  await expect.poll(() => playCount(page)).toBe(2);
  await page.getByRole('radio', { name: 'Русский', exact: true }).click();
  await page.clock.runFor(2000);
  dialog = page.getByRole('dialog', { name: getMessages('ru').settingsTitle, exact: true });
  await expect(dialog.getByLabel(getMessages('ru').scheduleCompleted, { exact: true })).toBeVisible();
  await expect.poll(() => playCount(page)).toBe(3);
  const result = await stored(page);
  expect(result.timer).toMatchObject({ status: 'completed', runId: 'language-timer' });
  expect(result.planning.run).toMatchObject({ status: 'completed', runId: 'language-schedule', stepIndex: 1 });
  expect(result.planning.schedules).toEqual(data.planning.schedules); expect(result.stopwatch).toEqual(data.stopwatch);
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  expect(await playCount(page)).toBe(3);
});

test('selected language survives silent background catch-up without replaying expired alerts', async ({ page }) => {
  const data = await timingFixture(page);
  await selectLanguage(page, 'ro', 'ru');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(10000);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await stored(page)).timer.status).toBe('completed');
  await expect.poll(async () => (await stored(page)).planning.run?.status).toBe('completed');
  await expect(page.getByLabel(getMessages('ru').timerCompleted, { exact: true })).toBeVisible();
  await expect(page.getByLabel(getMessages('ru').scheduleCompleted, { exact: true })).toBeVisible();
  expect(await playCount(page)).toBe(0);
  expect((await stored(page)).stopwatch).toEqual(data.stopwatch);
});

test('changing language relabels an existing toast without extending its lifetime', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T10:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-06T10:00:01Z'));
  const data = initialData(); data.stopwatch.accumulatedMs = 1500;
  await seed(page, data); await page.goto('/');
  await page.getByRole('button', { name: 'Salvează sesiunea', exact: true }).click();
  await expect(page.getByText(getMessages('ro').sessionSaved, { exact: true })).toBeVisible();
  await page.clock.runFor(2000);
  await selectLanguage(page, 'ro', 'ru');
  await expect(page.getByText(getMessages('ru').sessionSaved, { exact: true })).toBeVisible();
  await page.clock.runFor(1499);
  await expect(page.getByText(getMessages('ru').sessionSaved, { exact: true })).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.getByText(getMessages('ru').sessionSaved, { exact: true })).toHaveCount(0);
  expect((await stored(page)).sessions).toHaveLength(1);
});

test('existing preview failure translates in its sheet and retains the original feedback deadline', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T10:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-06T10:00:01Z'));
  const wav = readFileSync(new URL('../../assets/audio/timer-complete.wav', import.meta.url));
  await page.route(/timer-complete[^/]*\.wav/, (route) => route.fulfill({ contentType: 'audio/wav', body: wav }));
  await seed(page); await audioSpy(page, true); await page.goto('/');
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await page.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
  await expect(page.getByText(getMessages('ro').soundUnavailable, { exact: true })).toBeVisible();
  await page.clock.runFor(2000);
  await page.getByRole('radio', { name: 'Русский', exact: true }).click();
  await expect(page.getByText(getMessages('ru').soundUnavailable, { exact: true })).toBeVisible();
  await page.clock.runFor(1499);
  await expect(page.getByText(getMessages('ru').soundUnavailable, { exact: true })).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.getByText(getMessages('ru').soundUnavailable, { exact: true })).toHaveCount(0);
  expect(await playCount(page)).toBe(1);
});

async function expectControlsFit(page: Page) {
  const controls = page.getByRole('button').or(page.getByRole('radio')).or(page.getByRole('tab'));
  for (const control of await controls.all()) {
    if (!await control.isVisible()) continue;
    const result = await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label') ?? element.textContent, width: rect.width, height: rect.height,
        left: rect.left, right: rect.right, viewport: window.innerWidth, overflow: element.scrollWidth - element.clientWidth };
    });
    expect(result.width, String(result.label)).toBeGreaterThanOrEqual(44);
    expect(result.height, String(result.label)).toBeGreaterThanOrEqual(44);
    expect(result.left, String(result.label)).toBeGreaterThanOrEqual(-1);
    expect(result.right, String(result.label)).toBeLessThanOrEqual(result.viewport + 1);
    expect(result.overflow, String(result.label)).toBeLessThanOrEqual(1);
  }
}

const layouts = LANGUAGES.flatMap(({ id }) => ['light', 'dark'].map((theme) => ({ id, theme: theme as 'light' | 'dark', width: 390 })))
  .concat([320, 430, 1024].flatMap((width) => ['light', 'dark'].map((theme) => ({ id: 'ru' as const, theme: theme as 'light' | 'dark', width }))));
for (const { id, theme, width } of layouts) {
  test(`layout ${id} ${theme} ${width}px keeps controls labels dialogs and notices usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const data = initialData(); data.preferences.language = id; data.preferences.theme = theme;
    data.timer = { status: 'completed', durationMs: 1000, remainingMs: 0, deadlineAt: null, runId: 'layout' };
    const wav = readFileSync(new URL('../../assets/audio/timer-complete.wav', import.meta.url));
    await page.route(/timer-complete[^/]*\.wav/, (route) => route.fulfill({ contentType: 'audio/wav', body: wav }));
    await seed(page, data); await audioSpy(page); await page.goto('/');
    const m = getMessages(id); const prefix = `previews/i18n-${id}-${theme}-${width}`;
    await expect(page.getByRole('button', { name: m.start, exact: true })).toBeVisible();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-shell.png`, animations: 'disabled' });
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    const settings = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
    await expect(settings.getByRole('radio', { name: LANGUAGES.find((item) => item.id === id)!.label, exact: true })).toBeChecked();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-settings.png`, animations: 'disabled' });
    await settings.getByRole('button', { name: m.preview, exact: true }).click();
    await expect(settings.getByRole('button', { name: m.stopSound, exact: true })).toBeVisible();
    await expectControlsFit(page);
    await settings.getByRole('button', { name: m.stopSound, exact: true }).click();
    await settings.getByText(m.historyLimit, { exact: true }).scrollIntoViewIfNeeded();
    await expect(settings.getByText(m.privacy, { exact: true })).toBeVisible();
    await settings.getByRole('button', { name: m.close, exact: true }).click();
    await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
    await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
    const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
    await editor.getByLabel(m.scheduleName, { exact: true }).fill('Учёба · Școală');
    await editor.getByRole('button', { name: m.addStep, exact: true }).click();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-editor.png`, animations: 'disabled' });
    await editor.getByLabel(m.stepName(2), { exact: true }).scrollIntoViewIfNeeded();
    await expect(editor.getByLabel(m.stepField(m.timeUnits[2], 2), { exact: true })).toHaveValue('00');
    await editor.getByRole('button', { name: m.close, exact: true }).click();
    const discard = page.getByRole('dialog', { name: m.discardTitle, exact: true });
    await expect(discard.getByText(m.discardHelp, { exact: true })).toBeVisible();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-confirmation.png`, animations: 'disabled' });
    await discard.getByRole('button', { name: m.continueEditing, exact: true }).click();
    await expect(editor.getByLabel(m.scheduleName, { exact: true })).toHaveValue('Учёба · Școală');
  });
}
