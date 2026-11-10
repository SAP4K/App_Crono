import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initialData } from '../../src/core/stopwatch';
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from '../../src/core/backup';
import { startSchedule } from '../../src/core/planning';
import { getMessages } from '../../src/i18n';
import { expectNoPageErrors, expectTheme, observePageErrors, seed, selectTheme, settings, settingsGroup, stored } from './helpers';
const m = getMessages('ro');
const legacy = JSON.parse(readFileSync(new URL('../fixtures/app-v1-before-planning.json', import.meta.url), 'utf8'));
async function upload(page: Page, raw: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: m.backup.import, exact: true }).click();
  await (await chooser).setFiles({ name: 'crono.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
}
function source() {
  const data = initialData(); data.preferences.theme = 'dark';
  data.planning.schedules = [{ id: 'source', name: 'Școală · Учёба', steps: [{ id: 'work', name: 'Focus', durationMs: 60000 }] }];
  return data;
}
test.beforeEach(({ page }) => observePageErrors(page));
test.afterEach(({ page }) => expectNoPageErrors(page));

test('real legacy backup download/import preserves original history and clocks through editing and reload', async ({ page }) => {
  await seed(page, legacy); await page.goto('/'); await settings(page, 'data');
  const before = await stored(page);
  const preferences = { ...initialData().preferences, ...before.preferences };
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: m.backup.export, exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^crono-backup-.*\.json$/);
  const raw = readFileSync((await download.path())!, 'utf8'); const backup = parseBackup(raw);
  expect(backup.sessions).toEqual(legacy.sessions); expect(backup.preferences).toEqual(preferences);
  expect(Object.keys(JSON.parse(raw))).toEqual(['format', 'version', 'exportedAt', 'schedules', 'sessions', 'preferences']);
  await upload(page, raw);
  await expect(page.getByText(m.backup.counts(0, 1), { exact: true })).toBeVisible();
  expect((await stored(page)).sessions).toEqual(legacy.sessions);
  await expect(page.getByRole('switch', { name: m.backup.applyPreferences, exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(2);
  const after = await stored(page);
  expect(after.stopwatch).toEqual(legacy.stopwatch); expect(after.timer).toEqual(legacy.timer);
  expect(after.sessions.some((session) => session.id === 'legacy-session')).toBe(true);
  expect(new Set(after.sessions.map((session) => session.id)).size).toBe(2);
  expect(after.preferences).toEqual(preferences);
  await page.getByRole('button', { name: m.close, exact: true }).click();
  await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
  await page.getByRole('button', { name: m.planningTemplateNames.focus.name, exact: true }).click();
  await page.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Școală · Учёба');
  await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  await page.reload(); const reloaded = await stored(page);
  expect(reloaded.sessions).toEqual(after.sessions); expect(reloaded.stopwatch).toEqual(legacy.stopwatch);
  expect(reloaded.timer).toEqual(legacy.timer); expect(reloaded.planning.schedules[0].name).toBe('Școală · Учёба');
});

test('literal legacy data survives System selection and real optional backup imports on a Light device', async ({ page }) => {
  await seed(page, legacy); await page.emulateMedia({ colorScheme: 'light' }); await page.goto('/');
  await expectTheme(page, true);
  await settings(page, 'appearance'); await selectTheme(page, 'system'); await expectTheme(page, false);
  const preferences = { ...initialData().preferences, ...legacy.preferences, theme: 'system' };
  await expect.poll(async () => (await stored(page)).preferences).toEqual(preferences);
  const selected = await stored(page);
  expect(selected.stopwatch).toEqual(legacy.stopwatch); expect(selected.timer).toEqual(legacy.timer);
  expect(selected.sessions).toEqual(legacy.sessions);
  await settingsGroup(page, 'data');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: m.backup.export, exact: true }).click();
  const download = await downloading;
  const raw = readFileSync((await download.path())!, 'utf8'); const backup = parseBackup(raw);
  expect(backup.preferences).toEqual(preferences); expect(backup.sessions).toEqual(legacy.sessions);
  await settingsGroup(page, 'appearance'); await selectTheme(page, 'dark'); await expectTheme(page, true);
  await settingsGroup(page, 'data');
  for (const applyPreferences of [false, true]) {
    await upload(page, raw);
    const apply = page.getByRole('switch', { name: m.backup.applyPreferences, exact: true });
    await expect(apply).not.toBeChecked(); if (applyPreferences) await apply.click();
    await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
    await expect.poll(async () => (await stored(page)).sessions.length).toBe(applyPreferences ? 3 : 2);
    const imported = await stored(page);
    expect(imported.preferences).toEqual({ ...preferences, theme: applyPreferences ? 'system' : 'dark' });
    expect(imported.stopwatch).toEqual(legacy.stopwatch); expect(imported.timer).toEqual(legacy.timer);
    expect(imported.planning).toEqual(selected.planning);
    expect(imported.sessions[0]).toEqual(legacy.sessions[0]);
    expect(new Set(imported.sessions.map((session) => session.id)).size).toBe(imported.sessions.length);
    for (const copy of imported.sessions.slice(1)) expect(copy).toEqual({ ...legacy.sessions[0], id: copy.id });
    await expectTheme(page, !applyPreferences);
  }
  const beforeReload = await stored(page);
  await page.reload(); await expectTheme(page, false); expect(await stored(page)).toEqual(beforeReload);
  await settings(page, 'appearance'); await expect(page.getByRole('radio', { name: m.systemMode, exact: true })).toBeChecked();
});

test('a new built-in keeps literal legacy records through unsaved close, editing and real file transfer', async ({ page }) => {
  await seed(page, legacy); await page.goto('/planning'); const before = await stored(page);
  const open = async () => {
    await page.getByRole('button', { name: m.planningTemplates, exact: true }).click();
    await page.getByRole('button', { name: m.planningTemplateNames.morning.name, exact: true }).click();
    return page.getByRole('dialog', { name: m.newSchedule, exact: true });
  };
  let editor = await open();
  expect(await stored(page)).toEqual(before);
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  await expect(editor).not.toBeVisible(); expect(await stored(page)).toEqual(before);
  editor = await open();
  await editor.getByRole('textbox', { name: m.scheduleName, exact: true }).fill('Dimineață · Учёба');
  await editor.getByRole('textbox', { name: m.stepName(1), exact: true }).fill('Primul meu pas');
  // Exercise the literal legacy artifact through a staged duration and discard return before transfer.
  await editor.getByRole('button', { name: m.editStepDuration(1), exact: true }).click();
  await page.getByRole('button', { name: m.cancel, exact: true }).click();
  await editor.getByRole('button', { name: m.close, exact: true }).click();
  await page.getByRole('button', { name: m.continueEditing, exact: true }).click();
  await expect(editor.getByRole('textbox', { name: m.scheduleName, exact: true })).toHaveValue('Dimineață · Учёба');
  await expect(editor.getByRole('textbox', { name: m.stepName(1), exact: true })).toHaveValue('Primul meu pas');
  await editor.getByRole('button', { name: m.saveSchedule, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(1);
  await page.reload(); const saved = await stored(page), original = saved.planning.schedules[0];
  expect(saved.version).toBe(1); expect(saved.stopwatch).toEqual(legacy.stopwatch); expect(saved.timer).toEqual(legacy.timer);
  expect(saved.sessions).toEqual(legacy.sessions);
  expect(saved.preferences).toEqual({ ...initialData().preferences, ...legacy.preferences });
  expect(original.steps.map((step) => step.durationMs)).toEqual([300000, 600000, 600000, 900000]);
  await settings(page, 'data');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: m.backup.export, exact: true }).click();
  const raw = readFileSync((await (await downloading).path())!, 'utf8'), file = parseBackup(raw);
  expect(file.version).toBe(1); expect(file.schedules).toEqual([original]); expect(file.sessions).toEqual(legacy.sessions);
  expect(file.preferences).toEqual(saved.preferences);
  await upload(page, raw);
  await expect(page.getByRole('switch', { name: m.backup.applyPreferences, exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  const imported = await stored(page), copy = imported.planning.schedules[1];
  expect(imported.planning.schedules[0]).toEqual(original); expect(copy.id).not.toBe(original.id);
  expect(copy.steps).toEqual(original.steps.map((step, index) => ({ ...step, id: copy.steps[index].id })));
  expect(copy.steps.every((step, index) => step.id !== original.steps[index].id)).toBe(true);
  expect(copy.name).toBe('Dimineață · Учёба'); expect(imported.planning.run).toBeNull();
  expect(imported.sessions[0]).toEqual(legacy.sessions[0]); expect(imported.sessions).toHaveLength(2);
  expect(imported.sessions[1]).toEqual({ ...legacy.sessions[0], id: imported.sessions[1].id });
  expect(imported.sessions[1].id).not.toBe(legacy.sessions[0].id);
  expect(imported.stopwatch).toEqual(legacy.stopwatch); expect(imported.timer).toEqual(legacy.timer);
  expect(imported.preferences).toEqual(saved.preferences);
  await page.reload(); expect(await stored(page)).toEqual(imported);
});

test('confirmation preserves clocks that changed during preview and repeated imports create independent schedules', async ({ page }) => {
  await page.clock.install(); const now = Date.now(); const data = initialData(); data.preferences.timerSound = false;
  data.stopwatch.startedAt = now; data.timer = { ...data.timer, durationMs: 15000, remainingMs: 15000, status: 'running', deadlineAt: now + 15000, runId: 'live' };
  data.planning = startSchedule(source().planning, 'source', now, 'protected');
  await seed(page, data); await page.goto('/'); await settings(page, 'data');
  const raw = serializeBackup(source(), now); await upload(page, raw);
  await expect(page.getByText(m.backup.review, { exact: true })).toBeVisible();
  await page.clock.runFor(16000); const latest = await stored(page); expect(latest.timer.status).toBe('completed');
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  const after = await stored(page);
  expect(after.timer).toEqual(latest.timer); expect(after.stopwatch).toEqual(latest.stopwatch);
  expect(after.planning.run).toEqual(latest.planning.run); expect(after.preferences).toEqual(latest.preferences);
  expect(after.preferences.theme).toBe('system');
  expect(after.planning.schedules[0]).toEqual(data.planning.schedules[0]);
  expect(after.planning.schedules[1].id).not.toBe('source'); expect(after.planning.schedules[1].steps[0].id).not.toBe('work');
  await upload(page, raw); await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(3);
  expect(new Set((await stored(page)).planning.schedules.map((schedule) => schedule.id)).size).toBe(3);
});

test('preferences apply only by explicit choice and Cancel leaves all saved data unchanged', async ({ page }) => {
  await seed(page); await page.goto('/'); await settings(page, 'data');
  const value = source(); value.preferences.language = 'en'; const raw = serializeBackup(value, 1);
  const before = await stored(page); await upload(page, raw);
  await page.getByRole('switch', { name: m.backup.applyPreferences, exact: true }).click();
  await page.getByRole('button', { name: m.cancel, exact: true }).click(); expect(await stored(page)).toEqual(before);
  await upload(page, raw); await expect(page.getByRole('switch', { name: m.backup.applyPreferences, exact: true })).not.toBeChecked();
  await page.getByRole('switch', { name: m.backup.applyPreferences, exact: true }).click();
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  const en = getMessages('en'); await expect(page.getByText(en.backup.imported, { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).preferences.language).toBe('en');
  expect((await stored(page)).preferences.theme).toBe('dark');
  await page.reload(); expect((await stored(page)).preferences.language).toBe('en');
});

for (const theme of ['system', 'light', 'dark'] as const) test(`real ${theme} backup preserves selection across optional import and reload`, async ({ page }) => {
  const data = source(); data.preferences.theme = theme;
  await seed(page, data); await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/'); await settings(page, 'data');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: m.backup.export, exact: true }).click();
  const download = await downloading; const raw = readFileSync((await download.path())!, 'utf8');
  expect(parseBackup(raw).preferences.theme).toBe(theme);
  await page.getByRole('button', { name: m.close, exact: true }).click();
  await settings(page, 'appearance'); const manual = theme === 'light' ? 'dark' : 'light'; await selectTheme(page, manual);
  await page.getByRole('button', { name: m.close, exact: true }).click(); await settings(page, 'data');
  await upload(page, raw); await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(2);
  expect((await stored(page)).preferences.theme).toBe(manual);
  await upload(page, raw); await page.getByRole('switch', { name: m.backup.applyPreferences, exact: true }).click();
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect.poll(async () => (await stored(page)).planning.schedules.length).toBe(3);
  expect((await stored(page)).preferences.theme).toBe(theme); await expectTheme(page, theme !== 'light');
  await page.reload(); expect((await stored(page)).preferences.theme).toBe(theme);
  expect(new Set((await stored(page)).planning.schedules.map((item) => item.id)).size).toBe(3);
});

test('unknown portable theme rejects the whole real file without applying any records', async ({ page }) => {
  await seed(page); await page.goto('/'); await settings(page, 'data');
  const before = await stored(page); const file = JSON.parse(serializeBackup(source(), 1)); file.preferences.theme = 'auto';
  await upload(page, JSON.stringify(file));
  await expect(page.getByText(m.backup.errors.invalid, { exact: true })).toBeVisible(); expect(await stored(page)).toEqual(before);
});

for (const failure of ['invalid', 'version', 'size', 'capacity'] as const) {
  test(`real file import reports ${failure} without changing saved data`, async ({ page }) => {
    const data = initialData();
    if (failure === 'capacity') data.planning.schedules = Array.from({ length: 20 }, (_, i) => ({ ...source().planning.schedules[0], id: `full-${i}` }));
    await seed(page, data); await page.goto('/'); await settings(page, 'data'); const before = await stored(page);
    const raw = failure === 'invalid' ? '{' : failure === 'size' ? ' '.repeat(MAX_BACKUP_BYTES + 1)
      : failure === 'version' ? JSON.stringify({ ...JSON.parse(serializeBackup(source(), 1)), version: 2 }) : serializeBackup(source(), 1);
    await upload(page, raw);
    if (failure === 'capacity') await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
    await expect(page.getByText(m.backup.errors[failure], { exact: true })).toBeVisible(); expect(await stored(page)).toEqual(before);
  });
}

test('an accepted import keeps storage failure feedback visible instead of claiming a durable save', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') throw new Error('Test persistence failure');
      return write.call(this, key, value);
    };
  });
  await page.goto('/'); await settings(page, 'data');
  await upload(page, serializeBackup(source(), 1));
  await page.getByRole('button', { name: m.backup.confirm, exact: true }).click();
  await expect(page.getByText(m.backup.imported, { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText(m.storageWarning, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: m.close, exact: true }).click();
  await page.getByRole('tab', { name: m.planningTab, exact: true }).click();
  await expect(page.getByRole('button', { name: m.startSchedule('Școală · Учёба'), exact: true })).toBeVisible();
  expect((await stored(page)).planning.schedules).toEqual([]);
});

test('a failed web download releases its link and object URL without changing saved data', async ({ page }) => {
  await page.clock.install(); await seed(page); await page.goto('/'); await settings(page, 'data');
  await page.evaluate(() => {
    Object.assign(window, { backupRevocations: 0 });
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => { (window as unknown as { backupRevocations: number }).backupRevocations++; revoke(url); };
    HTMLAnchorElement.prototype.click = () => { throw new Error('Test browser download failure'); };
  });
  const before = await stored(page);
  await page.getByRole('button', { name: m.backup.export, exact: true }).click();
  await expect(page.getByText(m.backup.errors.file, { exact: true })).toBeVisible();
  await expect(page.locator('a[download]')).toHaveCount(0);
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => (window as unknown as { backupRevocations: number }).backupRevocations)).toBe(1);
  expect(await stored(page)).toEqual(before);
});
