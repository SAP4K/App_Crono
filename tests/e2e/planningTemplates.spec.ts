import { expect, test, type Page } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { MAX_SCHEDULES, pauseSchedule, startSchedule } from '../../src/core/planning';
import { formatRemaining, initialTimer } from '../../src/core/timer';
import { LANGUAGES } from '../../src/core/language';
import { PLANNING_TEMPLATES, type PlanningTemplateId } from '../../src/core/planningTools';
import { getMessages } from '../../src/i18n';
import { audioSpy, expectNoPageErrors, expectTheme, observePageErrors, playCount, seed, settings, stepDuration, stored } from './helpers';

const m = getMessages('ro');
const templateIds = Object.keys(PLANNING_TEMPLATES) as PlanningTemplateId[];
const scrollWarnings = new WeakMap<Page, string[]>();

async function openTemplate(page: Page, id: PlanningTemplateId, messages = m) {
  const toggle = page.getByRole('button', { name: messages.planningTemplates, exact: true });
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await page.getByRole('button', { name: messages.planningTemplateNames[id].name, exact: true }).click();
  const editor = page.getByRole('dialog', { name: messages.newSchedule, exact: true });
  await expect(editor).toBeVisible();
  return editor;
}

test.beforeEach(({ page }) => {
  observePageErrors(page);
  const warnings: string[] = []; scrollWarnings.set(page, warnings);
  page.on('console', (message) => { if (/VirtualizedLists|nested.*ScrollView/i.test(message.text())) warnings.push(message.text()); });
});
test.afterEach(({ page }) => { expectNoPageErrors(page); expect(scrollWarnings.get(page)).toEqual([]); });

