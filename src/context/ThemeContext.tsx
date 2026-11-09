import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { useCrono } from './CronoContext';
import { palettes, Palette } from '../theme';
import type { ThemeMode } from '../core/stopwatch';
import { useSystemTheme } from '../hooks/useSystemTheme';
import { createThemeBackground } from '../hooks/themeAppearance';

const ThemeContext = createContext<{ mode: ThemeMode; colors: Palette } | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const { data, ready } = useCrono();
  const mode = useSystemTheme(data.preferences.theme, ready);
  const colors = palettes[mode];
  const value = useMemo(() => ({ mode, colors }), [mode, colors]);
  const navigationTheme = useMemo(() => ({
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: colors.green, background: colors.background, card: colors.surface,
      text: colors.ink, border: colors.border, notification: colors.lime,
    },
  }), [mode, colors]);

  const background = useMemo(() => createThemeBackground({
    write: (color) => SystemUI.setBackgroundColorAsync(color),
    warn: () => console.warn('[theme] root-background'),
  }), []);
  useEffect(() => { background.activate(); return () => background.dispose(); }, [background]);
  useEffect(() => {
    if (!ready) return;
    if (Platform.OS === 'web') {
      document.documentElement.style.colorScheme = mode;
      document.body.style.backgroundColor = colors.desktop;
      return;
    }
    background.setColor(colors.background);
  }, [ready, mode, colors, background]);

  return <ThemeContext.Provider value={value}>
    <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
  </ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

export function useThemeStyles<T>(create: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => create(colors), [create, colors]);
}
