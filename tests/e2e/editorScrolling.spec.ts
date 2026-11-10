import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initialData } from '../../src/core/stopwatch';
import { getMessages } from '../../src/i18n';
import { audioSpy, expectNoPageErrors, observePageErrors, playCount, scheduleOptions, seed, stored } from './helpers';

const m = getMessages('en');
const warnings = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  observePageErrors(page);
  const messages: string[] = []; warnings.set(page, messages);
  page.on('console', (message) => { if (/VirtualizedLists|nested.*ScrollView/i.test(message.text())) messages.push(message.text()); });
});
test.afterEach(({ page }) => { expectNoPageErrors(page); expect(warnings.get(page)).toEqual([]); });

async function positions(page: Page, controls: Locator[]) {
  const nodes = await Promise.all(controls.map((control) => control.elementHandle()));
  return page.evaluate((elements) => elements.map((node) => {
    if (!node) throw new Error('Missing editor scroll comparison element');
    return node.getBoundingClientRect().top;
  }), nodes);
}

async function scrollOwner(control: Locator) {
  return control.evaluateHandle((node) => {
    let parent = node.parentElement;
    while (parent && getComputedStyle(parent).overflowY !== 'auto') parent = parent.parentElement;
    if (!parent) throw new Error('Missing active content scroll owner');
    return parent;
  });
}

async function enlarged(scope: Locator) {
  await scope.evaluate((root) => {
    for (const node of root.querySelectorAll<HTMLElement>('[class*="css-text"]')) {
      const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize);
      if (size > 24) continue;
      node.style.fontSize = `${size * 1.3}px`;
      if (style.lineHeight !== 'normal') node.style.lineHeight = `${Number.parseFloat(style.lineHeight) * 1.3}px`;
    }
  });
}

test('metadata, action rows and Save share the editor scroll after a real sixteen-action repetition', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en'; data.preferences.theme = 'dark';
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  const before = await stored(page);
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true }).click();
  for (const cycles of [4, 2]) {
    await page.getByRole('button', { name: m.repeatSequence, exact: true }).click();
    const panel = page.getByRole('dialog', { name: m.repeatSequence, exact: true });
    await panel.getByRole('radio', { name: m.repeatCycles(cycles), exact: true }).click();
    await panel.getByRole('button', { name: m.applyRepeat, exact: true }).click();
  }
  const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
  await expect(editor.getByText(`${m.editorCount(16, 50)} · ${m.editorTotal('04:00:00')}`, { exact: true })).toBeVisible();
  const name = editor.getByRole('textbox', { name: m.scheduleName, exact: true });
  const first = editor.getByRole('button', { name: m.editStepDuration(1), exact: true });
  const save = editor.getByRole('button', { name: m.saveSchedule, exact: true });
  await expect(save).not.toBeInViewport();
  const original = await positions(page, [name, first]);
  const box = (await name.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 180);
  await expect.poll(async () => (await positions(page, [name, first]))[0]).toBeLessThan(original[0] - 80);
  const moved = await positions(page, [name, first]);
  expect(Math.abs((original[0] - moved[0]) - (original[1] - moved[1]))).toBeLessThan(2);
  const owner = await first.evaluateHandle((node) => {
    let parent = node.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && getComputedStyle(parent).overflowY === 'auto')) parent = parent.parentElement;
    return parent;
  });
  const viewport = await owner.evaluate((node) => {
    if (!node) throw new Error('Missing editor scroll viewport');
    return node.getBoundingClientRect().toJSON();
  });
  await page.mouse.move(viewport.x + viewport.width - 10, viewport.y + viewport.height / 2);
  await expect.poll(async () => {
    const last = await save.boundingBox();
    if (last && last.y >= viewport.y && last.y + last.height <= viewport.bottom + 1) return true;
    await page.mouse.wheel(0, 1000); return false;
  }, { intervals: [100, 200, 300] }).toBe(true);
  await expect(editor.getByRole('button', { name: m.editStepDuration(16), exact: true })).toBeInViewport();
  await expect(editor.getByRole('button', { name: m.addStep, exact: true })).toBeInViewport();
  expect(await stored(page)).toEqual(before); expect(await playCount(page)).toBe(0);
  await page.mouse.wheel(0, -20000);
  await expect(name).toBeInViewport();
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  await page.getByRole('dialog', { name: m.discardTitle, exact: true }).getByRole('button', { name: m.discardChanges, exact: true }).click();
  await expect(editor).not.toBeVisible(); expect(await stored(page)).toEqual(before);
});

