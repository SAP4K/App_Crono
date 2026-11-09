import { expect, test, type Locator, type Page } from '@playwright/test';
import { initialData } from '../../src/core/stopwatch';
import { initialTimer } from '../../src/core/timer';
import { getMessages } from '../../src/i18n';
import { expectNoPageErrors, observePageErrors, seed, selectWheel, stored } from './helpers';

const m = getMessages('ro');
type Sample = { offset: number; value: number; busy: boolean; at: number };

const warnings = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  observePageErrors(page); const messages: string[] = []; warnings.set(page, messages);
  page.on('console', (message) => { if (message.type() === 'warning' || message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(({ page }) => { expectNoPageErrors(page); expect(warnings.get(page)).toEqual([]); });

async function openPicker(page: Page, screen: 'timer' | 'planning') {
  const data = initialData(); data.timer = initialTimer(20000); data.preferences.timerSound = false;
  data.planning.schedules = [{ id: 'inertia-plan', name: 'Secvență', steps: [
    { id: 'inertia-step', name: 'Acțiune', durationMs: 20000 },
  ] }];
  await seed(page, data);
  await page.addInitScript(() => {
    Object.assign(window, { inertiaWrites: 0 }); const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === '@crono/app-v1') (window as unknown as { inertiaWrites: number }).inertiaWrites++;
      return write.call(this, key, value);
    };
  });
  await page.goto(`/${screen}`);
  if (screen === 'planning') {
    await page.getByRole('button', { name: m.editSchedule('Secvență'), exact: true }).click();
    await page.getByRole('button', { name: m.editStepDuration(1), exact: true }).click();
  }
  const wheel = page.getByRole('spinbutton', { name: screen === 'timer' ? m.timeUnits[2] : m.stepField(m.timeUnits[2], 1), exact: true });
  const action = page.getByRole('button', { name: screen === 'timer' ? m.startTimer : m.applyDuration, exact: true });
  await expect(wheel).toHaveAttribute('aria-valuenow', '20');
  await wheel.scrollIntoViewIfNeeded();
  return { wheel, action, data };
}

test('an unrelated pointer release cannot settle the column held by another pointer', async ({ page }) => {
  const { wheel, action, data } = await openPicker(page, 'timer');
  await wheel.hover(); await page.mouse.down(); await expect(action).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 999, bubbles: true })));
  await page.waitForTimeout(200); // Cross the ordinary idle fallback while the real pointer remains held.
  await expect(action).toBeDisabled(); await page.mouse.move(5, 5); await page.mouse.up();
  await expect(action).toBeEnabled(); await centered(wheel);
  expect((await stored(page)).timer).toEqual(data.timer);
});

test('unsupported scrollend and a wheel at its endpoint recover without changing other columns', async ({ page }) => {
  await page.addInitScript(() => {
    for (const prototype of [HTMLElement.prototype, Element.prototype]) Reflect.deleteProperty(prototype, 'onscrollend');
  });
  const { wheel, action } = await openPicker(page, 'timer');
  expect(await wheel.evaluate((node) => 'onscrollend' in node)).toBe(false);
  await wheel.hover(); await page.mouse.wheel(0, 88);
  await expect(wheel).toHaveAttribute('aria-valuenow', '22'); await expect(action).toBeEnabled(); await centered(wheel);
  await wheel.press('End'); await page.mouse.wheel(0, 1000);
  await expect(action).toBeEnabled(); await centered(wheel);
  await expect(wheel).toHaveAttribute('aria-valuenow', '59');
  expect((await stored(page)).timer.durationMs).toBe(59000);
});

async function centered(wheel: Locator) {
  await expect.poll(() => wheel.evaluate((node) => {
    const row = node.querySelectorAll('button')[Number(node.getAttribute('aria-valuenow'))];
    const box = node.getBoundingClientRect(), selected = row.getBoundingClientRect();
    return Math.abs(selected.y + selected.height / 2 - box.y - box.height / 2);
  })).toBeLessThan(1);
}

