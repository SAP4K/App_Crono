import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, Palette } from '../theme';

export function PlanningNotice() {
  const { data, planning, alerts } = useCrono(); const styles = useThemeStyles(createStyles);
  const run = data.planning.run;
  if (!run) return null;
  const completed = run.status === 'completed';
  const eventIndex = completed ? run.stepIndex : run.stepIndex - 1;
  const eventId = `planning:${run.runId}:${eventIndex}`;
  const boundary = planning.boundary?.eventId === eventId ? planning.boundary : null;
  const error = alerts.state.request?.eventId === eventId ? alerts.state.error : null;
  if (!completed && !boundary && !error) return null;
  const message = completed ? `Orarul „${run.scheduleName}” s-a încheiat.`
    : `Etapă încheiată: ${run.steps[eventIndex]?.name ?? ''}. Urmează: ${run.steps[run.stepIndex].name}.`;
  return <View accessibilityLabel={completed ? 'Orar finalizat' : 'Etapă finalizată'} accessibilityLiveRegion="polite" style={styles.notice}>
    <Text style={styles.text}>{error ? `${message} ${error}` : message}</Text>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  notice: { marginHorizontal: 26, marginBottom: 10, padding: 12, borderRadius: 13, backgroundColor: c.limeSoft },
  text: { fontFamily: f.semibold, color: c.green, fontSize: 12, lineHeight: 18 },
});
