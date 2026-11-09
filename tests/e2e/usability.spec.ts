import { expect, test } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer } from '../../src/core/timer';
import { pauseSchedule, startSchedule } from '../../src/core/planning';
import { getMessages } from '../../src/i18n';
import { deadlineLabel } from '../../src/i18n/formatters';
import { audioEvents, audioSpy, expectNoPageErrors, observePageErrors, playCount, seed, selectWheel, stored } from './helpers';

const m = getMessages('ro');
test.use({ timezoneId: 'UTC' });
test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

test('quick Timer setup and active extensions preserve one run through pause and reload', async ({ page }) => {
  const data = initialData(); data.preferences.timerSound = false;
  await seed(page, data); await page.goto('/timer');
  await page.getByRole('button', { name: m.presetMinutes(25), exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.durationMs).toBe(1500000);
  expect((await stored(page)).timer.status).toBe('idle');
  await expect(page.getByRole('spinbutton', { name: m.timeUnits[1], exact: true })).toHaveAttribute('aria-valuenow', '25');
  await page.getByRole('button', { name: m.startTimer, exact: true }).click();
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  const started = (await stored(page)).timer;
  await page.getByRole('button', { name: m.addMinute, exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.durationMs).toBe(1560000);
  expect((await stored(page)).timer.deadlineAt).toBe(started.deadlineAt! + 60000);
  expect((await stored(page)).timer.runId).toBe(started.runId);
  await page.getByRole('button', { name: m.pauseTimer, exact: true }).click();
  const paused = (await stored(page)).timer;
  await page.getByRole('button', { name: m.addMinute, exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.remainingMs).toBe(paused.remainingMs + 60000);
  await page.reload();
  await expect(page.getByRole('button', { name: m.resumeTimer, exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  expect((await stored(page)).timer.runId).toBe(started.runId);
});

test('a quick duration recovers an invalid zero selection without starting automatically', async ({ page }) => {
  const data = initialData(); data.timer = initialTimer(1000);
  await seed(page, data); await page.goto('/timer');
  await selectWheel(page.getByRole('spinbutton', { name: m.timeUnits[2], exact: true }), 0);
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: m.presetMinutes(1), exact: true }).click();
  await expect(page.getByRole('button', { name: m.startTimer, exact: true })).toBeEnabled();
  await expect.poll(async () => (await stored(page)).timer.durationMs).toBe(60000);
  expect((await stored(page)).timer.status).toBe('idle');
});

test('the end-clock includes a date across midnight and disappears while paused', async ({ page }) => {
  const now = Date.parse('2026-11-09T23:59:40Z');
  await page.clock.install({ time: now });
  const data = initialData(); data.timer = initialTimer(60000); data.preferences.timerSound = false;
  await seed(page, data); await page.goto('/timer');
  await page.getByRole('button', { name: m.startTimer, exact: true }).click();
  const running = (await stored(page)).timer;
  const label = m.timerEndsAt(deadlineLabel(running.deadlineAt!, now, 'ro', 'UTC'));
  await expect(page.getByText(label, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: m.pauseTimer, exact: true }).click();
  await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: m.addMinute, exact: true }).click();
  await page.getByRole('button', { name: m.resumeTimer, exact: true }).click();
  const resumed = (await stored(page)).timer;
  await expect(page.getByText(m.timerEndsAt(deadlineLabel(resumed.deadlineAt!, now, 'ro', 'UTC')), { exact: true })).toBeVisible();
});

test('Planning templates and duplicates remain unsaved until Save and use independent IDs', async ({ page }) => {
  await seed(page); await page.goto('/planning');
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true }).click();
  expect((await stored(page)).planning.schedules).toEqual([]);
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  const original = (await stored(page)).planning.schedules[0];
  await page.getByRole('button', { name: m.scheduleOptions(original.name), exact: true }).click();
  await page.getByRole('button', { name: m.duplicateSchedule(original.name), exact: true }).click();
  expect((await stored(page)).planning.schedules).toEqual([original]);
  await page.getByRole('button', { name: m.close, exact: true }).click();
  expect((await stored(page)).planning.schedules).toEqual([original]);
  await page.getByRole('button', { name: m.scheduleOptions(original.name), exact: true }).click();
  await page.getByRole('button', { name: m.duplicateSchedule(original.name), exact: true }).click();
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  const saved = (await stored(page)).planning.schedules;
  expect(saved[0]).toEqual(original); expect(saved[1].id).not.toBe(original.id);
  expect(saved[1].steps.map((step) => step.id)).not.toEqual(original.steps.map((step) => step.id));
  expect(saved[1].steps.map((step) => step.durationMs)).toEqual(original.steps.map((step) => step.durationMs));
});

