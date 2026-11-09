import { Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { SettingsSwitchProps } from './SettingsSwitch.types';

export function SettingsSwitch(props: SettingsSwitchProps) {
  const { colors } = useTheme();
  return <Switch {...props} hitSlop={12} trackColor={{ false: colors.border, true: colors.lime }}
    thumbColor={colors.surface} ios_backgroundColor={colors.border} />;
}
