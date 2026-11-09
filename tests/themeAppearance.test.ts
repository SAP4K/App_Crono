import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createThemeAppearance, createThemeBackground } from '../src/hooks/themeAppearance.ts';
import type { ThemeMode, ThemePreference } from '../src/core/themePreference.ts';

function fixture(native = true) {
  let system: unknown = 'dark', cached: unknown = system, active = true;
  let appearanceChanged = () => {}, activityChanged = () => {};
  const modes: ThemeMode[] = [], overrides: ThemePreference[] = [], warnings: string[] = [];
  let removed = 0;
  const controller = createThemeAppearance({
    read: () => cached,
    override: native ? (choice) => { overrides.push(choice); cached = choice === 'system' ? system : choice; } : undefined,
    subscribe: (changed) => { appearanceChanged = changed; return () => { removed++; }; },
    subscribeActivity: (changed) => { activityChanged = changed; return () => { removed++; }; },
    isActive: () => active, changed: (mode) => modes.push(mode), warn: (code) => warnings.push(code),
  });
  return { controller, modes, overrides, warnings, removed: () => removed,
    snapshot: (value: unknown) => { system = cached = value; },
    systemOnly: (value: unknown) => { system = value; },
    appearance: () => appearanceChanged(), activity: (value: boolean) => { active = value; activityChanged(); },
    stale: () => appearanceChanged,
  };
}

test('appearance waits for hydration, suppresses duplicates and keeps manual precedence', () => {
  const f = fixture(); f.controller.activate();
  assert.deepEqual(f.modes, []); assert.deepEqual(f.overrides, []);
  f.controller.configure('system', true);
  assert.deepEqual(f.modes, ['dark']);
  f.appearance(); f.controller.configure('system', true);
  assert.deepEqual(f.modes, ['dark']); assert.deepEqual(f.overrides, ['system']);
  f.snapshot('light'); f.appearance(); assert.equal(f.modes.at(-1), 'light');
  f.controller.configure('dark', true); f.snapshot('light'); f.appearance();
  assert.equal(f.modes.at(-1), 'dark'); assert.deepEqual(f.overrides, ['system', 'dark']);
});

for (const manual of ['light', 'dark'] as const) test(`return from ${manual} rereads the actual system without a reset event`, () => {
  const f = fixture(); f.controller.configure(manual, true); f.controller.activate();
  f.systemOnly(manual === 'light' ? 'dark' : 'light');
  f.controller.configure('system', true);
  assert.equal(f.modes.at(-1), manual === 'light' ? 'dark' : 'light');
  assert.deepEqual(f.overrides, [manual, 'system']);
  f.controller.configure('dark', true); f.systemOnly('light'); f.controller.configure('system', true);
  assert.equal(f.modes.at(-1), 'light');
});

test('foreground refreshes missed snapshots, unavailable appearance falls back, web never overrides', () => {
  const f = fixture(false); f.controller.activate(); f.controller.configure('system', true);
  f.activity(false); f.snapshot('light'); assert.equal(f.modes.at(-1), 'dark');
  f.activity(true); assert.equal(f.modes.at(-1), 'light');
  f.snapshot(null); f.appearance(); assert.equal(f.modes.at(-1), 'light');
  f.snapshot('dark'); f.appearance(); assert.equal(f.modes.at(-1), 'dark');
  assert.deepEqual(f.overrides, []);
});

test('native foreground refreshes a cached System snapshot after a missed OS change', () => {
  const f = fixture(); f.controller.activate(); f.controller.configure('system', true);
  f.activity(false); f.systemOnly('light'); f.activity(true);
  assert.equal(f.modes.at(-1), 'light');
  f.controller.configure('dark', true);
  const count = f.overrides.length;
  f.activity(false); f.systemOnly('light'); f.activity(true);
  assert.equal(f.modes.at(-1), 'dark'); assert.equal(f.overrides.length, count);
});

test('disposal and failed hydration fence stale callbacks and permit effect reactivation', () => {
  const f = fixture(); f.controller.activate(); f.controller.configure('system', true);
  const stale = f.stale(); f.controller.dispose(); f.snapshot('light'); stale();
  assert.deepEqual(f.modes, ['dark']); assert.equal(f.removed(), 2);
  f.controller.activate(); assert.equal(f.modes.at(-1), 'light');
  f.controller.configure('system', false); const count = f.modes.length;
  f.snapshot('dark'); f.appearance(); f.controller.configure('dark', false);
  assert.equal(f.modes.length, count); assert.equal(f.removed(), 4);
  f.controller.configure('system', true); assert.equal(f.modes.at(-1), 'dark');
});

test('native failures are scoped, fall back safely, retry on foreground and clean up independently', () => {
  const warnings: string[] = [], modes: ThemeMode[] = [];
  let failing = true, callback = () => {}, removed = false;
  const c = createThemeAppearance({ read: () => 'dark', override: () => { if (failing) throw Error('native'); },
    subscribe: () => () => { throw Error('cleanup'); }, subscribeActivity: (changed) => { callback = changed; return () => { removed = true; }; },
    isActive: () => true, changed: (mode) => modes.push(mode), warn: (code) => warnings.push(code) });
  c.activate(); c.configure('system', true); assert.equal(modes.at(-1), 'light');
  failing = false; callback(); assert.equal(modes.at(-1), 'dark');
  c.dispose(); assert.equal(removed, true);
  assert.deepEqual(warnings, ['appearance-override', 'appearance-cleanup']);
});

test('native background writes serialize, coalesce to the latest color and discard disposed work', async () => {
  const writes: string[] = [], releases: (() => void)[] = [];
  const writer = createThemeBackground({ write: (color) => { writes.push(color); return new Promise<void>((resolve) => releases.push(resolve)); }, warn: () => assert.fail('unexpected failure') });
  writer.activate(); writer.setColor('light'); writer.setColor('dark'); writer.setColor('light'); writer.setColor('dark');
  assert.deepEqual(writes, ['light']); releases.shift()!(); await Promise.resolve();
  assert.deepEqual(writes, ['light', 'dark']);
  writer.setColor('light'); writer.dispose(); releases.shift()!(); await Promise.resolve();
  assert.deepEqual(writes, ['light', 'dark']);
  writer.activate(); writer.setColor('light'); assert.equal(writes.at(-1), 'light');
  releases.shift()!(); await Promise.resolve(); writer.setColor('light');
  assert.equal(writes.length, 3);
});

test('a failed background write reports once and does not block a newer request', async () => {
  let reject: (error: Error) => void = () => {}, warnings = 0;
  const writes: string[] = [];
  const writer = createThemeBackground({ write: (color) => {
    writes.push(color); return writes.length === 1 ? new Promise<void>((_, fail) => { reject = fail; }) : Promise.resolve();
  }, warn: () => { warnings++; } });
  writer.activate(); writer.setColor('old'); writer.setColor('new'); reject(Error('native'));
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(writes, ['old', 'new']); assert.equal(warnings, 1);
});