async function parentOffsets(wheel: Locator) {
  return wheel.evaluate((node) => {
    const offsets = [window.scrollY];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) offsets.push(parent.scrollTop);
    return offsets;
  });
}

async function flick(page: Page, wheel: Locator, action: Locator, pace: number, duringCoast?: () => Promise<void>, direction = 1) {
  const box = (await wheel.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height * (direction === 1 ? 0.86 : 0.14);
  const button = (await action.elementHandle())!;
  const rowHeight = await wheel.locator('button').first().evaluate((row) => row.getBoundingClientRect().height);
  const session = await page.context().newCDPSession(page);
  const recording = await wheel.evaluateHandle((node, target) => {
    let complete: (motion: { release: number; samples: Sample[] }) => void;
    const done = new Promise<{ release: number; samples: Sample[] }>((resolve) => { complete = resolve; });
    function released() {
      const release = node.scrollTop, samples: Sample[] = [], start = performance.now();
      function frame() {
        samples.push({ offset: node.scrollTop, value: Number(node.getAttribute('aria-valuenow')),
          busy: target.getAttribute('aria-disabled') === 'true' || target.hasAttribute('disabled'), at: performance.now() - start });
        if (performance.now() - start < 650) requestAnimationFrame(frame); else complete({ release, samples });
      }
      requestAnimationFrame(frame);
    }
    node.addEventListener('touchend', released, { once: true, passive: true });
    return { done, cancel: () => node.removeEventListener('touchend', released) };
  }, button);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 3; index++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - index * 120 * direction }] });
      if (index < 3) await page.waitForTimeout(pace); // Gesture velocity; no artificial hold before release.
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const sampling = recording.evaluate((record) => record.done);
    await duringCoast?.();
    const { release, samples } = await sampling;
    return { release, samples, rowHeight, travel: Math.max(...samples.map((sample) => sample.offset)) - release };
  } finally { await recording.evaluate((record) => record.cancel()); await recording.dispose(); await session.detach(); }
}

