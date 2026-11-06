import { useI18n } from '../hooks/useI18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { buttonPressedStyle, fonts as f, Palette } from '../theme';
import { TimerCompletionNotice } from './TimerCompletionNotice';
import { PlanningNotice } from './PlanningNotice';

export function TimingNotices() {
  const { messages: m } = useI18n();
  const { alerts, feedback } = useCrono(); const styles = useThemeStyles(createStyles);
  const playing = alerts.state.status !== 'idle';
  const owner = alerts.state.request?.owner;
  return <>
    <TimerCompletionNotice />
    <PlanningNotice />
    {playing && <View style={styles.playback}>
      <Text style={styles.label}>{owner === 'timer' ? m.timerSound : owner === 'planning' ? m.planningSound : m.previewSound}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={m.stopSound} onPress={() => { feedback(); alerts.controller.stop(); }} style={({ pressed }) => [styles.stop, pressed && buttonPressedStyle]}><Text style={styles.stopText}>{m.stopSound}</Text></Pressable>
    </View>}
  </>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  playback: { marginHorizontal: 26, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: f.medium, color: c.muted, fontSize: 11, flexShrink: 1 },
  stop: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary },
  stopText: { fontFamily: f.semibold, color: c.ink, fontSize: 11 },
});
