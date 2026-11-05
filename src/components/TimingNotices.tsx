import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { fonts as f, Palette } from '../theme';
import { TimerCompletionNotice } from './TimerCompletionNotice';
import { PlanningNotice } from './PlanningNotice';

export function TimingNotices() {
  const { alerts, feedback } = useCrono(); const styles = useThemeStyles(createStyles);
  const playing = alerts.state.status !== 'idle';
  const owner = alerts.state.request?.owner;
  return <>
    <TimerCompletionNotice />
    <PlanningNotice />
    {playing && <View style={styles.playback}>
      <Text style={styles.label}>{owner === 'timer' ? 'Sunet timer' : owner === 'planning' ? 'Sunet planificare' : 'Previzualizare sunet'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Oprește sunetul" onPress={() => { feedback(); alerts.controller.stop(); }} style={styles.stop}><Text style={styles.stopText}>Oprește sunetul</Text></Pressable>
    </View>}
  </>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  playback: { marginHorizontal: 26, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: f.medium, color: c.muted, fontSize: 11, flexShrink: 1 },
  stop: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary },
  stopText: { fontFamily: f.semibold, color: c.ink, fontSize: 11 },
});