for (const theme of ['light', 'dark'] as const) test(`short ${theme} editor panels keep Apply and discard actions reachable without changing a draft`, async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en'; data.preferences.theme = theme;
  await page.setViewportSize({ width: 320, height: 400 });
  await seed(page, data); await audioSpy(page); await page.goto('/planning'); const before = await stored(page);
  await page.getByRole('button', { name: m.newSchedule, exact: true }).click();
  const editor = page.getByRole('dialog', { name: m.newSchedule, exact: true });
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Keep this draft');
  const source = editor.getByRole('button', { name: m.editStepDuration(1), exact: true });
  await source.click();
  const panel = page.getByRole('dialog', { name: m.durationPickerTitle(1), exact: true });
  await enlarged(panel);
  const cancel = panel.getByRole('button', { name: m.cancel, exact: true });
  const owner = await scrollOwner(cancel);
  const beforeValues = await panel.getByRole('spinbutton').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-valuenow')));
  const help = panel.getByText(m.stepNumber(1), { exact: true }).filter({ visible: true });
  const box = (await help.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 180);
  await expect.poll(() => owner.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(cancel).toBeInViewport();
  await expect(panel.getByRole('button', { name: m.applyDuration, exact: true })).toBeInViewport();
  expect(await panel.getByRole('spinbutton').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-valuenow')))).toEqual(beforeValues);
  await cancel.click(); await expect(source).toBeFocused();
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue('Keep this draft');
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  const discard = page.getByRole('dialog', { name: m.discardTitle, exact: true }); await enlarged(discard);
  const keep = discard.getByRole('button', { name: m.continueEditing, exact: true });
  const discardOwner = await scrollOwner(keep);
  await keep.scrollIntoViewIfNeeded(); await expect(keep).toBeInViewport();
  expect(await discardOwner.evaluate((node) => node.scrollHeight >= node.clientHeight)).toBe(true);
  await keep.click();
  await expect(editor.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue('Keep this draft');
  expect(await stored(page)).toEqual(before); expect(await playCount(page)).toBe(0);
});

test('a real touch drag over Repeat scrolls the complete editor without opening its panel', async ({ page, context }) => {
  const data = initialData(); data.preferences.language = 'en';
  data.planning.schedules = [{ id: 'many', name: 'Touch sequence', steps: Array.from({ length: 16 }, (_, index) => ({ id: `step-${index}`, name: `Action ${index}`, durationMs: 60000 })) }];
  await seed(page, data); await audioSpy(page); await page.goto('/planning');
  await scheduleOptions(page, 'Touch sequence', m);
  await page.getByRole('button', { name: m.editSchedule('Touch sequence'), exact: true }).click();
  const editor = page.getByRole('dialog', { name: m.editScheduleTitle, exact: true });
  const name = editor.getByRole('textbox', { name: m.scheduleName, exact: true });
  const origin = (await name.boundingBox())!.y;
  const repeat = editor.getByRole('button', { name: m.repeatSequence, exact: true }), box = (await repeat.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await context.newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 6; index++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 15 }] });
      await page.waitForTimeout(35);
    }
  } finally {
    try { await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    finally { await session.detach(); }
  }
  await expect.poll(async () => (await name.boundingBox())!.y).toBeLessThan(origin - 30);
  await expect(editor).toBeVisible(); await expect(page.getByRole('dialog', { name: m.repeatSequence, exact: true })).toHaveCount(0);
  expect(await stored(page)).toEqual(data); expect(await playCount(page)).toBe(0);
});

