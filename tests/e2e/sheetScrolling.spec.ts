import { expect, test, type Locator, type Page } from '@playwright/test';
import { initialData, MAX_LAPS, formatTime } from '../../src/core/stopwatch';
import { serializeBackup } from '../../src/core/backup';
import { LANGUAGES } from '../../src/core/language';
import { getMessages } from '../../src/i18n';
import { sessionDate } from '../../src/i18n/formatters';
import { audioSpy, expectNoPageErrors, observePageErrors, playCount, seed, settings, stored } from './helpers';

const m = getMessages('en');
const warnings = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  observePageErrors(page); const messages: string[] = []; warnings.set(page, messages);
  page.on('console', (message) => { if (/VirtualizedLists|nested.*ScrollView/i.test(message.text())) messages.push(message.text()); });
});
test.afterEach(({ page }) => { expectNoPageErrors(page); expect(warnings.get(page)).toEqual([]); });

async function contentOwner(control: Locator) {
  return control.evaluateHandle((node) => {
    let parent = node.parentElement;
    while (parent && getComputedStyle(parent).overflowY !== 'auto') parent = parent.parentElement;
    if (!parent) throw new Error('Missing content scroll owner');
    return parent;
  });
}

async function reach(page: Page, control: Locator, edge: 'top' | 'bottom') {
  const owner = await contentOwner(control);
  const box = await owner.evaluate((node) => node.getBoundingClientRect().toJSON());
  await page.mouse.move(box.right - 6, box.y + box.height / 2);
  await expect.poll(async () => {
    const remaining = await owner.evaluate((node, target) => Math.abs(node.scrollTop -
      (target === 'bottom' ? node.scrollHeight - node.clientHeight : 0)), edge);
    if (remaining > 1) await page.mouse.wheel(0, edge === 'bottom' ? 100000 : -100000);
    return remaining;
  }).toBeLessThanOrEqual(1);
  return owner;
}

async function oneBody(panel: Locator) {
  const count = await panel.getByTestId('sheet-surface').evaluate((root) => Array.from(root.querySelectorAll('*')).filter((node) => {
    const style = getComputedStyle(node);
    return style.overflowY === 'auto' && style.visibility !== 'hidden' && node.clientHeight > 0;
  }).length);
  expect(count).toBe(1);
}

async function enlarged(panel: Locator) {
  await panel.evaluate((root) => {
    for (const node of root.querySelectorAll<HTMLElement>('[class*="css-text"]')) {
      const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize);
      if (size > 24) continue;
      node.style.fontSize = `${size * 1.3}px`;
      if (style.lineHeight !== 'normal') node.style.lineHeight = `${Number.parseFloat(style.lineHeight) * 1.3}px`;
    }
  });
}

async function positions(page: Page, controls: Locator[]) {
  const nodes = await Promise.all(controls.map((control) => control.elementHandle()));
  try {
    return await page.evaluate((elements) => elements.map((node) => {
      if (!node) throw new Error('Missing scroll comparison element');
      return node.getBoundingClientRect().y;
    }), nodes);
  } finally { await Promise.all(nodes.map((node) => node?.dispose())); }
}

for (const { id } of LANGUAGES) for (const theme of ['light', 'dark'] as const) {
  test(`${id} ${theme} Settings scrolls all seven groups and reaches each section without changing preferences`, async ({ page }) => {
    const messages = getMessages(id), data = initialData(); data.preferences.language = id; data.preferences.theme = theme;
    await page.setViewportSize({ width: theme === 'light' ? 320 : 390, height: 480 });
    await seed(page, data); await audioSpy(page); await page.goto('/timer');
    const panel = await settings(page, undefined, messages); await enlarged(panel); await oneBody(panel);
    const groups = Object.values(messages.settingsGroups);
    const first = panel.getByRole('button', { name: groups[0], exact: true });
    const second = panel.getByRole('button', { name: groups[1], exact: true });
    const original = await positions(page, [first, second]);
    const box = (await first.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 140);
    await expect.poll(() => first.evaluate((element) => element.getBoundingClientRect().y)).toBeLessThan(original[0] - 50);
    const moved = await positions(page, [first, second]);
    expect(Math.abs((original[0] - moved[0]) - (original[1] - moved[1]))).toBeLessThan(2);
    const last = panel.getByRole('button', { name: groups.at(-1)!, exact: true });
    await reach(page, last, 'bottom'); await expect(last).toBeInViewport();
    await expect(page.getByRole('tab')).toHaveCount(0);
    for (const [id, group] of Object.entries(messages.settingsGroups)) {
      const source = panel.getByRole('button', { name: group, exact: true });
      await source.click(); await enlarged(panel); await oneBody(panel);
      const end = id === 'about' ? panel.getByText(messages.historyLimit, { exact: true })
        : id === 'device' ? panel.getByText(messages.webNote, { exact: true })
          : id === 'notifications' ? panel.getByText(messages.notificationsWeb, { exact: true })
            : id === 'sounds' ? panel.getByRole('button', { name: messages.preview, exact: true })
              : id === 'data' ? panel.getByRole('button', { name: messages.backup.import, exact: true })
                : panel.getByRole('radio').last();
      await reach(page, end, 'bottom'); await expect(end).toBeInViewport();
      await page.keyboard.press('Escape'); await expect(source).toBeFocused();
    }
    expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
    await panel.getByRole('button', { name: messages.close, exact: true }).click();
    await expect(page.getByRole('tab', { name: messages.timerTab, exact: true })).toBeVisible();
  });
}

