export const lightPalette = {
  background: '#FFFFFF', surface: '#F8FAFC', ink: '#0F172A',
  muted: '#475569', subtle: '#64748B', border: '#CBD5E1',
  lime: '#2563EB', limeSoft: '#EFF6FF', green: '#1D4ED8',
  danger: '#B91C1C', dangerSoft: '#FEF2F2',
  desktop: '#E2E8F0', secondary: '#F1F5F9', disabled: '#E2E8F0',
  selected: '#DBEAFE', iconSurface: '#EFF6FF', empty: '#F8FAFC',
  summary: '#EFF6FF', badge: '#DBEAFE', badgeText: '#1E40AF',
  action: '#2563EB', actionText: '#FFFFFF', actionIcon: '#FFFFFF',
  featured: '#EFF6FF', featuredMuted: '#475569', onAccent: '#FFFFFF',
  toast: '#EFF6FF', toastText: '#0F172A',
  tickMajor: '#64748B', tickMinor: '#CBD5E1', handle: '#94A3B8',
  overlay: 'rgba(15,23,42,0.45)', shadow: '0 6px 20px rgba(15,23,42,0.18)',
};

export type Palette = { [K in keyof typeof lightPalette]: string };

export const darkPalette: Palette = {
  background: '#0F172A', surface: '#1E293B', ink: '#F8FAFC',
  muted: '#CBD5E1', subtle: '#94A3B8', border: '#475569',
  lime: '#60A5FA', limeSoft: '#172554', green: '#93C5FD',
  danger: '#FCA5A5', dangerSoft: '#450A0A',
  desktop: '#020617', secondary: '#1E293B', disabled: '#334155',
  selected: '#1E3A8A', iconSurface: '#172554', empty: '#111C32',
  summary: '#172554', badge: '#1E3A8A', badgeText: '#DBEAFE',
  action: '#60A5FA', actionText: '#0F172A', actionIcon: '#0F172A',
  featured: '#172554', featuredMuted: '#CBD5E1', onAccent: '#0F172A',
  toast: '#1E293B', toastText: '#F8FAFC',
  tickMajor: '#94A3B8', tickMinor: '#334155', handle: '#64748B',
  overlay: 'rgba(2,6,23,0.70)', shadow: '0 6px 20px rgba(0,0,0,0.45)',
};

export const palettes = { light: lightPalette, dark: darkPalette };

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
};
