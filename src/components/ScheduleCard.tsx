import { MotionPressable } from './MotionPressable';
import { StyleSheet, Text, View } from 'react-native';
import type { Schedule } from '../core/planning';
import { formatRemaining } from '../core/timer';
import { scheduleCalendarLabel } from '../i18n/formatters';
import { useI18n } from '../hooks/useI18n';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { textSizes, radii, fonts, type Palette } from '../theme';
import { Icon } from './Icon';

export function ScheduleCard({ schedule, protectedTemplate, canDuplicate, expanded, onToggle, onStart, onEdit, onDuplicate, onDelete }: {
  schedule: Schedule; protectedTemplate: boolean; canDuplicate: boolean; expanded: boolean;
  onToggle: () => void; onStart: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { language, messages: m } = useI18n(); const { colors } = useTheme(); const styles = useThemeStyles(createStyles);
  const total = schedule.steps.reduce((sum, step) => sum + step.durationMs, 0);
  const segments = schedule.steps.slice(0, 3).map((step) => ({ id: step.id, durationMs: step.durationMs }));
  if (schedule.steps.length > 3) segments.push({ id: 'remaining', durationMs: schedule.steps.slice(3).reduce((sum, step) => sum + step.durationMs, 0) });
  const preview = schedule.steps.slice(0, 3).map((step) => {
    const time = step.durationMs < 3600000 && step.durationMs % 60000 === 0
      ? `${step.durationMs / 60000} ${m.minutesShort}` : formatRemaining(step.durationMs).replace(/^00:/, '');
    return `${step.name} ${time}`;
  }).join(' → ') + (schedule.steps.length > 3 ? ' …' : '');
  return <View style={styles.card}>
    <View style={styles.heading}>
      <View style={styles.details}><Text style={styles.name}>{schedule.name}</Text>
        <Text style={styles.summary}>{m.stepCount(schedule.steps.length)} · {formatRemaining(total)}</Text></View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.startSchedule(schedule.name)} disabled={protectedTemplate} onPress={onStart}
        style={[styles.start, protectedTemplate && styles.disabled]}><Icon name="play" size={16} color={colors.actionIcon} /></MotionPressable>
    </View>
    <View style={styles.track} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {segments.map((segment, index) => <View key={index} style={[styles.segment, { flex: segment.durationMs / total, opacity: Math.max(0.35, 1 - index * 0.2) }]} />)}
    </View>
    <Text numberOfLines={2} style={styles.preview}>{preview}</Text>
    {schedule.calendar && <Text style={styles.summary}>{scheduleCalendarLabel(schedule.calendar, language)}</Text>}
    {protectedTemplate && <Text style={styles.summary}>{m.protectedSchedule}</Text>}
    <View style={styles.actions}>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.scheduleOptions(schedule.name)} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={onToggle}
        style={[styles.more]}><Icon name="more" /></MotionPressable>
    </View>
    {expanded && <View style={styles.options}>
      {[
        { label: m.editSchedule(schedule.name), text: m.edit, disabled: protectedTemplate, onPress: onEdit },
        { label: m.duplicateSchedule(schedule.name), text: m.duplicate, disabled: !canDuplicate, onPress: onDuplicate },
        { label: m.deleteSchedule(schedule.name), text: m.delete, disabled: protectedTemplate, onPress: onDelete, danger: true },
      ].map((item) => <MotionPressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} disabled={item.disabled} onPress={item.onPress}
        style={[styles.option, item.disabled && styles.disabled]}>
        <Text style={[styles.optionText, item.danger && styles.danger]}>{item.text}</Text>
      </MotionPressable>)}
    </View>}
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  card: { borderWidth: 1, borderColor: c.separator, borderRadius: radii.card, padding: 16, marginBottom: 12, backgroundColor: c.background },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  details: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.semibold, color: c.ink, fontSize: textSizes.input },
  summary: { fontFamily: fonts.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 20, marginTop: 6 },
  track: { flexDirection: 'row', height: 3, gap: 4, marginTop: 18, overflow: 'hidden' },
  segment: { minWidth: 1, height: '100%', backgroundColor: c.green },
  preview: { fontFamily: fonts.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  start: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.action, borderRadius: 22 },
  more: { width: 44, minHeight: 44, padding: 10, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control },
  options: { marginTop: 8, gap: 4, borderTopWidth: 1, borderTopColor: c.separator, paddingTop: 8 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.control, backgroundColor: c.secondary },
  optionText: { color: c.ink, fontFamily: fonts.medium, fontSize: textSizes.body }, danger: { color: c.danger }, disabled: { opacity: 0.45 },
});
