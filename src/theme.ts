export const lightPalette = {
  background: '#F6F7F2', surface: '#FFFFFF', ink: '#20271F',
  muted: '#606B58', subtle: '#929D88', border: '#DEE4D5',
  lime: '#D1F26F', limeSoft: '#EDF5DA', green: '#4F6B27',
  danger: '#A33F32', dangerSoft: '#FAEEE9',
  desktop: '#E8ECDD', secondary: '#E8EDDD', disabled: '#ECEFE5',
  selected: '#E8EEDC', iconSurface: '#E9EEDD', empty: '#EFF2E8',
  summary: '#EDF0E6', badge: '#DCE5CB', badgeText: '#4F642F',
  action: '#20271F', actionText: '#F6F7F2', actionIcon: '#D1F26F',
  featured: '#20271F', featuredMuted: '#C0C8B6', onAccent: '#20271F',
  toast: '#20271F', toastText: '#F6F7F2',
  tickMajor: '#929D88', tickMinor: '#D6DCCB', handle: '#B6C0AA',
  overlay: 'rgba(15,22,12,0.45)', shadow: '0 6px 20px rgba(15,22,12,0.2)',
};

export type Palette = { [K in keyof typeof lightPalette]: string };

export const darkPalette: Palette = {
  background: '#141A15', surface: '#1D251E', ink: '#EEF3E7',
  muted: '#A8B5A2', subtle: '#71816E', border: '#344132',
  lime: '#D1F26F', limeSoft: '#29361F', green: '#B2D883',
  danger: '#F19E8F', dangerSoft: '#3B2421',
  desktop: '#0D120E', secondary: '#263024', disabled: '#202920',
  selected: '#303F25', iconSurface: '#2C3826', empty: '#1B241B',
  summary: '#253021', badge: '#344727', badgeText: '#D1F26F',
  action: '#D1F26F', actionText: '#20271F', actionIcon: '#20271F',
  featured: '#202C1E', featuredMuted: '#BECDB4', onAccent: '#20271F',
  toast: '#303F25', toastText: '#EEF3E7',
  tickMajor: '#71816E', tickMinor: '#344132', handle: '#56644E',
  overlay: 'rgba(0,0,0,0.65)', shadow: '0 6px 20px rgba(0,0,0,0.45)',
};

export const palettes = { light: lightPalette, dark: darkPalette };

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
};
