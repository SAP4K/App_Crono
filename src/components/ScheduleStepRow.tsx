import { useI18n } from '../hooks/useI18n';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { MAX_NAME_LENGTH } from '../core/planning';
import { buttonPressedStyle, fonts as f, Palette } from '../theme';
import { Icon } from './Icon';

export type StepDraft = { id: string; name: string; hours: string; minutes: string; seconds: string };

export function ScheduleStepRow({ value, index, count, onChange, onMove, onRemove }: {
  value: StepDraft; index: number; count: number; onChange: (value: Partial<StepDraft>) => void;
  onMove: (direction: number) => void; onRemove: () => void;
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
    <View style={styles.fields}>{(['hours', 'minutes', 'seconds'] as const).map((key, field) => <View key={key} style={styles.field}>
      <TextInput accessibilityLabel={m.stepField(m.timeUnits[field], index + 1)} value={value[key]} onChangeText={(text) => onChange({ [key]: text })} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={[styles.input, styles.number]} selectionColor={c.green} />
      <Text style={styles.unit}>{m.timeUnits[field]}</Text>
    </View>)}</View>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  row: { padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 16, marginBottom: 12, gap: 10, backgroundColor: c.surface },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: f.semibold, fontSize: 12, color: c.ink },
  controls: { flexDirection: 'row', gap: 2 },
  control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 21, color: c.ink }, disabled: { opacity: 0.35 },
  input: { minHeight: 44, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, fontFamily: f.regular, fontSize: 13, color: c.ink, backgroundColor: c.background },
  fields: { flexDirection: 'row', gap: 8 }, field: { flex: 1, gap: 5 }, number: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  unit: { fontFamily: f.regular, fontSize: 10, color: c.muted, textAlign: 'center' },
});
