import { useTheme } from '../context/ThemeContext';
import type { SettingsSwitchProps } from './SettingsSwitch.types';

export function SettingsSwitch({ accessibilityLabel, value, disabled, onValueChange }: SettingsSwitchProps) {
  const { colors } = useTheme();
  return <button type="button" role="switch" aria-label={accessibilityLabel} aria-checked={value} disabled={disabled}
    onClick={() => onValueChange(!value)} style={{ flexShrink: 0, minWidth: 48, minHeight: 44, padding: 4, border: 0,
      borderRadius: 12, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, outlineColor: colors.green }}>
    <span aria-hidden style={{ display: 'block', position: 'relative', width: 40, height: 22, borderRadius: 11,
      background: value ? colors.lime : colors.border }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
        background: colors.surface, border: `1px solid ${colors.subtle}`, boxSizing: 'border-box' }} />
    </span>
  </button>;
}
