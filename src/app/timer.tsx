import { useI18n } from '../hooks/useI18n';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { durationMilliseconds, durationParts } from '../core/durationPicker';
import type { DurationParts } from '../core/durationPicker';
import { DurationPicker } from '../components/DurationPicker';
import { TimerFace } from '../components/TimerFace';
import { ConfirmSheet } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { fonts as f, Palette } from '../theme';

export default function TimerScreen() {
  const { messages: m } = useI18n();
  const { data, timerControls, feedback, getSnapshot, notifications } = useCrono();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const timer = data.timer;
  const [parts, setParts] = useState(() => durationParts(timer.durationMs));
  const selected = useRef(parts); const moving = useRef(false);
  const [wheelBusy, setWheelBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
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
    <TimerFace timer={timer} />
    <DurationPicker value={parts} onChange={changeDuration} disabled={!editable} onInteractionChange={(busy) => {
      moving.current = busy; setWheelBusy(busy);
    }} />
    <Text style={styles.help}>{duration === null ? m.durationInvalid : m.timerSoundHelp}</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.resetTimer} disabled={timer.status === 'idle'} onPress={() => { if (running || paused) { feedback(); setConfirmReset(true); } else reset(); }} style={({ pressed }) => [styles.reset, timer.status === 'idle' && styles.disabled, pressed && styles.pressed]}><Icon name="reset" size={20} /><Text style={styles.resetText}>{m.reset}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={editable && (duration === null || wheelBusy)} onPress={() => {
        const previous = getSnapshot().timer;
        const milliseconds = durationMilliseconds(selected.current);
        if ((previous.status === 'idle' || previous.status === 'completed') && (moving.current || milliseconds === null)) return;
        feedback();
        if (previous.status === 'running') timerControls.pause();
        else if (previous.status === 'paused') timerControls.resume();
        else if (milliseconds !== null) { timerControls.configure(milliseconds); timerControls.start(); }
        const current = getSnapshot().timer;
        if (current !== previous && current.status === 'running') void notifications.controller.requestPermission();
      }} style={({ pressed }) => [styles.primary, editable && (duration === null || wheelBusy) && styles.disabled, pressed && styles.pressed]}>
        <Icon name={running ? 'pause' : 'play'} size={19} color={c.actionIcon} /><Text style={styles.primaryText}>{running ? m.pause : paused ? m.resume : timer.status === 'completed' ? m.restart : m.start}</Text>
      </Pressable>
    </View>
    <Text style={styles.note}>{m.timerIndependent}</Text>
    <ConfirmSheet visible={confirmReset} title={m.resetTimerTitle} description={m.resetTimerHelp} confirmLabel={m.resetTimer} onClose={() => setConfirmReset(false)} onConfirm={reset} />
  </ScrollView>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: 24, flexGrow: 1 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: 23, letterSpacing: -0.7 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
  help: { fontFamily: f.regular, color: c.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginVertical: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  primary: { flex: 1, minHeight: 56, borderRadius: 17, backgroundColor: c.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontFamily: f.semibold, color: c.actionText, fontSize: 13 },
  reset: { flex: 1, minHeight: 56, borderRadius: 17, backgroundColor: c.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetText: { fontFamily: f.semibold, color: c.ink, fontSize: 13 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.65 },
  note: { fontFamily: f.regular, color: c.muted, fontSize: 10, lineHeight: 17, textAlign: 'center', marginTop: 22 },
});