test('typing and calendar, repeat and discard returns retain the whole-editor position and controlled name', async ({ page }) => {
  const data = initialData(); data.preferences.language = 'en';
  data.planning.schedules = [{ id: 'returns', name: 'Return sequence', steps: Array.from({ length: 16 }, (_, index) => ({ id: `return-${index}`, name: `Action ${index}`, durationMs: 60000 })) }];
  await seed(page, data); await page.goto('/planning'); await scheduleOptions(page, 'Return sequence', m);
  await page.getByRole('button', { name: m.editSchedule('Return sequence'), exact: true }).click();
  const editor = page.getByRole('dialog', { name: m.editScheduleTitle, exact: true });
  const name = editor.getByRole('textbox', { name: m.scheduleName, exact: true });
  await name.fill('AB'); await name.press('ArrowLeft'); await name.press('x');
  await expect(name).toHaveValue('AxB'); await expect(name).toBeFocused();
  const owner = await scrollOwner(name);
  for (const label of [m.calendarSchedule, m.repeatSequence]) {
    const button = editor.getByRole('button', { name: label === m.calendarSchedule ? `${label} · ${m.calendarManual}` : label, exact: true });
    await button.click();
    const offset = await owner.evaluate((node) => node.scrollTop);
    await page.getByRole('dialog', { name: label, exact: true }).getByRole('button', { name: m.cancel, exact: true }).click();
    await expect(button).toBeFocused();
    await expect.poll(() => owner.evaluate((node) => node.scrollTop)).toBe(offset);
    await expect(name).toHaveValue('AxB');
  }
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).scrollIntoViewIfNeeded();
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  const offset = await owner.evaluate((node) => node.scrollTop);
  await page.getByRole('dialog', { name: m.discardTitle, exact: true }).getByRole('button', { name: m.continueEditing, exact: true }).click();
  await expect.poll(() => owner.evaluate((node) => node.scrollTop)).toBe(offset);
  await expect(editor.getByRole('button', { name: m.close, exact: true })).toBeFocused();
  await expect(name).toHaveValue('AxB'); expect(await stored(page)).toEqual(data);
});

test('a whole-editor Save and reload preserve literal legacy clocks, history and false preferences', async ({ page }) => {
  const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
  const messages = getMessages('ro');
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, legacy); await audioSpy(page); await page.goto('/planning'); const before = await stored(page);
  await page.getByRole('button', { name: messages.newSchedule, exact: true }).click();
  const editor = page.getByRole('dialog', { name: messages.newSchedule, exact: true });
  await editor.getByRole('textbox', { name: messages.scheduleName, exact: true }).fill('Orar personal · Учёба');
  await editor.getByRole('textbox', { name: messages.stepName(1), exact: true }).fill('Pasul meu');
  await editor.getByRole('button', { name: messages.addStep, exact: true }).click();
  expect(await stored(page)).toEqual(before);
  await editor.getByRole('button', { name: messages.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning?.schedules.length).toBe(1);
  const saved = await stored(page);
  expect(saved.stopwatch).toEqual(legacy.stopwatch); expect(saved.timer).toEqual(legacy.timer); expect(saved.sessions).toEqual(legacy.sessions);
  expect(saved.preferences).toEqual({ ...initialData().preferences, ...legacy.preferences });
  expect(saved.planning.run).toBeNull(); expect(saved.planning.schedules[0].name).toBe('Orar personal · Учёба');
  expect(saved.planning.schedules[0].steps.map(({ durationMs }) => durationMs)).toEqual([300000, 300000]);
  expect(saved.planning.schedules[0].steps[0].name).toBe('Pasul meu'); expect(await playCount(page)).toBe(0);
  await page.reload(); expect(await stored(page)).toEqual(saved);
});
