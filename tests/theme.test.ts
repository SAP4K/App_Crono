import assert from 'node:assert/strict';
import { test } from 'node:test';
import { palettes } from '../src/theme.ts';
import { DEFAULT_THEME, isThemePreference, resolveThemeMode, restoreThemePreference } from '../src/core/themePreference.ts';

test('theme preferences default to System and strictly preserve supported saved choices', () => {
  assert.equal(DEFAULT_THEME, 'system');
  for (const value of ['system', 'light', 'dark'] as const) {
    assert.equal(isThemePreference(value), true);
    assert.equal(restoreThemePreference(value), value);
  }
  for (const value of [undefined, null, '', 'DARK', 'auto', 'unspecified', true, 1, {}, []]) {
    assert.equal(isThemePreference(value), false);
    assert.equal(restoreThemePreference(value), 'system');
  }
});

for (const [preference, darkAppearance, otherAppearance] of [
  ['system', 'dark', 'light'],
  ['light', 'light', 'light'],
  ['dark', 'dark', 'dark'],
] as const) {
  test(`${preference} resolves against both system modes and unavailable appearance`, () => {
    assert.equal(resolveThemeMode(preference, 'dark'), darkAppearance);
    for (const appearance of ['light', null, undefined, 'unspecified', 'unknown']) {
      assert.equal(resolveThemeMode(preference, appearance), otherAppearance);
    }
  });
}

function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

for (const [mode, c] of Object.entries(palettes)) {
  test(`${mode} interactive boundaries and focus remain visible on their surfaces`, () => {
    for (const [foreground, background] of [
      [c.border, c.background], [c.border, c.surface],
      [c.green, c.background], [c.green, c.surface], [c.green, c.selected],
    ]) {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 3, `${foreground} on ${background}`);
    }
  });
  test(`${mode} text roles meet 4.5:1 contrast on their actual surfaces`, () => {
    const pairs = [
      [c.ink, c.background], [c.ink, c.surface], [c.muted, c.background], [c.muted, c.surface],
      [c.muted, c.secondary], [c.green, c.limeSoft], [c.danger, c.dangerSoft],
      [c.actionText, c.action], [c.onAccent, c.lime], [c.lime, c.featured],
      [c.featuredMuted, c.featured], [c.toastText, c.toast], [c.badgeText, c.badge],
      [c.ink, c.selected], [c.ink, c.secondary], [c.ink, c.limeSoft],
      [c.ink, c.empty], [c.muted, c.empty], [c.muted, c.limeSoft],
      [c.muted, c.selected], [c.muted, c.summary], [c.green, c.background],
      [c.green, c.surface], [c.green, c.summary], [c.green, c.selected],
      [c.green, c.badge], [c.ink, c.iconSurface], [c.lime, c.toast],
      [c.actionIcon, c.action], [c.danger, c.background], [c.danger, c.surface],
    ];
    for (const [foreground, background] of pairs) {
      const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${foreground} on ${background}`);
    }
  });
}
