import { useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DURATION_LIMITS, DURATION_UNITS } from '../core/durationPicker';
import type { DurationParts, DurationUnit } from '../core/durationPicker';
import { useI18n } from '../hooks/useI18n';
import { DurationWheel } from './DurationWheel';
import { useThemeStyles } from '../context/ThemeContext';
import { durationPickerMetrics as metrics, fonts, radii, type Palette } from '../theme';

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
  const [trackWidth, setTrackWidth] = useState<number>(metrics.trackMaxWidth);
  const scale = Math.max(1, fontScale);
  const rowHeight = Math.ceil(metrics.rowHeight * scale);
  // Reserve space at each boundary; two tabular Inter digits fit within 1.35em.
  // This remains a base font size: native Text applies fontScale itself.
  const fontSize = Math.min(metrics.digitSize, Math.max(1, trackWidth / 3 - 20) / (1.35 * scale));
  return <View testID="duration-picker" style={styles.frame}>
    <View testID="duration-selection" pointerEvents="none" aria-hidden accessible={false}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.selection, { top: rowHeight + metrics.padding, height: rowHeight }]} />
    <View testID="duration-track" style={[styles.track, { maxWidth: metrics.trackMaxWidth * scale }]}
      onLayout={({ nativeEvent }) => { if (nativeEvent.layout.width > 0) setTrackWidth(nativeEvent.layout.width); }}>
    <View testID="duration-format" pointerEvents="none" aria-hidden accessible={false}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.format, { top: rowHeight, height: rowHeight }]}>
      {(['33.333333%', '66.666667%'] as const).map((left) => <View key={left}
        style={[styles.separator, { left, width: 20 * scale, transform: [{ translateX: -10 * scale }] }]}>
        <Text testID="duration-separator" accessible={false} style={[styles.separatorText, {
          fontSize: metrics.separatorSize * fontSize / metrics.digitSize,
          lineHeight: metrics.separatorLineHeight * fontSize / metrics.digitSize, opacity: disabled ? 0.5 : 1,
        }]}>:</Text>
      </View>)}
    </View>
    {DURATION_UNITS.map((unit, index) => <DurationWheel key={unit} value={value[unit]} maximum={DURATION_LIMITS[unit]}
      label={m.timeUnits[index]} hint={m.durationWheelHint} rowHeight={rowHeight} fontSize={fontSize} disabled={disabled}
      presentationRequest={presentationRequest} presentationActive={presentationActive}
      autoFocus={autoFocus && index === 0} accessibilityLabel={stepNumber ? m.stepField(m.timeUnits[index], stepNumber) : m.timeUnits[index]}
      onChange={(next) => onChange({ [unit]: next })} onInteractionChange={(busy) => {
        const previous = moving.current.size > 0;
        if (busy) moving.current.add(unit); else moving.current.delete(unit);
        const current = moving.current.size > 0;
        if (previous !== current) onInteractionChange?.(current);
      }} />)}
    </View>
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  frame: { position: 'relative', width: '100%', alignSelf: 'stretch', alignItems: 'center', paddingVertical: metrics.padding,
    borderWidth: 1, borderColor: c.separator, borderRadius: radii.control },
  track: { position: 'relative', flexDirection: 'row', width: '100%' },
  selection: { position: 'absolute', left: 0, right: 0, backgroundColor: c.selected },
  format: { position: 'absolute', left: 0, right: 0 },
  separator: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  separatorText: { fontFamily: fonts.medium, fontSize: metrics.separatorSize, lineHeight: metrics.separatorLineHeight, color: c.ink },
});
