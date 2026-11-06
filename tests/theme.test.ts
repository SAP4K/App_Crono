import assert from 'node:assert/strict';
import { test } from 'node:test';
import { palettes } from '../src/theme.ts';

function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

for (const [mode, c] of Object.entries(palettes)) {
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