test('repetition previews can be discarded and only Save persists the repeated sequence', async ({ page }) => {
  const data = initialData();
  const original = { id: 'routine', name: 'Secvență', steps: [
    { id: 'work', name: 'Lucru', durationMs: 60000 }, { id: 'rest', name: 'Pauză', durationMs: 30000 },
  ] };
  data.planning.schedules = [original]; await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: m.scheduleOptions(original.name), exact: true }).click();
  await page.getByRole('button', { name: m.editSchedule(original.name), exact: true }).click();
  const repeat = page.getByRole('button', { name: m.repeatSequence, exact: true });
  await repeat.click(); await page.getByRole('radio', { name: m.repeatCycles(4), exact: true }).click();
  expect((await stored(page)).planning.schedules).toEqual([original]);
  await page.getByRole('button', { name: m.cancel, exact: true }).click();
  await expect(repeat).toBeFocused();
  await expect(page.getByRole('button', { name: m.editStepDuration(3), exact: true })).toHaveCount(0);
  await repeat.click(); await page.getByRole('radio', { name: m.repeatCycles(4), exact: true }).click();
  await page.getByRole('button', { name: m.applyRepeat, exact: true }).click();
  expect((await stored(page)).planning.schedules).toEqual([original]);
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules[0].steps.length).toBe(8);
  const saved = (await stored(page)).planning.schedules[0];
  expect(saved.steps.slice(0, 2)).toEqual(original.steps);
  expect(new Set(saved.steps.map((step) => step.id)).size).toBe(8);
  await page.reload(); expect((await stored(page)).planning.schedules[0]).toEqual(saved);
});

test('repetition rejects an over-limit result without truncating or changing the saved schedule', async ({ page }) => {
  const data = initialData();
  data.planning.schedules = [{ id: 'large', name: 'Lung', steps: Array.from({ length: 26 }, (_, index) => ({ id: `s${index}`, name: `Pas ${index}`, durationMs: 1000 })) }];
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: m.scheduleOptions('Lung'), exact: true }).click();
  await page.getByRole('button', { name: m.editSchedule('Lung'), exact: true }).click();
  await page.getByRole('button', { name: m.repeatSequence, exact: true }).click();
  await expect(page.getByRole('button', { name: m.applyRepeat, exact: true })).toBeDisabled();
  await expect(page.getByText(m.repeatLimit, { exact: true })).toBeVisible();
  expect((await stored(page)).planning).toEqual(data.planning);
});

test('Planning cards expose secondary actions through a labelled keyboard-operable disclosure', async ({ page }) => {
  const data = initialData(); data.planning.schedules = [{ id: 'focus', name: 'Concentrare', steps: [
    { id: 'work', name: 'Lucru', durationMs: 1500000 }, { id: 'rest', name: 'Pauză', durationMs: 300000 },
  ] }];
  await seed(page, data); await page.goto('/planning');
  await expect(page.getByRole('button', { name: m.startSchedule('Concentrare'), exact: true })).toBeVisible();
  await expect(page.getByText(`Lucru 25 ${m.minutesShort} → Pauză 5 ${m.minutesShort}`, { exact: true })).toBeVisible();
  const edit = page.getByRole('button', { name: m.editSchedule('Concentrare'), exact: true });
  await expect(edit).toHaveCount(0);
  const options = page.getByRole('button', { name: m.scheduleOptions('Concentrare'), exact: true });
  await options.focus(); await options.press('Enter'); await expect(edit).toBeVisible();
  await options.press('Enter'); await expect(edit).toHaveCount(0);
  expect((await stored(page)).planning).toEqual(data.planning);
});

test('Planning cards keep an active source protected while a new duplicate can be saved independently', async ({ page }) => {
  const data = initialData(); data.preferences.timerSound = false;
  data.planning.schedules = [{ id: 'active', name: 'Activ', steps: [{ id: 'step', name: 'Lucru', durationMs: 600000 }] }];
  data.planning = startSchedule(data.planning, 'active', Date.now(), 'active-run');
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: m.scheduleOptions('Activ'), exact: true }).click();
  await expect(page.getByRole('button', { name: m.editSchedule('Activ'), exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: m.deleteSchedule('Activ'), exact: true })).toBeDisabled();
  await page.getByRole('button', { name: m.duplicateSchedule('Activ'), exact: true }).click();
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  expect((await stored(page)).planning.run).toEqual(data.planning.run);
  expect((await stored(page)).planning.schedules[0]).toEqual(data.planning.schedules[0]);
});

