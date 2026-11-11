import { useIsFocused } from 'expo-router';
import { MotionPressable } from '../components/MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useLayoutEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { durationMilliseconds, durationParts } from '../core/durationPicker';
import type { DurationParts } from '../core/durationPicker';
import { MAX_TIMER_MS, TIMER_EXTENSION_MS } from '../core/timer';
import { DurationPicker } from '../components/DurationPicker';
import { TimerFace } from '../components/TimerFace';
import { ConfirmSheet } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { textSizes, fonts as f, Palette } from '../theme';

export default function TimerScreen() {
  const { messages: m } = useI18n();
  const { data, timerControls, feedback, getSnapshot, notifications } = useCrono();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const timer = data.timer;
  const [parts, setParts] = useState(() => durationParts(timer.durationMs));
  const selected = useRef(parts); const moving = useRef(false);
  const [wheelBusy, setWheelBusy] = useState(false);
  const [presentationRequest, setPresentationRequest] = useState(0);
  const focused = useIsFocused();
  const [confirmReset, setConfirmReset] = useState(false);
  useLayoutEffect(() => {
    // Editing owns its draft, including a transient zero and rapid key choices.
    // Only active-run changes (+1 minute) need to synchronize this hidden editor.
    if (timer.status === 'idle' || timer.status === 'completed' || durationMilliseconds(selected.current) === timer.durationMs) return;
    const next = durationParts(timer.durationMs); selected.current = next; setParts(next);
  }, [timer.durationMs, timer.status]);
  const editable = timer.status === 'idle' || timer.status === 'completed';
  const duration = durationMilliseconds(parts);
  const running = timer.status === 'running';
  const paused = timer.status === 'paused';
  const actionLabel = running ? m.pauseTimer : paused ? m.resumeTimer : timer.status === 'completed' ? m.restartTimer : m.startTimer;
  const changeDuration = (changes: Partial<DurationParts>) => {
    const current = getSnapshot().timer;
    if (current.status !== 'idle' && current.status !== 'completed') return;
    const next = { ...selected.current, ...changes };
    selected.current = next; setParts(next);
    const milliseconds = durationMilliseconds(next);
    if (milliseconds !== null && milliseconds !== current.durationMs) timerControls.configure(milliseconds);
  };
  const reset = () => {
    feedback(); timerControls.reset();
    const next = durationParts(getSnapshot().timer.durationMs); selected.current = next; setParts(next); setConfirmReset(false);
  };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>{m.timerTitle}</Text>
    <Text style={styles.subtitle}>{m.timerSubtitle}</Text>
    <TimerFace timer={timer} compact={editable} />
    {editable && <>
    <Text style={styles.presetTitle}>{m.timerPresets}</Text>
    <View style={styles.presets}>{[1, 5, 10, 25].map((minutes) => <MotionPressable key={minutes} accessibilityRole="button"
      accessibilityLabel={m.presetMinutes(minutes)} onPress={() => {
        feedback(); changeDuration(durationParts(minutes * 60000));
        setPresentationRequest((revision) => revision + 1);
      }} style={[styles.preset, timer.durationMs === minutes * 60000 && styles.selectedPreset]}>
      <Text style={styles.resetText}>{minutes} {m.minutesShort}</Text>
    </MotionPressable>)}</View>
    <DurationPicker value={parts} onChange={changeDuration} presentationRequest={presentationRequest} presentationActive={focused} onInteractionChange={(busy) => {
      moving.current = busy; setWheelBusy(busy);
    }} />
    </>}
    <Text style={styles.help}>{duration === null ? m.durationInvalid : m.timerSoundHelp}</Text>
    {!editable && <MotionPressable accessibilityRole="button" accessibilityLabel={m.addMinute}
      disabled={timer.durationMs > MAX_TIMER_MS - TIMER_EXTENSION_MS} onPress={() => { feedback(); timerControls.extend(); }}
      style={[styles.addMinute, timer.durationMs > MAX_TIMER_MS - TIMER_EXTENSION_MS && styles.disabled]}>
      <Text style={styles.resetText}>+1 {m.minutesShort}</Text>
    </MotionPressable>}
    <View style={styles.actions}>
      <MotionPressable accessibilityRole="button" accessibilityLabel={m.resetTimer} disabled={timer.status === 'idle'} onPress={() => { if (running || paused) { feedback(); setConfirmReset(true); } else reset(); }} style={[styles.reset, timer.status === 'idle' && styles.disabled]}><Icon name="reset" size={20} /><Text style={styles.resetText}>{m.reset}</Text></MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={editable && (duration === null || wheelBusy)} onPress={() => {
        const previous = getSnapshot().timer;
        const milliseconds = durationMilliseconds(selected.current);
        if ((previous.status === 'idle' || previous.status === 'completed') && (moving.current || milliseconds === null)) return;
        feedback();
        if (previous.status === 'running') timerControls.pause();
        else if (previous.status === 'paused') timerControls.resume();
        else if (milliseconds !== null) { timerControls.configure(milliseconds); timerControls.start(); }
        const current = getSnapshot().timer;
        if (current !== previous && current.status === 'running') void notifications.controller.requestPermission();
      }} style={[styles.primary, editable && (duration === null || wheelBusy) && styles.disabled]}>
        <Icon name={running ? 'pause' : 'play'} size={19} color={c.actionIcon} /><Text style={styles.primaryText}>{running ? m.pause : paused ? m.resume : timer.status === 'completed' ? m.restart : m.start}</Text>
      </MotionPressable>
    </View>
    <Text style={styles.note}>{m.timerIndependent}</Text>
    <ConfirmSheet visible={confirmReset} title={m.resetTimerTitle} description={m.resetTimerHelp} confirmLabel={m.resetTimer} onClose={() => setConfirmReset(false)} onConfirm={reset} />
  </ScrollView>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: textSizes.heading, letterSpacing: -0.7 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 9 },
  help: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.small, lineHeight: 21, textAlign: 'center', marginVertical: 18 },
  presetTitle: { fontFamily: f.semibold, color: c.muted, fontSize: textSizes.caption, marginBottom: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  preset: { flex: 1, minWidth: 55, minHeight: 44, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface },
  selectedPreset: { backgroundColor: c.selected, borderColor: c.green },
  addMinute: { minHeight: 44, padding: 10, marginBottom: 12, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: c.secondary },
  actions: { flexDirection: 'row', gap: 12 },
  primary: { flex: 1, minHeight: 56, borderRadius: 17, backgroundColor: c.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontFamily: f.semibold, color: c.actionText, fontSize: textSizes.body },
  reset: { flex: 1, minHeight: 56, borderRadius: 17, backgroundColor: c.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetText: { fontFamily: f.semibold, color: c.ink, fontSize: textSizes.body },
  disabled: { opacity: 0.5 },
  note: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.small, lineHeight: 21, textAlign: 'center', marginTop: 22 },
});
