import { MotionPressable } from './MotionPressable';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MAX_STEPS, type ScheduleStep } from '../core/planning';
import { formatRemaining } from '../core/timer';
import { useI18n } from '../hooks/useI18n';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts, type Palette } from '../theme';

export function ScheduleRepeatPanel({ steps, onApply, onCancel }: {
  steps: ScheduleStep[]; onApply: (cycles: number) => void; onCancel: () => void;
}) {
  const { messages: m } = useI18n(); const styles = useThemeStyles(createStyles);
  const [cycles, setCycles] = useState(2);
  const count = steps.length * cycles, valid = count <= MAX_STEPS;
  const total = steps.reduce((sum, step) => sum + step.durationMs, 0) * cycles;
  return <View style={styles.panel}>
    <Text style={styles.help}>{m.repeatHelp}</Text>
    <View style={styles.choices}>{[2, 3, 4].map((value) => <MotionPressable key={value} accessibilityRole="radio"
      accessibilityLabel={m.repeatCycles(value)} accessibilityState={{ checked: cycles === value }} aria-checked={cycles === value}
      onPress={() => setCycles(value)} style={[styles.choice, cycles === value && styles.selected]}>
      <Text style={styles.text}>{m.repeatCycles(value)}</Text>
    </MotionPressable>)}</View>
    <Text style={styles.help}>{m.editorCount(count, MAX_STEPS)} · {m.editorTotal(formatRemaining(total))}</Text>
    {!valid && <Text accessibilityLiveRegion="polite" style={styles.error}>{m.repeatLimit}</Text>}
    <MotionPressable accessibilityRole="button" disabled={!valid} onPress={() => { if (valid) onApply(cycles); }}
      style={[styles.primary, !valid && styles.disabled]}><Text style={styles.primaryText}>{m.applyRepeat}</Text></MotionPressable>
    <MotionPressable accessibilityRole="button" onPress={onCancel} style={[styles.choice]}>
      <Text style={styles.text}>{m.cancel}</Text>
    </MotionPressable>
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  panel: { gap: 16, paddingVertical: 16 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 46, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: c.selected, borderColor: c.green }, text: { fontFamily: fonts.medium, color: c.ink, fontSize: 14 },
  help: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, lineHeight: 21 }, error: { fontFamily: fonts.medium, color: c.danger, fontSize: 13, lineHeight: 21 },
  primary: { minHeight: 48, borderRadius: 12, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center', padding: 12 },
  primaryText: { fontFamily: fonts.semibold, fontSize: 14, color: c.actionText }, disabled: { opacity: 0.4 },
});
