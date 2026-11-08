import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import type { CalendarDateParts } from '../core/planningCalendar';
import { useI18n } from '../hooks/useI18n';
import { fonts as f, type Palette } from '../theme';

export function CalendarDateFields({ value, onChange }: {
  value: CalendarDateParts;
  onChange: (field: keyof CalendarDateParts, text: string) => void;
}) {
  const { messages: m } = useI18n();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const fields = [
    { field: 'day', label: m.calendarDay, digits: 2 },
    { field: 'month', label: m.calendarMonth, digits: 2 },
    { field: 'year', label: m.calendarYear, digits: 4 },
  ] as const;

  return <View style={styles.fields}>
    {fields.map(({ field, label, digits }) => <View key={field} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value[field]} inputMode="numeric" maxLength={digits}
        onChangeText={(text) => onChange(field, text)} selectTextOnFocus
        selectionColor={colors.green} style={styles.input} />
    </View>)}
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  fields: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, minWidth: 0, gap: 6 },
  label: { fontFamily: f.medium, fontSize: 13, color: c.ink },
  input: { minHeight: 48, paddingHorizontal: 10, borderWidth: 1, borderColor: c.border, borderRadius: 12,
    fontFamily: f.medium, fontSize: 16, color: c.ink, backgroundColor: c.surface },
});
