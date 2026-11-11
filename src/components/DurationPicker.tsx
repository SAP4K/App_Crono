import { useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { DURATION_LIMITS, DURATION_UNITS } from '../core/durationPicker';
import type { DurationParts, DurationUnit } from '../core/durationPicker';
import { useI18n } from '../hooks/useI18n';
import { DurationWheel } from './DurationWheel';

type Props = {
  value: DurationParts; onChange: (changes: Partial<DurationParts>) => void;
  disabled?: boolean; onInteractionChange?: (busy: boolean) => void;
  stepNumber?: number; autoFocus?: boolean;
  presentationRequest?: number; presentationActive?: boolean;
};
export function DurationPicker({ value, onChange, disabled, onInteractionChange, stepNumber, autoFocus, presentationRequest, presentationActive }: Props) {
  const { messages: m } = useI18n();
  const { fontScale } = useWindowDimensions();
  const moving = useRef(new Set<DurationUnit>());
  const rowHeight = Math.max(44, Math.ceil(40 * fontScale));
  return <View style={styles.wheels}>
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
const styles = StyleSheet.create({ wheels: { flexDirection: 'row', gap: 12, width: '100%' } });