test('Settings groups preserve selections and Back focus while Close returns to the current screen', async ({ page }) => {
  await seed(page); await page.goto('/timer');
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  const appearance = page.getByRole('button', { name: m.settingsGroups.appearance, exact: true });
  await expect(page.getByRole('switch', { name: m.darkMode, exact: true })).toHaveCount(0);
  await appearance.click();
  await page.getByRole('switch', { name: m.darkMode, exact: true }).click();
  await expect.poll(async () => (await stored(page)).preferences.theme).toBe('dark');
  await page.getByRole('button', { name: m.back, exact: true }).click();
  await expect(appearance).toBeFocused();
  await page.getByRole('button', { name: m.settingsGroups.language, exact: true }).click();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  const en = getMessages('en');
  await page.getByRole('button', { name: en.back, exact: true }).click();
  await expect(page.getByRole('button', { name: en.settingsGroups.language, exact: true })).toBeFocused();
  await page.getByRole('button', { name: en.close, exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: en.startTimer, exact: true })).toBeVisible();
  await page.reload();
  await expect.poll(async () => (await stored(page)).preferences.language).toBe('en');
  expect((await stored(page)).preferences.theme).toBe('dark');
});

test('Settings leaving Sounds stops only its preview and Escape follows Back then Close', async ({ page }) => {
  await seed(page); await audioSpy(page); await page.goto('/');
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  await page.getByRole('button', { name: m.settingsGroups.sounds, exact: true }).click();
  await expect(page.getByRole('dialog', { name: m.settingsGroups.sounds, exact: true })).toBeVisible();
  await page.getByRole('button', { name: m.preview, exact: true }).click();
  await expect.poll(() => playCount(page)).toBe(1);
  const before = (await audioEvents(page)).filter((event) => event.type === 'pause').length;
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: m.settingsGroups.sounds, exact: true })).toBeFocused();
  await expect.poll(async () => (await audioEvents(page)).filter((event) => event.type === 'pause').length).toBeGreaterThan(before);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  await page.getByRole('button', { name: m.settingsGroups.sounds, exact: true }).click();
  await expect(page.getByRole('button', { name: m.preview, exact: true })).toBeVisible();
});

test('Settings navigation preserves a real completion event and its playback owner', async ({ page }) => {
  await page.clock.install(); await audioSpy(page);
  const data = initialData(); data.timer = initialTimer(1000);
  await seed(page, data); await page.goto('/timer');
  await page.getByRole('button', { name: m.startTimer, exact: true }).click();
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  await page.getByRole('button', { name: m.settingsGroups.sounds, exact: true }).click();
  await page.clock.runFor(1200);
  await expect.poll(() => playCount(page)).toBe(1);
  const pauses = (await audioEvents(page)).filter((event) => event.type === 'pause').length;
  await page.getByRole('button', { name: m.back, exact: true }).click();
  await expect(page.getByRole('button', { name: m.settingsGroups.appearance, exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: m.stopSound, exact: true })).toBeVisible();
  expect((await audioEvents(page)).filter((event) => event.type === 'pause').length).toBe(pauses);
  expect((await stored(page)).timer.status).toBe('completed');
});

