import { useI18n } from '../hooks/useI18n';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, radii, Palette } from '../theme';

export function PlanningNotice() {
  const { messages: m } = useI18n();
  const { data, planning, alerts } = useCrono(); const styles = useThemeStyles(createStyles);
  const run = data.planning.run;
  if (!run) return null;
  const completed = run.status === 'completed';
  const eventIndex = completed ? run.stepIndex : run.stepIndex - 1;
  const eventId = `planning:${run.runId}:${eventIndex}`;
  const boundary = planning.boundary?.eventId === eventId ? planning.boundary : null;
  const error = alerts.state.request?.eventId === eventId ? alerts.state.error : null;
  if (!completed && !boundary && !error) return null;
  const message = completed ? m.scheduleFinished(run.scheduleName)
    : m.stepFinished(run.steps[eventIndex]?.name ?? '', run.steps[run.stepIndex].name);
  return <View accessibilityLabel={completed ? m.scheduleCompleted : m.stepCompleted} accessibilityLiveRegion="polite" style={styles.notice}>
    <Text style={styles.text}>{error ? `${message} ${m.soundUnavailable}` : message}</Text>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  notice: { marginHorizontal: 24, marginBottom: 10, padding: 12, borderRadius: radii.control, backgroundColor: c.limeSoft },
  text: { fontFamily: f.semibold, color: c.green, fontSize: 13, lineHeight: 21 },
});
