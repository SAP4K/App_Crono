import { expect, type Page } from '@playwright/test';
import { initialData, type AppData } from '../../src/core/stopwatch';

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

export async function duration(page: Page, seconds: string) {
  await page.getByLabel('Ore', { exact: true }).fill('00');
  await page.getByLabel('Minute', { exact: true }).fill('00');
  await page.getByLabel('Secunde', { exact: true }).fill(seconds);
}

export async function settings(page: Page) {
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  return page.getByRole('dialog', { name: 'În stilul tău.' });
}

export async function expectTheme(page: Page, dark: boolean) {
  await expect(page.locator('body')).toHaveCSS('background-color', dark ? 'rgb(13, 18, 14)' : 'rgb(232, 236, 221)');
}
