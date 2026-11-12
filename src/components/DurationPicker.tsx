import { useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { DURATION_LIMITS, DURATION_UNITS } from '../core/durationPicker';
import type { DurationParts, DurationUnit } from '../core/durationPicker';
import { useI18n } from '../hooks/useI18n';
import { DurationWheel } from './DurationWheel';
import { useThemeStyles } from '../context/ThemeContext';
import { radii, type Palette } from '../theme';

type Props = {
  value: DurationParts; onChange: (changes: Partial<DurationParts>) => void;
  disabled?: boolean; onInteractionChange?: (busy: boolean) => void;
  stepNumber?: number; autoFocus?: boolean;
  presentationRequest?: number; presentationActive?: boolean;
};
export function DurationPicker({ value, onChange, disabled, onInteractionChange, stepNumber, autoFocus, presentationRequest, presentationActive }: Props) {
  const { messages: m } = useI18n();
  const { fontScale } = useWindowDimensions();
  const styles = useThemeStyles(createStyles);
  const moving = useRef(new Set<DurationUnit>());
  const rowHeight = Math.max(44, Math.ceil(40 * fontScale));
  return <View testID="duration-picker" style={styles.wheels}>
    <View testID="duration-selection" pointerEvents="none" style={[styles.selection, { top: rowHeight + 12, height: rowHeight }]} />
    {DURATION_UNITS.map((unit, index) => <DurationWheel key={unit} value={value[unit]} maximum={DURATION_LIMITS[unit]}
      label={m.timeUnits[index]} hint={m.durationWheelHint} rowHeight={rowHeight} disabled={disabled}
      presentationRequest={presentationRequest} presentationActive={presentationActive}
      autoFocus={autoFocus && index === 0} accessibilityLabel={stepNumber ? m.stepField(m.timeUnits[index], stepNumber) : m.timeUnits[index]}
      onChange={(next) => onChange({ [unit]: next })} onInteractionChange={(busy) => {
        const previous = moving.current.size > 0;
        if (busy) moving.current.add(unit); else moving.current.delete(unit);
        const current = moving.current.size > 0;
        if (previous !== current) onInteractionChange?.(current);
      }} />)}
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  wheels: { position: 'relative', flexDirection: 'row', width: '100%', paddingVertical: 12,
    borderWidth: 1, borderColor: c.separator, borderRadius: radii.control },
  selection: { position: 'absolute', left: 0, right: 0, backgroundColor: c.selected },
});
