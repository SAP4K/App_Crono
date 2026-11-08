import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { dateKeyFromParts, datePartsFromKey, localDateKey, WEEKDAYS, type ScheduleCalendar, type Weekday } from '../core/planningCalendar';
import { useI18n } from '../hooks/useI18n';
import { planningWeekdayLabel } from '../i18n/formatters';
import { buttonPressedStyle, fonts as f, type Palette } from '../theme';
import { CalendarDateFields } from './CalendarDateFields';

export function ScheduleCalendarPanel({ initialCalendar, onApply, onCancel }: {
  initialCalendar?: ScheduleCalendar;
  onApply: (calendar: ScheduleCalendar | undefined) => void;
  onCancel: () => void;
}) {
  const { language, messages: m } = useI18n();
  const { feedback } = useCrono();
  const styles = useThemeStyles(createStyles);
  const initialMode = initialCalendar?.kind ?? 'manual';
  const [mode, setMode] = useState(initialMode);
  const [weekdays, setWeekdays] = useState<Weekday[]>(() => initialCalendar?.kind === 'weekly' ? initialCalendar.weekdays : []);
  const [dateParts, setDateParts] = useState(() => datePartsFromKey(
    initialCalendar?.kind === 'once' ? initialCalendar.date : localDateKey(new Date()),
  ));
  const initialModeButton = useRef<View>(null);
  useEffect(() => { initialModeButton.current?.focus(); }, []);

  const modes = [
    { id: 'manual', label: m.calendarManual },
    { id: 'weekly', label: m.calendarWeekly },
    { id: 'once', label: m.calendarOnce },
  ] as const;
  const date = dateKeyFromParts(dateParts);
  const calendar: ScheduleCalendar | undefined = mode === 'weekly' ? { kind: 'weekly', weekdays }
    : mode === 'once' && date ? { kind: 'once', date } : undefined;
  const error = mode === 'weekly' && !weekdays.length ? m.calendarWeekdaysRequired
    : mode === 'once' && !date ? m.calendarInvalidDate : null;

  const toggleWeekday = (day: Weekday) => {
    feedback();
    setWeekdays((previous) => previous.includes(day) ? previous.filter((item) => item !== day)
      : [...previous, day].sort((first, second) => first - second));
  };

  return <View style={styles.panel}>
    <View accessibilityRole="radiogroup" style={styles.choices}>
      {modes.map(({ id, label }) => {
        const checked = mode === id;
        return <Pressable key={id} ref={id === initialMode ? initialModeButton : undefined}
          accessibilityRole="radio" accessibilityState={{ checked }} aria-checked={checked}
          onPress={() => { feedback(); setMode(id); }}
          style={({ pressed }) => [styles.choice, checked && styles.chosen, pressed && buttonPressedStyle]}>
          <Text style={styles.choiceText}>{label}</Text>
        </Pressable>;
      })}
    </View>
    {mode === 'weekly' && <View style={styles.choices}>
      {WEEKDAYS.map((day) => {
        const checked = weekdays.includes(day);
        return <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={planningWeekdayLabel(day, language, 'long')}
          accessibilityState={{ checked }} aria-checked={checked} onPress={() => toggleWeekday(day)}
          style={({ pressed }) => [styles.choice, checked && styles.chosen, pressed && buttonPressedStyle]}>
          <Text style={styles.choiceText}>{planningWeekdayLabel(day, language, 'short')}</Text>
        </Pressable>;
      })}
    </View>}
    {mode === 'once' && <CalendarDateFields value={dateParts}
      onChange={(field, text) => setDateParts((previous) => ({ ...previous, [field]: text }))} />}
    {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={!!error}
      onPress={() => { if (!error) onApply(calendar); }}
      style={({ pressed }) => [styles.action, styles.primary, error && styles.disabled, pressed && buttonPressedStyle]}>
      <Text style={styles.primaryText}>{m.calendarApply}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onCancel}
      style={({ pressed }) => [styles.action, styles.secondary, pressed && buttonPressedStyle]}>
      <Text style={styles.choiceText}>{m.cancel}</Text>
    </Pressable>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  panel: { gap: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.border,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  chosen: { backgroundColor: c.limeSoft, borderColor: c.green },
  choiceText: { fontFamily: f.medium, fontSize: 13, color: c.ink, textAlign: 'center' },
  error: { fontFamily: f.medium, fontSize: 12, color: c.danger },
  action: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: c.action },
  primaryText: { fontFamily: f.semibold, fontSize: 13, color: c.actionText, textAlign: 'center' },
  secondary: { backgroundColor: c.secondary },
  disabled: { opacity: 0.4 },
});
