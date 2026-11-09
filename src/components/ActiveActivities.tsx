import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { scheduleRemaining } from '../core/planning';
import { formatRemaining, remainingTime } from '../core/timer';
import { useForegroundNow } from '../hooks/useForegroundNow';
import { useI18n } from '../hooks/useI18n';
import { fonts as f, textSizes, type Palette } from '../theme';

export function ActiveActivities({ currentTab }: { currentTab: string }) {
  const { data, getSnapshot, timerControls, planning, notifications, feedback } = useCrono();
  const { messages: m } = useI18n();
  const styles = useThemeStyles(createStyles);
  const timer = data.timer;
  const run = data.planning.run;
  const showTimer = currentTab !== 'timer' && (timer.status === 'running' || timer.status === 'paused');
  const showPlanning = currentTab !== 'planning' && run && run.status !== 'completed';
  const now = useForegroundNow(!!((showTimer && timer.status === 'running') || (showPlanning && run.status === 'running')));
  const toggle = (owner: 'timer' | 'planning') => {
    const previous = owner === 'timer' ? getSnapshot().timer : getSnapshot().planning.run;
    if (!previous || (previous.status !== 'running' && previous.status !== 'paused')) return;
    feedback();
    const controls = owner === 'timer' ? timerControls : planning.controls;
    if (previous.status === 'running') controls.pause(); else controls.resume();
    const current = owner === 'timer' ? getSnapshot().timer : getSnapshot().planning.run;
    if (current !== previous && current?.status === 'running') void notifications.controller.requestPermission();
  };
  if (!showTimer && !showPlanning) return null;
  return <View style={styles.container}>
    {showTimer && <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.openActiveTimer}
        accessibilityHint={m.remainingTime(formatRemaining(remainingTime(timer, now)))}
        onPress={() => { feedback(); router.navigate('/timer'); }} style={styles.open}>
        <Text style={styles.name}>{m.timerTab} · {timer.status === 'paused' ? m.paused : m.inProgress}</Text>
        <Text style={styles.time}>{formatRemaining(remainingTime(timer, now))}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={timer.status === 'running' ? m.pauseTimer : m.resumeTimer}
        onPress={() => toggle('timer')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Text style={styles.label}>{timer.status === 'running' ? m.pause : m.resume}</Text>
      </Pressable>
    </View>}
    {showPlanning && <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.openActivePlanning}
        accessibilityHint={`${run.scheduleName}. ${run.steps[run.stepIndex].name}. ${m.currentStepTime(formatRemaining(scheduleRemaining(run, now)))}`}
        onPress={() => { feedback(); router.navigate('/planning'); }} style={styles.open}>
        <Text numberOfLines={1} style={styles.name}>{run.scheduleName}</Text>
        <View style={styles.detail}><Text numberOfLines={1} style={[styles.time, styles.status]}>{run.status === 'paused' ? m.paused : m.stepProgress(run.stepIndex + 1, run.steps.length)}</Text><Text style={styles.time}>{formatRemaining(scheduleRemaining(run, now))}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={run.status === 'running' ? m.pauseSchedule : m.resumeSchedule}
        onPress={() => toggle('planning')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Text style={styles.label}>{run.status === 'running' ? m.pause : m.resume}</Text>
      </Pressable>
    </View>}
  </View>;
}
const createStyles = (c: Palette) => StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 8, gap: 6, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: c.surface, paddingHorizontal: 10 },
  open: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 7, justifyContent: 'center' },
  name: { fontFamily: f.semibold, color: c.ink, fontSize: textSizes.caption },
  time: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.small, marginTop: 3 },
  detail: { flexDirection: 'row', gap: 8 }, status: { flex: 1, minWidth: 0 },
  action: { minHeight: 44, minWidth: 64, maxWidth: '40%', justifyContent: 'center', padding: 8, backgroundColor: c.secondary, borderRadius: 10 },
  label: { fontFamily: f.semibold, fontSize: textSizes.body, color: c.ink, textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.65 },
});
