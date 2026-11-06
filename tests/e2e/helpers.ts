import { expect, type Locator, type Page } from '@playwright/test';
import { initialData, type AppData } from '../../src/core/stopwatch';
import { getMessages } from '../../src/i18n';
import type { Messages } from '../../src/i18n/types';

const pageErrors = new WeakMap<Page, string[]>();
export function observePageErrors(page: Page) {
  const errors: string[] = []; pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
}
export function expectNoPageErrors(page: Page) {
  expect(pageErrors.get(page) ?? []).toEqual([]);
}

export async function seed(page: Page, data: unknown = initialData()) {
  await page.addInitScript((value) => {
    // Seed only the fresh context, so reload tests exercise real persisted writes.
    if (!sessionStorage.getItem('crono-test-seeded')) {
      localStorage.setItem('@crono/app-v1', JSON.stringify(value));
      sessionStorage.setItem('crono-test-seeded', 'yes');
    }
  }, data);
}

export async function stored(page: Page): Promise<AppData> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('@crono/app-v1')!));
}

export async function audioSpy(page: Page, blocked = false) {
  await page.addInitScript((deny) => {
    Object.assign(window, { timerPlayCount: 0, audioEvents: [] });
    HTMLMediaElement.prototype.play = function () {
      const target = window as unknown as { timerPlayCount: number; audioEvents: MediaEvent[] };
      target.timerPlayCount++;
      target.audioEvents.push({ type: 'play', src: this.src, loop: this.loop, at: Date.now() });
      return deny ? Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError')) : Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      const target = window as unknown as { audioEvents: MediaEvent[] };
      target.audioEvents.push({ type: 'pause', src: this.src, loop: this.loop, at: Date.now() });
    };
  }, blocked);
}

export type MediaEvent = { type: 'play' | 'pause'; src: string; loop: boolean; at: number };
export async function audioEvents(page: Page): Promise<MediaEvent[]> {
  return page.evaluate(() => (window as unknown as { audioEvents: MediaEvent[] }).audioEvents);
}

export async function playCount(page: Page) {
  return page.evaluate(() => (window as unknown as { timerPlayCount: number }).timerPlayCount);
}

export async function selectWheel(wheel: Locator, value: number) {
  await expect(wheel).toHaveAttribute('aria-disabled', 'false');
  const maximum = Number(await wheel.getAttribute('aria-valuemax'));
  expect(Number.isInteger(value) && value >= 0 && value <= maximum).toBe(true);
  if (Number(await wheel.getAttribute('aria-valuenow')) === value) return;
  const fromEnd = maximum - value < value;
  await wheel.press(fromEnd ? 'End' : 'Home');
  for (let index = 0; index < (fromEnd ? maximum - value : value); index++) {
    await wheel.press(fromEnd ? 'ArrowDown' : 'ArrowUp');
  }
  await expect(wheel).toHaveAttribute('aria-valuenow', String(value));
}

export async function selectDuration(scope: Page | Locator, parts: readonly [number, number, number], messages: Messages = getMessages('ro'), stepNumber?: number) {
  for (const [index, value] of parts.entries()) {
    const name = stepNumber === undefined ? messages.timeUnits[index] : messages.stepField(messages.timeUnits[index], stepNumber);
    await selectWheel(scope.getByRole('spinbutton', { name, exact: true }), value);
  }
}

export async function duration(page: Page, seconds: string, messages: Messages = getMessages('ro')) {
  await selectDuration(page, [0, 0, Number(seconds)], messages);
}

export async function stepDuration(page: Page, stepNumber: number, parts: readonly [number, number, number], messages: Messages = getMessages('ro')) {
  await page.getByRole('button', { name: messages.editStepDuration(stepNumber), exact: true }).click();
  const panel = page.getByRole('dialog', { name: messages.durationPickerTitle(stepNumber), exact: true });
  await selectDuration(panel, parts, messages, stepNumber);
  await panel.getByRole('button', { name: messages.applyDuration, exact: true }).click();
  await expect(panel).not.toBeVisible();
}

export async function settings(page: Page) {
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  return page.getByRole('dialog', { name: 'În stilul tău.' });
}

export async function expectTheme(page: Page, dark: boolean) {
  await expect(page.locator('body')).toHaveCSS('background-color', dark ? 'rgb(2, 6, 23)' : 'rgb(226, 232, 240)');
}
