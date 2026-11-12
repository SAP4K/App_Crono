import { useI18n } from '../hooks/useI18n';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, radii, Palette } from '../theme';

export function TimerCompletionNotice() {
  const { messages: m } = useI18n();
  const { data, alerts } = useCrono();
  const styles = useThemeStyles(createStyles);
  if (data.timer.status !== 'completed') return null;
  const error = alerts.state.request?.eventId === `timer:${data.timer.runId}` ? alerts.state.error : null;
  return <View style={styles.notice} accessibilityLabel={m.timerCompleted} accessibilityLiveRegion="polite">
    <Text style={styles.text}>{error ? `${m.timerComplete} ${m.soundUnavailable}` : m.timerComplete}</Text>
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  notice: { marginHorizontal: 24, marginBottom: 12, padding: 14, borderRadius: radii.control, backgroundColor: c.limeSoft },
  text: { fontFamily: f.semibold, color: c.green, fontSize: 14, lineHeight: 22 },
});
