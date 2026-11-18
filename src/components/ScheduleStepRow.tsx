import { memo, useCallback } from 'react';
import { MotionPressable } from './MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { MAX_NAME_LENGTH } from '../core/planning';
import { formatRemaining, parseDuration } from '../core/timer';
import { textSizes, radii, fonts as f, Palette } from '../theme';
import { Icon } from './Icon';

export type StepDraft = { id: string; name: string; hours: string; minutes: string; seconds: string };

export const ScheduleStepRow = memo(function ScheduleStepRow({ value, index, count, onChange, onMove, onRemove, onEditDuration, durationRef }: {
  value: StepDraft; index: number; count: number; onChange: (id: string, value: Partial<StepDraft>) => void;
  onMove: (id: string, direction: number) => void; onRemove: (id: string) => void;
  onEditDuration: (step: StepDraft) => void; durationRef: (id: string, node: View | null) => void;
}) {
  const register = useCallback((node: View | null) => durationRef(value.id, node), [durationRef, value.id]);
  const { messages: m } = useI18n();
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  return <View style={styles.row}>
    <View style={styles.heading}><Text style={styles.label}>{m.stepNumber(index + 1)}</Text>
      <View style={styles.controls}>
        <MotionPressable accessibilityRole="button" accessibilityLabel={m.moveStepUp(index + 1)} disabled={index === 0} onPress={() => onMove(value.id, -1)} style={[styles.control, index === 0 && styles.disabled]}><Text style={styles.arrow}>↑</Text></MotionPressable>
        <MotionPressable accessibilityRole="button" accessibilityLabel={m.moveStepDown(index + 1)} disabled={index === count - 1} onPress={() => onMove(value.id, 1)} style={[styles.control, index === count - 1 && styles.disabled]}><Text style={styles.arrow}>↓</Text></MotionPressable>
        <MotionPressable accessibilityRole="button" accessibilityLabel={m.removeStep(index + 1)} onPress={() => onRemove(value.id)} style={[styles.control]}><Icon name="trash" size={17} color={c.danger} /></MotionPressable>
      </View>
    </View>
    <TextInput accessibilityLabel={m.stepName(index + 1)} value={value.name} maxLength={MAX_NAME_LENGTH} onChangeText={(name) => onChange(value.id, { name })} placeholder={m.stepPlaceholder} placeholderTextColor={c.muted} style={styles.input} selectionColor={c.green} />
    <MotionPressable ref={register} accessibilityRole="button" accessibilityLabel={m.editStepDuration(index + 1)} onPress={() => onEditDuration(value)}
      style={[styles.duration]}>
      <Text style={styles.unit}>{m.duration}</Text>
      <Text style={styles.number}>{formatRemaining(parseDuration(value.hours, value.minutes, value.seconds) ?? 0)}</Text>
      <Icon name="timer" size={18} color={c.green} />
    </MotionPressable>
  </View>;
});

const createStyles = (c: Palette) => StyleSheet.create({
  row: { paddingVertical: 16, borderBottomWidth: 1, borderColor: c.separator, marginBottom: 12, gap: 12, backgroundColor: c.background },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: f.medium, fontSize: textSizes.caption, color: c.muted, flexShrink: 1 },
  controls: { flexDirection: 'row', flexShrink: 0, gap: 2 },
  control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 21, color: c.ink }, disabled: { opacity: 0.35 },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: radii.control, paddingHorizontal: 12, paddingVertical: 10, fontFamily: f.regular, fontSize: textSizes.input, color: c.ink, backgroundColor: c.background },
  duration: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radii.control, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', backgroundColor: c.secondary },
  number: { flex: 1, textAlign: 'center', fontFamily: f.semibold, color: c.ink, fontSize: textSizes.input, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: f.regular, fontSize: textSizes.small, color: c.muted, textAlign: 'center' },
});
