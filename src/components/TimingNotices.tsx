import { MotionPressable } from './MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, radii, Palette } from '../theme';
import { TimerCompletionNotice } from './TimerCompletionNotice';
import { PlanningNotice } from './PlanningNotice';
import { SystemNotificationNotice } from './SystemNotificationNotice';

export function TimingNotices() {
  const { messages: m } = useI18n();
  const { alerts, feedback } = useCrono(); const styles = useThemeStyles(createStyles);
  const playing = alerts.state.status !== 'idle';
  const owner = alerts.state.request?.owner;
  return <>
    <TimerCompletionNotice />
    <PlanningNotice />
    <SystemNotificationNotice />
    {playing && <View style={styles.playback}>
      <Text style={styles.label}>{owner === 'timer' ? m.timerSound : owner === 'planning' ? m.planningSound : m.previewSound}</Text>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.stopSound} onPress={() => { feedback(); alerts.controller.stop(); }} style={[styles.stop]}><Text style={styles.stopText}>{m.stopSound}</Text></MotionPressable>
    </View>}
  </>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  playback: { marginHorizontal: 24, marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: f.medium, color: c.muted, fontSize: 12, flexShrink: 1 },
  stop: { minHeight: 44, paddingHorizontal: 12, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary },
  stopText: { fontFamily: f.semibold, color: c.ink, fontSize: 12 },
});
