import { useLayoutEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { resolveThemeMode, type ThemeMode, type ThemePreference } from '../core/themePreference';
import { isAppActive, subscribeAppActivity } from './appActivity';
import { createThemeAppearance } from './themeAppearance';

export function useSystemTheme(preference: ThemePreference, ready: boolean): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try { return resolveThemeMode('system', Appearance.getColorScheme()); }
    catch { return 'light'; }
  });
  const controller = useMemo(() => createThemeAppearance({
    read: () => Appearance.getColorScheme(),
    override: Platform.OS === 'web' ? undefined : (choice) => Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice),
    subscribe: (changed) => {
      const subscription = Appearance.addChangeListener(changed);
      return () => subscription.remove();
    },
    subscribeActivity: subscribeAppActivity,
    isActive: isAppActive,
    changed: setMode,
    warn: (code) => console.warn(`[theme] ${code}`),
  }), []);
  useLayoutEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  useLayoutEffect(() => { controller.configure(preference, ready); }, [controller, preference, ready]);
  return resolveThemeMode(preference, mode);
}
