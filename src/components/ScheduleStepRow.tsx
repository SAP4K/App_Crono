import { useI18n } from '../hooks/useI18n';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { MAX_NAME_LENGTH } from '../core/planning';
import { formatRemaining, parseDuration } from '../core/timer';
import { textSizes, buttonPressedStyle, fonts as f, Palette } from '../theme';
import { Icon } from './Icon';

export type StepDraft = { id: string; name: string; hours: string; minutes: string; seconds: string };

export function ScheduleStepRow({ value, index, count, onChange, onMove, onRemove, onEditDuration, durationRef }: {
  value: StepDraft; index: number; count: number; onChange: (value: Partial<StepDraft>) => void;
  onMove: (direction: number) => void; onRemove: () => void;
  onEditDuration: () => void; durationRef: (node: View | null) => void;
}) {
  const { messages: m } = useI18n();
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  return <View style={styles.row}>
    <View style={styles.heading}><Text style={styles.label}>{m.stepNumber(index + 1)}</Text>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={m.moveStepUp(index + 1)} disabled={index === 0} onPress={() => onMove(-1)} style={({ pressed }) => [styles.control, pressed && index !== 0 && buttonPressedStyle, index === 0 && styles.disabled]}><Text style={styles.arrow}>↑</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={m.moveStepDown(index + 1)} disabled={index === count - 1} onPress={() => onMove(1)} style={({ pressed }) => [styles.control, pressed && index !== count - 1 && buttonPressedStyle, index === count - 1 && styles.disabled]}><Text style={styles.arrow}>↓</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={m.removeStep(index + 1)} onPress={onRemove} style={({ pressed }) => [styles.control, pressed && buttonPressedStyle]}><Icon name="trash" size={17} color={c.danger} /></Pressable>
      </View>
    </View>
    <TextInput accessibilityLabel={m.stepName(index + 1)} value={value.name} maxLength={MAX_NAME_LENGTH} onChangeText={(name) => onChange({ name })} placeholder={m.stepPlaceholder} placeholderTextColor={c.muted} style={styles.input} selectionColor={c.green} />
    <Pressable ref={durationRef} accessibilityRole="button" accessibilityLabel={m.editStepDuration(index + 1)} onPress={onEditDuration}
      style={({ pressed }) => [styles.duration, pressed && buttonPressedStyle]}>
      <Text style={styles.unit}>{m.duration}</Text>
      <Text style={styles.number}>{formatRemaining(parseDuration(value.hours, value.minutes, value.seconds) ?? 0)}</Text>
      <Icon name="timer" size={18} color={c.green} />
    </Pressable>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  row: { padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 16, marginBottom: 12, gap: 10, backgroundColor: c.surface },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: f.semibold, fontSize: textSizes.caption, color: c.ink },
  controls: { flexDirection: 'row', gap: 2 },
  control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 21, color: c.ink }, disabled: { opacity: 0.35 },
  input: { minHeight: 44, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, fontFamily: f.regular, fontSize: textSizes.input, color: c.ink, backgroundColor: c.background },
  duration: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.background },
  number: { flex: 1, textAlign: 'center', fontFamily: f.semibold, color: c.ink, fontSize: textSizes.input, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: f.regular, fontSize: textSizes.small, color: c.muted, textAlign: 'center' },
});
