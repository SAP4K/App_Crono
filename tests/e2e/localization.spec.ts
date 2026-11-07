import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { LANGUAGES, type AppLanguage } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { initialData } from '../../src/core/stopwatch';
import { startSchedule } from '../../src/core/planning';
import { audioEvents, audioSpy, duration, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, stored } from './helpers';

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
  const languageRadios = page.getByRole('radio', { name: /^(English|Español|Français|Русский|Deutsch|Română)$/ });
  await expect(languageRadios).toHaveText(['English', 'Español', 'Français', 'Русский', 'Deutsch', 'Română']);
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
  for (const label of ['Español', 'Français', 'Deutsch', 'Français', 'Español', 'Deutsch']) await page.getByRole('radio', { name: label, exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.language).toBe('de');
  await page.evaluate(() => { (window as unknown as { languageWrites: number }).languageWrites = 0; });
  const final = await stored(page);
  await page.getByRole('radio', { name: 'Deutsch', exact: true }).click();
  expect(await stored(page)).toEqual(final);
  expect(await page.evaluate(() => (window as unknown as { languageWrites: number }).languageWrites)).toBe(0);
  await page.reload();
  await page.getByRole('button', { name: getMessages('de').settings, exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Deutsch', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
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
    const fixture = new URL('../fixtures/app-v1-before-planning.json', import.meta.url);
    const raw = readFileSync(fixture, 'utf8'); const legacy = JSON.parse(raw);
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
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    const preferences = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
    const theme = preferences.getByRole('switch', { name: m.darkMode, exact: true });
    await theme.click(); await expectTheme(page, false);
    await theme.click(); await expectTheme(page, true);
    await preferences.getByRole('button', { name: m.close, exact: true }).click();
    await expect(preferences).not.toBeVisible();
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
    expect(saved.preferences).toEqual({ ...legacy.preferences, systemNotifications: true, language: id, alertSoundId: 'classic', alertDurationSeconds: 5 });
    expect(await playCount(page)).toBe(0);
    expect(readFileSync(fixture, 'utf8')).toBe(raw);
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
    await duration(page, '00', m);
    await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeDisabled();
    await expect(page.getByText(m.durationInvalid, { exact: true })).toBeVisible();
    await duration(page, '01', m);
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
    const next = ({ ro: 'ru', en: 'ru', ru: 'en', es: 'fr', fr: 'de', de: 'es' } as const)[id]; const n = getMessages(next);
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
    const pausedRun = (await stored(page)).planning.run;
    await selectLanguage(page, next, id);
    expect((await stored(page)).planning.run).toEqual(pausedRun);
    await selectLanguage(page, id, next);
    expect((await stored(page)).planning.run).toEqual(pausedRun);
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

for (const [locale, language] of [['en-GB', undefined], ['ru-RU', 'unsupported'], ['es-ES', undefined], ['fr-FR', 'FR'], ['de-DE', 'de-DE']] as const) {
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

test('mounted unsaved draft retains mixed text and clocks through all new language updates', async ({ page }) => {
  const data = await timingFixture(page);
  const original = getMessages('ro');
  await page.getByRole('tab', { name: original.planningTab, exact: true }).click();
  await page.getByRole('button', { name: original.newSchedule, exact: true }).click();
  let editor = page.getByRole('dialog', { name: original.newSchedule, exact: true });
  const name = 'École · Español · Übung · Учёба · Școală';
  await editor.getByLabel(original.scheduleName, { exact: true }).fill(name);
  await editor.getByLabel(original.stepName(1), { exact: true }).fill(name);
  let previous = original;
  const names = [name];
  for (const id of ['es', 'fr', 'de'] as const) {
    // Modal stacking blocks Settings gestures during editing. Dispatch the real
    // controls to exercise accepted context updates without adding a test store.
    await page.getByRole('button', { name: previous.settings, exact: true, includeHidden: true }).dispatchEvent('click');
    await page.getByRole('radio', { name: LANGUAGES.find((item) => item.id === id)!.label, exact: true, includeHidden: true }).dispatchEvent('click');
    const m = getMessages(id);
    const settings = page.getByRole('dialog', { name: m.settingsTitle, exact: true, includeHidden: true });
    await settings.getByRole('button', { name: m.close, exact: true, includeHidden: true }).dispatchEvent('click');
    await expect(settings).not.toBeVisible();
    editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
    await expect(editor.getByLabel(m.scheduleName, { exact: true })).toHaveValue(name);
    for (let index = 0; index < names.length; index++) {
      await expect(editor.getByLabel(m.stepName(index + 1), { exact: true })).toHaveValue(names[index]);
    }
    await editor.getByRole('button', { name: m.addStep, exact: true }).click();
    names.push(m.stepNumber(names.length + 1));
    await expect(editor.getByLabel(m.stepName(names.length), { exact: true })).toHaveValue(names.at(-1)!);
    const saved = await stored(page);
    expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.timer).toEqual(data.timer); expect(saved.planning).toEqual(data.planning);
    previous = m;
  }
  await editor.getByRole('button', { name: previous.close, exact: true }).click();
  await page.getByRole('button', { name: previous.continueEditing, exact: true }).click();
  await expect(editor.getByLabel(previous.scheduleName, { exact: true })).toHaveValue(name);
  await editor.getByRole('button', { name: previous.close, exact: true }).click();
  await page.getByRole('button', { name: previous.discardChanges, exact: true }).click();
  expect((await stored(page)).planning).toEqual(data.planning);
  expect(await playCount(page)).toBe(0);
});

for (const [first, second] of [['en', 'ru'], ['es', 'fr'], ['fr', 'de'], ['de', 'es']] as const) {
  test(`language ${first} to ${second} at live boundaries preserves three clocks and one playback per event`, async ({ page }) => {
    const data = await timingFixture(page);
    await page.getByRole('button', { name: 'Setări', exact: true }).click();
    await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === first)!.label, exact: true }).click();
    let dialog = page.getByRole('dialog', { name: getMessages(first).settingsTitle, exact: true });
    const saved = await stored(page);
    expect(saved.stopwatch).toEqual(data.stopwatch); expect(saved.timer).toEqual(data.timer); expect(saved.planning).toEqual(data.planning);
    await page.clock.runFor(2999);
    await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === second)!.label, exact: true }).click();
    expect(await playCount(page)).toBe(0);
    await page.clock.runFor(1);
    dialog = page.getByRole('dialog', { name: getMessages(second).settingsTitle, exact: true });
    await expect(dialog.getByLabel(getMessages(second).stepCompleted, { exact: true })).toBeVisible();
    await expect.poll(() => playCount(page)).toBe(1);
    await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === first)!.label, exact: true }).click();
    dialog = page.getByRole('dialog', { name: getMessages(first).settingsTitle, exact: true });
    await expect(dialog.getByLabel(getMessages(first).stepCompleted, { exact: true })).toBeVisible();
    expect(await playCount(page)).toBe(1);
    expect((await audioEvents(page)).filter((event) => event.type === 'pause')).toHaveLength(0);
    await page.clock.runFor(2000);
    await expect(dialog.getByLabel(getMessages(first).timerCompleted, { exact: true })).toBeVisible();
    await expect.poll(() => playCount(page)).toBe(2);
    await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === second)!.label, exact: true }).click();
    await page.clock.runFor(2000);
    dialog = page.getByRole('dialog', { name: getMessages(second).settingsTitle, exact: true });
    await expect(dialog.getByLabel(getMessages(second).scheduleCompleted, { exact: true })).toBeVisible();
    await expect.poll(() => playCount(page)).toBe(3);
    const result = await stored(page);
    expect(result.timer).toMatchObject({ status: 'completed', runId: 'language-timer' });
    expect(result.planning.run).toMatchObject({ status: 'completed', runId: 'language-schedule', stepIndex: 1 });
    expect(result.planning.schedules).toEqual(data.planning.schedules); expect(result.stopwatch).toEqual(data.stopwatch);
    await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === first)!.label, exact: true }).click();
    expect(await playCount(page)).toBe(3);
  });
}