test('active rows control both owners off-tab without ticking storage and stay behind Settings', async ({ page }) => {
  const data = initialData(); data.preferences.timerSound = false;
  const schedule = { id: 'active', name: 'Routine', steps: [{ id: 'step', name: 'Work', durationMs: 120000 }] };
  data.timer = { ...initialTimer(120000), status: 'running', runId: 'timer-row', deadlineAt: Date.now() + 120000 };
  data.planning = startSchedule({ schedules: [schedule], run: null }, schedule.id, Date.now(), 'planning-row');
  await seed(page, data); await page.goto('/');
  const timerOpen = page.getByRole('button', { name: m.openActiveTimer, exact: true });
  const planningOpen = page.getByRole('button', { name: m.openActivePlanning, exact: true });
  await expect(timerOpen).toBeVisible(); await expect(planningOpen).toBeVisible();
  const original = await stored(page);
  const displayed = await timerOpen.innerText();
  await expect.poll(() => timerOpen.innerText()).not.toBe(displayed);
  expect(await stored(page)).toEqual(original);
  await page.getByRole('button', { name: m.pauseTimer, exact: true }).click();
  await page.getByRole('button', { name: m.pauseSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).timer.status).toBe('paused');
  expect((await stored(page)).planning.run?.status).toBe('paused');
  await page.getByRole('button', { name: m.settings, exact: true }).click();
  await expect(page.getByRole('dialog', { name: m.settingsTitle, exact: true })).toBeVisible();
  await expect(timerOpen).toHaveCount(0); await expect(planningOpen).toHaveCount(0);
  await page.getByRole('button', { name: m.close, exact: true }).click();
  await page.getByRole('button', { name: m.resumeTimer, exact: true }).click();
  await page.getByRole('button', { name: m.resumeSchedule, exact: true }).click();
  await timerOpen.click(); await expect(page).toHaveURL(/\/timer$/);
  await expect(timerOpen).toHaveCount(0); await expect(planningOpen).toBeVisible();
  await planningOpen.click(); await expect(page).toHaveURL(/\/planning$/);
  await expect(planningOpen).toHaveCount(0); await expect(timerOpen).toBeVisible();
});

test('completed activities disappear from off-tab compact controls', async ({ page }) => {
  const data = initialData(); data.preferences.timerSound = false;
  const schedule = { id: 'short', name: 'Short', steps: [{ id: 'step', name: 'Done', durationMs: 1000 }] };
  await page.clock.install();
  data.timer = { ...initialTimer(1000), status: 'running', runId: 'short-timer', deadlineAt: Date.now() + 60000 };
  data.planning = startSchedule({ schedules: [schedule], run: null }, schedule.id, Date.now() + 59000, 'short-run');
  await seed(page, data); await page.goto('/');
  await expect(page.getByRole('button', { name: m.openActiveTimer, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: m.openActivePlanning, exact: true })).toBeVisible();
  await page.clock.runFor(61000);
  await expect(page.getByRole('button', { name: m.openActiveTimer, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: m.openActivePlanning, exact: true })).toHaveCount(0);
});


test('compact active rows retain complete time and keep session feedback above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const now = Date.now(); const data = initialData(); data.stopwatch.accumulatedMs = 1000;
  data.timer = { ...initialTimer(60000), status: 'paused', runId: 'compact-timer' };
  const schedule = { id: 'compact', name: 'N'.repeat(80), steps: [{ id: 'action', name: 'A'.repeat(80), durationMs: 60000 }] };
  data.planning = pauseSchedule(startSchedule({ schedules: [schedule], run: null }, schedule.id, now, 'compact-run'), now);
  await seed(page, data); await page.goto('/');
  const planning = page.getByRole('button', { name: m.openActivePlanning, exact: true });
  const time = planning.getByText(/00:01:00$/);
  await expect(time).toBeVisible();
  expect.soft(await time.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: m.saveSession, exact: true }).click();
  const feedback = page.getByText(m.sessionSaved, { exact: true }); await expect(feedback).toBeVisible();
  const notice = (await feedback.boundingBox())!;
  const timer = (await page.getByRole('button', { name: m.openActiveTimer, exact: true }).boundingBox())!;
  expect(notice.y + notice.height).toBeLessThanOrEqual(timer.y - 4);
});


test('schedule disclosure exposes its expanded state to keyboard and assistive technology', async ({ page }) => {
  const data = initialData(); data.planning.schedules = [{ id: 'menu', name: 'Menu', steps: [{ id: 'a', name: 'Action', durationMs: 1000 }] }];
  await seed(page, data); await page.goto('/planning');
  const templates = page.getByRole('button', { name: m.planningTemplates, exact: true });
  await expect(templates).toHaveAttribute('aria-expanded', 'false');
  await templates.press('Enter'); await expect(templates).toHaveAttribute('aria-expanded', 'true');
  await templates.press('Enter'); await expect(templates).toHaveAttribute('aria-expanded', 'false');
  const more = page.getByRole('button', { name: m.scheduleOptions('Menu'), exact: true });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.press('Enter'); await expect(more).toHaveAttribute('aria-expanded', 'true');
  await more.press('Enter'); await expect(more).toHaveAttribute('aria-expanded', 'false');
});
