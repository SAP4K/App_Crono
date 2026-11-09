export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | ThemeMode;
export const DEFAULT_THEME: ThemePreference = 'system';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function restoreThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME;
}

export function resolveThemeMode(preference: ThemePreference, appearance: unknown): ThemeMode {
  return preference === 'system' ? (appearance === 'dark' ? 'dark' : 'light') : preference;
}