for (const template of templateIds) test(`${template} opens unsaved and saves independent exact copies through reload`, async ({ page }) => {
  await seed(page); await audioSpy(page); await page.goto('/planning');
  const before = await stored(page), copy = m.planningTemplateNames[template];
  let editor = await openTemplate(page, template);
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue(copy.name);
  await expect(editor.getByRole('textbox', { name: m.stepName(1), exact: true })).toHaveValue(copy.steps[0]);
  expect(await stored(page)).toEqual(before);
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  await expect(editor).not.toBeVisible(); expect(await stored(page)).toEqual(before);
  for (const count of [1, 2]) {
    editor = await openTemplate(page, template);
    await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
    await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(count);
  }
  const saved = await stored(page), schedules = saved.planning.schedules;
  for (const schedule of schedules) {
    expect(schedule.name).toBe(copy.name); expect(schedule.calendar).toBeUndefined();
    expect(schedule.steps.map((step) => step.name)).toEqual([...copy.steps]);
    expect(schedule.steps.map((step) => step.durationMs)).toEqual([...PLANNING_TEMPLATES[template]]);
  }
  const ids = schedules.flatMap((schedule) => [schedule.id, ...schedule.steps.map((step) => step.id)]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(saved.planning.run).toBeNull(); expect(saved.timer).toEqual(before.timer); expect(saved.stopwatch).toEqual(before.stopwatch);
  expect(await playCount(page)).toBe(0);
  await page.reload(); expect(await stored(page)).toEqual(saved);
});

test('Pomodoro retains edited first and last actions while discard and continue editing stay local', async ({ page }) => {
  await seed(page); await page.goto('/planning'); const before = await stored(page);
  let editor = await openTemplate(page, 'pomodoro');
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Draft Pomodoro');
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  const discard = page.getByRole('dialog', { name: m.discardTitle, exact: true });
  await discard.getByRole('button', { name: m.continueEditing, exact: true }).click();
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue('Draft Pomodoro');
  expect(await stored(page)).toEqual(before);
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  await discard.getByRole('button', { name: m.discardChanges, exact: true }).click();
  await expect(discard).not.toBeVisible(); expect(await stored(page)).toEqual(before);
  editor = await openTemplate(page, 'pomodoro');
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('My Pomodoro');
  const first = editor.getByRole('textbox', { name: m.stepName(1), exact: true });
  await first.fill('Acțiune personală'); await stepDuration(page, 1, [0, 1, 5]);
  await first.scrollIntoViewIfNeeded(); const box = (await first.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 50); await page.mouse.wheel(0, 4000);
  const last = editor.getByRole('textbox', { name: m.stepName(8), exact: true });
  await last.fill('Final personal'); await stepDuration(page, 8, [0, 16, 0]);
  expect(await stored(page)).toEqual(before);
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  const saved = (await stored(page)).planning.schedules[0];
  expect(saved.name).toBe('My Pomodoro'); expect(saved.steps).toHaveLength(8);
  expect(saved.steps[0]).toMatchObject({ name: 'Acțiune personală', durationMs: 65000 });
  expect(saved.steps[7]).toMatchObject({ name: 'Final personal', durationMs: 960000 });
  await page.reload(); expect((await stored(page)).planning.schedules[0]).toEqual(saved);
});

test('a template inherits the chosen civil day and uses the final saved slot without starting', async ({ page }) => {
  const data = initialData(); data.planning.schedules = Array.from({ length: MAX_SCHEDULES - 1 }, (_, index) => ({
    id: `existing-${index}`, name: `Existing ${index}`, steps: [{ id: `step-${index}`, name: 'Action', durationMs: 60000 }],
  }));
  await seed(page, data); await page.goto('/planning');
  await page.getByRole('button', { name: m.calendarChooseDay, exact: true }).click();
  const picker = page.getByRole('dialog', { name: m.calendarChooseDay, exact: true });
  for (const [name, value] of [[m.calendarDay, '10'], [m.calendarMonth, '11'], [m.calendarYear, '2026']]) {
    await picker.getByRole('textbox', { name, exact: true }).fill(value);
  }
  await picker.getByRole('button', { name: m.calendarShow, exact: true }).click();
  const editor = await openTemplate(page, 'activeBreak');
  expect(await stored(page)).toEqual(data);
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(20);
  const saved = await stored(page);
  expect(saved.planning.schedules.slice(0, 19)).toEqual(data.planning.schedules);
  expect(saved.planning.schedules[19].calendar).toEqual({ kind: 'once', date: '2026-11-10' });
  expect(saved.planning.run).toBeNull();
  await expect(page.getByRole('button', { name: m.planningTemplates, exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: m.newSchedule, exact: true })).toBeDisabled();
  await page.reload(); expect(await stored(page)).toEqual(saved);
});

test('saved user text keeps its language while the next template uses the newly selected language', async ({ page }) => {
  await seed(page); await page.goto('/planning');
  let editor = await openTemplate(page, 'study');
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  const original = (await stored(page)).planning.schedules[0];
  const dialog = await settings(page, 'language');
  await dialog.getByRole('radio', { name: 'English', exact: true }).click();
  const en = getMessages('en'); await dialog.getByRole('button', { name: en.close, exact: true }).click();
  editor = await openTemplate(page, 'study', en);
  await expect(editor.getByRole('textbox', { name: en.scheduleName, exact: true })).toHaveValue(en.planningTemplateNames.study.name);
  expect((await stored(page)).planning.schedules).toEqual([original]);
  await editor.getByRole('button', { name: en.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  const saved = await stored(page);
  expect(saved.planning.schedules[0]).toEqual(original);
  expect(saved.planning.schedules[1].steps.map((step) => step.name)).toEqual([...en.planningTemplateNames.study.steps]);
  await page.reload(); expect(await stored(page)).toEqual(saved);
});

for (const status of ['running', 'paused'] as const) test(`creating another built-in retains the ${status} run and independent active clocks`, async ({ page }) => {
  const now = Date.parse('2026-11-10T10:00:00Z');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install({ time: now }); await page.clock.pauseAt(now + 1000);
  const data = initialData(); data.stopwatch.startedAt = now - 2000;
  data.timer = { ...initialTimer(600000), status: 'running', deadlineAt: now + 600000, runId: 'independent-timer' };
  data.planning.schedules = [{ id: 'active', name: 'Existing run', steps: [{ id: 'existing', name: 'Keep working', durationMs: 600000 }] }];
  data.planning = startSchedule(data.planning, 'active', now, 'existing-run');
  if (status === 'paused') data.planning = pauseSchedule(data.planning, now + 500);
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  const before = await stored(page), editor = await openTemplate(page, 'meditation');
  await page.clock.runFor(300);
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Next activity');
  expect(await stored(page)).toEqual(before);
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  const after = await stored(page);
  expect(after.planning.run).toEqual(before.planning.run);
  expect(after.planning.schedules[0]).toEqual(before.planning.schedules[0]);
  expect(after.stopwatch).toEqual(before.stopwatch); expect(after.timer).toEqual(before.timer);
  expect(after.preferences).toEqual(before.preferences); expect(await playCount(page)).toBe(0);
});

for (const { id: language } of LANGUAGES) for (const theme of ['light', 'dark'] as const) for (const width of [320, 390]) {
  test(`expanded templates fit ${language} ${theme} at ${width}px and reach the last choice and saved content`, async ({ page }) => {
    const messages = getMessages(language), data = initialData();
    data.preferences.language = language; data.preferences.theme = theme;
    data.planning.schedules = [{ id: 'saved', name: 'Saved · Учёба', steps: [{ id: 'one', name: 'Keep', durationMs: 60000 }] }];
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page, data); await audioSpy(page); await page.goto('/planning'); await expectTheme(page, theme === 'dark');
    const toggle = page.getByRole('button', { name: messages.planningTemplates, exact: true });
    await toggle.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const before = await stored(page);
    await page.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>('[class*="css-text"]')) {
        const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize);
        if (size > 24) continue;
        node.style.fontSize = `${size * 1.3}px`;
        if (style.lineHeight !== 'normal') node.style.lineHeight = `${Number.parseFloat(style.lineHeight) * 1.3}px`;
      }
    });
    for (const id of templateIds) {
      const choice = page.getByRole('button', { name: messages.planningTemplateNames[id].name, exact: true });
      const durations = PLANNING_TEMPLATES[id];
      const summary = `${messages.stepCount(durations.length)} · ${formatRemaining(durations.reduce((sum: number, value) => sum + value, 0))}`;
      await expect(choice.getByText(summary, { exact: true })).toBeVisible();
      const box = (await choice.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await choice.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const last = page.getByRole('button', { name: messages.planningTemplateNames.activeBreak.name, exact: true });
    await last.scrollIntoViewIfNeeded(); await expect(last).toBeInViewport();
    if (width === 320 && (language === 'ro' || language === 'ru')) {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `previews/templates-${language}-${theme}-${width}.png`, animations: 'disabled' });
    }
    await last.press('Enter');
    const editor = page.getByRole('dialog', { name: messages.newSchedule, exact: true });
    await expect(editor.getByRole('textbox', { name: messages.scheduleName, exact: true })).toHaveValue(messages.planningTemplateNames.activeBreak.name);
    await editor.getByRole('button', { name: messages.close, exact: true }).click(); await expect(editor).not.toBeVisible();
    await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const saved = page.getByRole('button', { name: messages.startSchedule('Saved · Учёба'), exact: true });
    await saved.scrollIntoViewIfNeeded(); await expect(saved).toBeInViewport();
    await toggle.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(await stored(page)).toEqual(before); expect(await playCount(page)).toBe(0);
  });
}