for (const target of ['ru', 'es', 'fr', 'de'] as const) {
  test(`${target} language survives silent background catch-up without replaying expired alerts`, async ({ page }) => {
    const data = await timingFixture(page);
    await selectLanguage(page, 'ro', target);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.runFor(10000);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect.poll(async () => (await stored(page)).timer.status).toBe('completed');
    await expect.poll(async () => (await stored(page)).planning.run?.status).toBe('completed');
    await expect(page.getByLabel(getMessages(target).timerCompleted, { exact: true })).toBeVisible();
    await expect(page.getByLabel(getMessages(target).scheduleCompleted, { exact: true })).toBeVisible();
    expect(await playCount(page)).toBe(0);
    expect((await stored(page)).stopwatch).toEqual(data.stopwatch);
  });

  test(`${target} language relabels an existing toast without extending its lifetime`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-06T10:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-06T10:00:01Z'));
    const data = initialData(); data.stopwatch.accumulatedMs = 1500;
    await seed(page, data); await page.goto('/');
    await page.getByRole('button', { name: 'Salvează sesiunea', exact: true }).click();
    await expect(page.getByText(getMessages('ro').sessionSaved, { exact: true })).toBeVisible();
    await page.clock.runFor(2000);
    await selectLanguage(page, 'ro', target);
    await expect(page.getByText(getMessages(target).sessionSaved, { exact: true })).toBeVisible();
    await page.clock.runFor(1499);
    await expect(page.getByText(getMessages(target).sessionSaved, { exact: true })).toBeVisible();
    await page.clock.runFor(1);
    await expect(page.getByText(getMessages(target).sessionSaved, { exact: true })).toHaveCount(0);
    expect((await stored(page)).sessions).toHaveLength(1);
  });

  test(`${target} preview failure translates in its sheet and retains the original feedback deadline`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-06T10:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-06T10:00:01Z'));
    const wav = readFileSync(new URL('../../assets/audio/timer-complete.wav', import.meta.url));
    await page.route(/timer-complete[^/]*\.wav/, (route) => route.fulfill({ contentType: 'audio/wav', body: wav }));
    await seed(page); await audioSpy(page, true); await page.goto('/');
    await page.getByRole('button', { name: 'Setări', exact: true }).click();
    await page.getByRole('button', { name: 'Ascultă sunetul', exact: true }).click();
    await expect(page.getByText(getMessages('ro').soundUnavailable, { exact: true })).toBeVisible();
    await page.clock.runFor(2000);
    await page.getByRole('radio', { name: LANGUAGES.find(({ id }) => id === target)!.label, exact: true }).click();
    await expect(page.getByText(getMessages(target).soundUnavailable, { exact: true })).toBeVisible();
    await page.clock.runFor(1499);
    await expect(page.getByText(getMessages(target).soundUnavailable, { exact: true })).toBeVisible();
    await page.clock.runFor(1);
    await expect(page.getByText(getMessages(target).soundUnavailable, { exact: true })).toHaveCount(0);
    expect(await playCount(page)).toBe(1);
  });
}

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
  .concat([320, 430, 1024].flatMap((width) => ['ru', 'es', 'fr', 'de'].flatMap((id) => ['light', 'dark'].map((theme) => ({ id: id as AppLanguage, theme: theme as 'light' | 'dark', width })))));