test('a thousand-lap session scrolls its summary, laps and final actions together and keeps deletion explicit', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en'; data.preferences.theme = 'dark';
  data.sessions = [{ id: 'maximum-laps', savedAt: 1794225600000, durationMs: MAX_LAPS * 1000,
    laps: Array.from({ length: MAX_LAPS }, (_, index) => ({ number: index + 1, elapsedMs: (index + 1) * 1000, splitMs: 1000 })) }];
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, data); await audioSpy(page); await page.goto('/history');
  const session = data.sessions[0];
  await page.getByRole('button', { name: m.sessionLabel(sessionDate(session.savedAt, 'en'), formatTime(session.durationMs), MAX_LAPS), exact: true }).click();
  const panel = page.getByRole('dialog', { name: m.sessionTitle, exact: true }); await oneBody(panel);
  const summary = panel.getByText(m.totalTimeUpper, { exact: true });
  const lap = panel.getByText('1000', { exact: true }).last();
  const original = await positions(page, [summary, lap]);
  const owner = await contentOwner(summary), box = await owner.evaluate((node) => node.getBoundingClientRect().toJSON());
  await page.mouse.move(box.right - 6, box.y + box.height / 2); await page.mouse.wheel(0, 180);
  await expect.poll(() => summary.evaluate((element) => element.getBoundingClientRect().y)).toBeLessThan(original[0] - 80);
  const moved = await positions(page, [summary, lap]);
  expect(Math.abs((original[0] - moved[0]) - (original[1] - moved[1]))).toBeLessThan(2);
  const remove = panel.getByRole('button', { name: m.deleteSession, exact: true });
  await reach(page, remove, 'bottom');
  await expect(panel.getByText('01', { exact: true })).toBeInViewport();
  await expect(remove).toBeInViewport(); await expect(panel.getByRole('button', { name: m.shareResults, exact: true })).toBeInViewport();
  expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
  await remove.click();
  const confirmation = page.getByRole('dialog', { name: m.deleteSessionTitle, exact: true }); await oneBody(confirmation);
  await confirmation.getByRole('button', { name: m.cancel, exact: true }).click(); expect(await stored(page)).toEqual(data);
});