for (const screen of ['timer', 'planning'] as const) {
  for (const scrollEnd of [true, false]) {
    test(`${screen} prolonged touch stays pending until physical release ${scrollEnd ? 'with scrollend' : 'with fallback'}`, async ({ page }) => {
      if (!scrollEnd) await page.addInitScript(() => {
        for (const prototype of [HTMLElement.prototype, Element.prototype]) Reflect.deleteProperty(prototype, 'onscrollend');
      });
      const { wheel, action } = await openPicker(page, screen);
      expect(await wheel.evaluate((node) => 'onscrollend' in node)).toBe(scrollEnd);
      const before = await stored(page), outer = await parentOffsets(wheel);
      const writes = await page.evaluate(() => (window as unknown as { inertiaWrites: number }).inertiaWrites);
      const box = (await wheel.boundingBox())!;
      const x = box.x + box.width / 2, y = box.y + box.height * 0.86;
      const session = await page.context().newCDPSession(page);
      let held = false;
      try {
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); held = true;
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 80 }] });
        await expect(action).toBeDisabled();
        await page.waitForTimeout(1300); // The finger stays down past both scroll-end recovery deadlines.
        await expect(action).toBeDisabled(); await expect(wheel).toHaveAttribute('aria-valuenow', '20');
        expect(await stored(page)).toEqual(before);
        expect(await page.evaluate(() => (window as unknown as { inertiaWrites: number }).inertiaWrites)).toBe(writes);
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 160 }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); held = false;
        await expect(action).toBeEnabled(); await centered(wheel);
        const selected = Number(await wheel.getAttribute('aria-valuenow'));
        expect(selected).toBeGreaterThan(20); expect(selected).toBeLessThanOrEqual(59);
        expect(await parentOffsets(wheel)).toEqual(outer);
        if (screen === 'timer') await expect.poll(async () => (await stored(page)).timer.durationMs).toBe(selected * 1000);
        else expect(await stored(page)).toEqual(before);
        expect(await page.evaluate(() => (window as unknown as { inertiaWrites: number }).inertiaWrites) - writes).toBe(screen === 'timer' ? 1 : 0);
      } finally {
        try { if (held) await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); }
        finally { await session.detach(); }
      }
    });
  }

  test(`${screen} quick flick continues after release and settles on an exact value`, async ({ page }, info) => {
    const { wheel, action, data } = await openPicker(page, screen);
    const before = await stored(page), outer = await parentOffsets(wheel);
    const slow = await flick(page, wheel, action, 160);
    await expect(action).toBeEnabled(); await centered(wheel);
    expect(await parentOffsets(wheel)).toEqual(outer);
    await selectWheel(wheel, 20);
    const fastOuter = await parentOffsets(wheel);
    const writes = await page.evaluate(() => (window as unknown as { inertiaWrites: number }).inertiaWrites);
    const fast = await flick(page, wheel, action, 8);
    await info.attach('post-release-motion', { body: JSON.stringify({ slow, fast }), contentType: 'application/json' });
    expect(fast.travel).toBeGreaterThanOrEqual(fast.rowHeight);
    expect(fast.travel).toBeGreaterThan(slow.travel);
    expect(fast.samples.some((sample) => sample.busy)).toBe(true);
    for (const [index, sample] of fast.samples.entries()) {
      if (sample.busy) expect(sample.value).toBe(20);
      else expect(fast.samples.slice(index).every((later) => Math.abs(later.offset - sample.offset) < 1)).toBe(true);
    }
    await expect(action).toBeEnabled(); await centered(wheel);
    const selected = Number(await wheel.getAttribute('aria-valuenow'));
    expect(selected).toBeGreaterThan(20); expect(selected).toBeLessThanOrEqual(59);
    expect(await parentOffsets(wheel)).toEqual(fastOuter);
    const after = await stored(page);
    expect(after.stopwatch).toEqual(before.stopwatch); expect(after.sessions).toEqual(before.sessions);
    if (screen === 'timer') expect(after.timer.durationMs).toBe(selected * 1000);
    else { expect(after.planning).toEqual(data.planning); expect(after.timer).toEqual(before.timer); }
    expect(await page.evaluate(() => (window as unknown as { inertiaWrites: number }).inertiaWrites) - writes).toBe(screen === 'timer' ? 1 : 0);
  });

  test(`${screen} rejects a coordinate tap on its action during a coast, then accepts the final value`, async ({ page }) => {
    const { wheel, action, data } = await openPicker(page, screen);
    await flick(page, wheel, action, 8, async () => {
      await expect(action).toBeDisabled();
      const box = (await action.boundingBox())!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      expect((await stored(page)).timer.status).toBe('idle');
      if (screen === 'planning') await expect(page.getByRole('dialog', { name: m.durationPickerTitle(1), exact: true })).toBeVisible();
    });
    await expect(action).toBeEnabled(); await centered(wheel);
    const selected = Number(await wheel.getAttribute('aria-valuenow'));
    expect(selected).toBeGreaterThan(20);
    const beforeAccept = await stored(page);
    expect(beforeAccept.planning).toEqual(data.planning);
    await action.click();
    if (screen === 'timer') {
      await expect.poll(async () => (await stored(page)).timer.status).toBe('running');
      expect((await stored(page)).timer.durationMs).toBe(selected * 1000);
    } else {
      await expect(page.getByRole('button', { name: m.editStepDuration(1), exact: true })).toContainText(`00:00:${String(selected).padStart(2, '0')}`);
      expect((await stored(page)).planning).toEqual(data.planning);
      await page.getByRole('button', { name: m.saveSchedule, exact: true }).click();
      await expect.poll(async () => (await stored(page)).planning.schedules[0].steps[0]).toEqual({
        id: 'inertia-step', name: 'Acțiune', durationMs: selected * 1000,
      });
    }
    const after = await stored(page);
    expect(after.stopwatch).toEqual(data.stopwatch); expect(after.sessions).toEqual(data.sessions);
  });
}

