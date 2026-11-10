import { MotionPressable } from './MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { scheduleRemaining } from '../core/planning';
import { formatRemaining } from '../core/timer';
import { isAppActive, subscribeAppActivity } from '../hooks/appActivity';
import { textSizes, fonts as f, Palette } from '../theme';
import { ConfirmSheet } from './Sheet';

export function PlanningRunCard() {
  const { messages: m } = useI18n();
  const { data, planning, feedback, getSnapshot, notifications } = useCrono(); const styles = useThemeStyles(createStyles);
  const run = data.planning.run;
  const [now, setNow] = useState(Date.now); const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (run?.status !== 'running') return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const changed = () => {
      if (interval) clearInterval(interval);
      setNow(Date.now());
      if (isAppActive()) interval = setInterval(() => setNow(Date.now()), 200);
    };
    if (isAppActive()) interval = setInterval(() => setNow(Date.now()), 200);
    const unsubscribe = subscribeAppActivity(changed);
    return () => { if (interval) clearInterval(interval); unsubscribe(); };
  }, [run?.status, run?.deadlineAt]);
  if (!run) return null;
  const remaining = scheduleRemaining(run, now);
  const future = run.steps.slice(run.stepIndex + 1).reduce((sum, step) => sum + step.durationMs, 0);
  const total = run.steps.reduce((sum, step) => sum + step.durationMs, 0);
  const progress = Math.round(100 * (1 - (remaining + future) / total));
  const canRestart = data.planning.schedules.some((item) => item.id === run.scheduleId);
  const restartDisabled = run.status === 'completed' && !canRestart;
  const reset = () => { feedback(); planning.controls.reset(); setConfirmReset(false); };
  const actionLabel = run.status === 'running' ? m.pauseSchedule : run.status === 'paused' ? m.resumeSchedule : m.restartSchedule;
  return <View style={styles.card} accessibilityLabel={m.runProgress}>
    <Text style={styles.status}>{run.status === 'completed' ? m.runCompleted : run.status === 'paused' ? m.runPaused : m.stepProgress(run.stepIndex + 1, run.steps.length)}</Text>
    <Text style={styles.name}>{run.scheduleName}</Text>
    <Text style={styles.step}>{run.steps[run.stepIndex].name}</Text>
    <Text accessibilityLabel={m.currentStepTime(formatRemaining(remaining))} style={styles.time}>{formatRemaining(remaining)}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel={m.runProgressBar} accessibilityValue={{ min: 0, max: 100, now: progress }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
    {run.status !== 'completed' && <Text style={styles.next}>{run.steps[run.stepIndex + 1] ? m.nextStep(run.steps[run.stepIndex + 1].name) : m.lastStep}</Text>}
    <View style={styles.actions}>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.resetSchedule} onPress={() => { if (run.status === 'completed') reset(); else { feedback(); setConfirmReset(true); } }} style={[styles.secondary]}><Text style={styles.secondaryText}>{m.reset}</Text></MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={restartDisabled} onPress={() => {
        feedback();
        const previous = getSnapshot().planning.run;
        if (run.status === 'running') planning.controls.pause();
        else if (run.status === 'paused') planning.controls.resume();
        else planning.controls.start(run.scheduleId);
        const current = getSnapshot().planning.run;
        if (current !== previous && current?.status === 'running') void notifications.controller.requestPermission();
      }} style={[styles.primary, restartDisabled && styles.disabled]}><Text style={styles.primaryText}>{run.status === 'running' ? m.pause : run.status === 'paused' ? m.resume : m.restart}</Text></MotionPressable>
    </View>
    <ConfirmSheet visible={confirmReset} title={m.resetScheduleTitle} description={m.resetScheduleHelp} confirmLabel={m.resetSchedule} onClose={() => setConfirmReset(false)} onConfirm={reset} />
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  card: { padding: 16, marginBottom: 14, borderRadius: 17, backgroundColor: c.limeSoft, borderWidth: 1, borderColor: c.border },
  status: { fontFamily: f.medium, fontSize: textSizes.small, color: c.green }, name: { fontFamily: f.bold, color: c.ink, fontSize: textSizes.input, marginTop: 5 },
  step: { fontFamily: f.medium, fontSize: textSizes.body, color: c.ink, marginTop: 7 }, time: { fontFamily: f.semibold, color: c.ink, fontSize: 30, marginVertical: 9, fontVariant: ['tabular-nums'] },
  next: { fontFamily: f.regular, fontSize: textSizes.small, color: c.muted, marginTop: 9 },
  track: { height: 5, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: c.green },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primary: { flex: 1, minHeight: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: c.action }, primaryText: { fontFamily: f.semibold, fontSize: textSizes.caption, color: c.actionText },
  secondary: { flex: 1, minHeight: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: c.secondary }, secondaryText: { fontFamily: f.medium, fontSize: textSizes.caption, color: c.ink }, disabled: { opacity: 0.4 },
});
