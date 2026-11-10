import { useTheme } from '../context/ThemeContext';
import { useMotionPreference } from '../context/MotionContext';
import { motionTokens } from '../theme';
import type { SettingsSwitchProps } from './SettingsSwitch.types';

export function SettingsSwitch({ accessibilityLabel, value, disabled, onValueChange }: SettingsSwitchProps) {
  const { colors } = useTheme();
  const { reduceMotion, active } = useMotionPreference();
  const transition = !reduceMotion && active && !disabled ? `${motionTokens.releaseMs}ms ease-out` : undefined;
  return <button type="button" role="switch" aria-label={accessibilityLabel} aria-checked={value} disabled={disabled}
    onClick={() => onValueChange(!value)} style={{ flexShrink: 0, minWidth: 48, minHeight: 44, padding: 4, border: 0,
      borderRadius: 12, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, outlineColor: colors.green }}>
    <span aria-hidden style={{ display: 'block', position: 'relative', width: 40, height: 22, borderRadius: 11,
      backgroundColor: value ? colors.lime : colors.border, transition: transition ? `background-color ${transition}` : 'none' }}>
      <span style={{ position: 'absolute', top: 2, left: 2, transform: `translateX(${value ? 18 : 0}px)`,
        transition: transition ? `transform ${transition}` : 'none', width: 18, height: 18, borderRadius: '50%',
        background: colors.surface, border: `1px solid ${colors.subtle}`, boxSizing: 'border-box' }} />
    </span>
  </button>;
}