test('real backup review keeps its description and confirmation in one compact content scroller', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en';
  const source = initialData(); source.planning.schedules = [{ id: 'backup', name: 'Imported sequence', steps: [{ id: 'work', name: 'Work', durationMs: 60000 }] }];
  const raw = serializeBackup(source, 1794225600000);
  await page.setViewportSize({ width: 320, height: 400 });
  await seed(page, data); await audioSpy(page); await page.goto('/timer');
  const panel = await settings(page, 'data', m);
  const chooser = page.waitForEvent('filechooser'); await panel.getByRole('button', { name: m.backup.import, exact: true }).click();
  await (await chooser).setFiles({ name: 'crono.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  await expect(panel.getByText(m.backup.review, { exact: true })).toBeVisible();
  await enlarged(panel); await oneBody(panel);
  const help = panel.getByText(m.backup.help, { exact: true });
  const original = await help.evaluate((node) => node.getBoundingClientRect().y);
  const confirm = panel.getByRole('button', { name: m.backup.confirm, exact: true });
  await reach(page, confirm, 'bottom'); await expect(confirm).toBeInViewport();
  expect(await help.evaluate((node) => node.getBoundingClientRect().y)).toBeLessThan(original);
  expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
  await confirm.click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  const imported = await stored(page); expect(imported.timer).toEqual(data.timer); expect(imported.preferences).toEqual(data.preferences);
  expect(imported.planning.schedules[0].name).toBe('Imported sequence');
  await page.reload(); expect(await stored(page)).toEqual(imported);
});

test('a short date chooser scrolls fields and actions together and cancellation preserves the saved data', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en';
  await page.setViewportSize({ width: 320, height: 400 });
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: m.calendarChooseDay, exact: true }).click();
  const panel = page.getByRole('dialog', { name: m.calendarChooseDay, exact: true });
  await enlarged(panel); await oneBody(panel);
  const day = panel.getByRole('textbox', { name: m.calendarDay, exact: true });
  const owner = await reach(page, day, 'top');
  const original = await day.evaluate((node) => node.getBoundingClientRect().y);
  const cancel = panel.getByRole('button', { name: m.cancel, exact: true });
  await reach(page, cancel, 'bottom'); await expect(cancel).toBeInViewport();
  await expect(panel.getByRole('button', { name: m.calendarShow, exact: true })).toBeInViewport();
  expect(await owner.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await day.evaluate((node) => node.getBoundingClientRect().y)).toBeLessThan(original);
  await cancel.click(); await expect(panel).not.toBeVisible();
  expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
});

test('short calendar and repeat panels keep staged changes local and return to the same editor draft', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en'; data.preferences.theme = 'dark';
  await page.setViewportSize({ width: 320, height: 400 });
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
  const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Compact draft');
  await editor.getByRole('button', { name: `${m.calendarSchedule} · ${m.calendarManual}`, exact: true }).click();
  const calendar = page.getByRole('dialog', { name: m.calendarSchedule, exact: true });
  await calendar.getByRole('radio', { name: m.calendarWeekly, exact: true }).click();
  await calendar.getByRole('checkbox').first().click(); await enlarged(calendar); await oneBody(calendar);
  const calendarApply = calendar.getByRole('button', { name: m.calendarApply, exact: true });
  const cancel = calendar.getByRole('button', { name: m.cancel, exact: true });
  const owner = await reach(page, cancel, 'bottom');
  expect(await owner.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(calendarApply).toBeInViewport(); await calendarApply.click();
  expect(await stored(page)).toEqual(data);
  await editor.getByRole('button', { name: m.repeatSequence, exact: true }).click();
  const repeat = page.getByRole('dialog', { name: m.repeatSequence, exact: true }); await enlarged(repeat); await oneBody(repeat);
  const repeatCancel = repeat.getByRole('button', { name: m.cancel, exact: true });
  await reach(page, repeatCancel, 'bottom');
  const apply = repeat.getByRole('button', { name: m.applyRepeat, exact: true }); await expect(apply).toBeInViewport(); await apply.click();
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue('Compact draft');
  await expect(editor.getByRole('button', { name: m.editStepDuration(2), exact: true })).toHaveCount(1);
  expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
});

test('an overflowing reset confirmation scrolls its explanation and actions and Cancel leaves the stopwatch intact', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en'; data.stopwatch.accumulatedMs = 5000;
  await page.setViewportSize({ width: 320, height: 300 });
  await seed(page, data); await audioSpy(page); await page.goto('/');
  await page.getByRole('button', { name: m.resetStopwatch, exact: true }).click();
  const panel = page.getByRole('dialog', { name: m.resetStopwatchTitle, exact: true }); await enlarged(panel); await oneBody(panel);
  const help = panel.getByText(m.resetStopwatchHelp, { exact: true }); await reach(page, help, 'top');
  const original = await help.evaluate((node) => node.getBoundingClientRect().y);
  const cancel = panel.getByRole('button', { name: m.cancel, exact: true }); await reach(page, cancel, 'bottom');
  await expect(cancel).toBeInViewport();
  expect(await help.evaluate((node) => node.getBoundingClientRect().y)).toBeLessThan(original);
  expect(await stored(page)).toEqual(data); await cancel.click();
  await expect(panel).not.toBeVisible(); expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
});