test('overlapping column motion keeps Start gated until both final rows are accepted', async ({ page }) => {
  const { wheel: seconds, action, data } = await openPicker(page, 'timer');
  const minutes = page.getByRole('spinbutton', { name: m.timeUnits[1], exact: true });
  const a = (await minutes.boundingBox())!, b = (await seconds.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.wheel(0, 155);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.wheel(0, 155);
  await expect(action).toBeDisabled();
  await expect(minutes).toHaveAttribute('aria-valuenow', '0');
  await expect(seconds).toHaveAttribute('aria-valuenow', '20');
  const box = (await action.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  expect((await stored(page)).timer.status).toBe('idle');
  await expect(action).toBeEnabled(); await centered(minutes); await centered(seconds);
  expect(Number(await minutes.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  const duration = Number(await minutes.getAttribute('aria-valuenow')) * 60000 + Number(await seconds.getAttribute('aria-valuenow')) * 1000;
  expect(duration).toBeGreaterThan(data.timer.durationMs); expect((await stored(page)).timer.durationMs).toBe(duration);
  await action.click();
  await expect.poll(async () => (await stored(page)).timer.status).toBe('running');
  expect((await stored(page)).timer.durationMs).toBe(duration);
});

test('cancelling Planning during a coast discards pending selection and restores the action focus', async ({ page }) => {
  const { wheel, action, data } = await openPicker(page, 'planning');
  await flick(page, wheel, action, 8, async () => {
    await expect(action).toBeDisabled();
    await page.getByRole('button', { name: m.cancel, exact: true }).click();
  });
  const edit = page.getByRole('button', { name: m.editStepDuration(1), exact: true });
  await expect(edit).toBeFocused(); await expect(edit).toContainText('00:00:20');
  expect((await stored(page)).planning).toEqual(data.planning);
  await edit.click(); await expect(wheel).toHaveAttribute('aria-valuenow', '20'); await centered(wheel);
  await expect(action).toBeEnabled();
});

test('an explicit keyboard choice interrupts a coast without a late value replacing it', async ({ page }) => {
  const { wheel, action } = await openPicker(page, 'timer');
  await flick(page, wheel, action, 8, async () => {
    await expect(action).toBeDisabled(); await wheel.press('Home');
  });
  await expect(wheel).toHaveAttribute('aria-valuenow', '0'); await centered(wheel);
  await expect(action).toBeDisabled(); // Zero stays invalid even after motion has stopped.
  await wheel.press('ArrowUp'); await expect(action).toBeEnabled();
  expect((await stored(page)).timer.durationMs).toBe(1000);
});

test('a reverse flick interrupts the previous coast and rapid explicit choices stay centered with reduced motion', async ({ page }) => {
  const { wheel, action } = await openPicker(page, 'timer');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let interruptedOffset = 0;
  await flick(page, wheel, action, 8, async () => {
    await expect(action).toBeDisabled();
    interruptedOffset = await wheel.evaluate((node) => node.scrollTop);
    await flick(page, wheel, action, 8, undefined, -1);
  });
  await expect(action).toBeEnabled(); await centered(wheel);
  expect(await wheel.evaluate((node) => node.scrollTop)).toBeLessThan(interruptedOffset);
  await flick(page, wheel, action, 8, async () => {
    await expect(action).toBeDisabled();
    await wheel.press('Home'); await wheel.press('ArrowUp');
  });
  await expect(wheel).toHaveAttribute('aria-valuenow', '1'); await centered(wheel); await expect(action).toBeEnabled();
  expect((await stored(page)).timer.durationMs).toBe(1000);
});