for (const { id, theme, width } of layouts) {
  test(`layout ${id} ${theme} ${width}px keeps controls labels dialogs and notices usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const data = initialData(); data.preferences.language = id; data.preferences.theme = theme;
    data.sessions = [{ id: 'layout-history', savedAt: Date.UTC(2026, 10, 6, 23, 7), durationMs: 2500, laps: [] }];
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
    await editor.getByRole('button', { name: m.editStepDuration(2), exact: true }).click();
    const panel = page.getByRole('dialog', { name: m.durationPickerTitle(2), exact: true });
    await expect(panel.getByRole('spinbutton', { name: m.stepField(m.timeUnits[2], 2), exact: true })).toHaveAttribute('aria-valuenow', '0');
    await panel.getByRole('button', { name: m.cancel, exact: true }).click();
    await editor.getByRole('button', { name: m.close, exact: true }).click();
    const discard = page.getByRole('dialog', { name: m.discardTitle, exact: true });
    await expect(discard.getByText(m.discardHelp, { exact: true })).toBeVisible();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-confirmation.png`, animations: 'disabled' });
    await discard.getByRole('button', { name: m.continueEditing, exact: true }).click();
    await expect(editor.getByLabel(m.scheduleName, { exact: true })).toHaveValue('Учёба · Școală');
    await editor.getByRole('button', { name: m.close, exact: true }).click();
    await page.getByRole('button', { name: m.discardChanges, exact: true }).click();
    await page.getByRole('tab', { name: m.timerTab, exact: true }).click();
    await expect(page.getByLabel(m.timeUnits[0], { exact: true })).toBeVisible();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-timer.png`, animations: 'disabled' });
    await page.getByRole('tab', { name: m.historyTab, exact: true }).click();
    await page.getByRole('button', { name: /00:02\.50/ }).click();
    const details = page.getByRole('dialog', { name: m.sessionTitle, exact: true });
    await expect(details.getByRole('button', { name: m.shareResults, exact: true })).toBeVisible();
    await expectControlsFit(page);
    await page.screenshot({ path: `${prefix}-history.png`, animations: 'disabled' });
  });
}

for (const id of ['es', 'fr', 'de'] as const) {
  test(`layout ${id} enlarged web text and reduced motion retain six reachable choices`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const data = initialData(); data.preferences.language = id;
    await seed(page, data); await page.goto('/');
    const m = getMessages(id);
    await page.getByRole('button', { name: m.settings, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: m.settingsTitle, exact: true });
    await dialog.evaluate((element) => {
      for (const text of element.querySelectorAll<HTMLElement>('[dir="auto"]')) {
        text.style.fontSize = `${parseFloat(getComputedStyle(text).fontSize) * 1.3}px`;
      }
    });
    for (const { label } of LANGUAGES) {
      const choice = dialog.getByRole('radio', { name: label, exact: true });
      await choice.scrollIntoViewIfNeeded(); await expect(choice).toBeInViewport();
    }
    await expectControlsFit(page);
    await dialog.getByText(m.historyLimit, { exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog.getByText(m.historyLimit, { exact: true })).toBeInViewport();
    await page.screenshot({ path: `previews/i18n-${id}-enlarged.png`, animations: 'disabled' });
    await dialog.getByRole('button', { name: m.close, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', id);
  });
}
