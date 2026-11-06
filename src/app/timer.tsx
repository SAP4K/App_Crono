import { useI18n } from '../hooks/useI18n';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { parseDuration } from '../core/timer';
import { TimerFace } from '../components/TimerFace';
import { ConfirmSheet } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { fonts as f, Palette } from '../theme';

function durationFields(duration: number) {
  const seconds = duration / 1000;
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0'));
}

export default function TimerScreen() {
  const { messages: m } = useI18n();
  const { data, timerControls, feedback, getSnapshot, notifications } = useCrono();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const timer = data.timer;
  const [fields, setFields] = useState(() => durationFields(timer.durationMs));
  const [confirmReset, setConfirmReset] = useState(false);
  const editable = timer.status === 'idle' || timer.status === 'completed';
  const duration = parseDuration(fields[0], fields[1], fields[2]);
  const running = timer.status === 'running';
  const paused = timer.status === 'paused';
  const actionLabel = running ? m.pauseTimer : paused ? m.resumeTimer : timer.status === 'completed' ? m.restartTimer : m.startTimer;
  const commitDuration = () => {
    if (duration !== null && editable && duration !== timer.durationMs) timerControls.configure(duration);
  };
  const reset = () => {
    feedback(); timerControls.reset(); setFields(durationFields(timer.durationMs)); setConfirmReset(false);
  };
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>{m.timerTitle}</Text>
    <Text style={styles.subtitle}>{m.timerSubtitle}</Text>
    <TimerFace timer={timer} />
    <View style={styles.fields}>
      {m.timeUnits.map((label, index) => <View key={index} style={styles.field}>
        <TextInput accessibilityLabel={label} value={fields[index]} editable={editable} keyboardType="number-pad" maxLength={2} selectTextOnFocus onChangeText={(value) => setFields((previous) => previous.map((part, i) => i === index ? value : part))} onBlur={commitDuration} style={[styles.input, !editable && styles.disabled]} selectionColor={c.green} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>)}
    </View>
    <Text style={styles.help}>{duration === null ? m.durationInvalid : m.timerSoundHelp}</Text>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={m.resetTimer} disabled={timer.status === 'idle'} onPress={() => { if (running || paused) { feedback(); setConfirmReset(true); } else reset(); }} style={({ pressed }) => [styles.reset, timer.status === 'idle' && styles.disabled, pressed && styles.pressed]}><Icon name="reset" size={20} /><Text style={styles.resetText}>{m.reset}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} disabled={editable && duration === null} onPress={() => {
        feedback();
        const previous = getSnapshot().timer;
        if (running) timerControls.pause();
        else if (paused) timerControls.resume();
        else if (duration !== null) { timerControls.configure(duration); timerControls.start(); }
        const current = getSnapshot().timer;
        if (current !== previous && current.status === 'running') void notifications.controller.requestPermission();
      }} style={({ pressed }) => [styles.primary, editable && duration === null && styles.disabled, pressed && styles.pressed]}>
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
  fields: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  field: { flex: 1, maxWidth: 96, alignItems: 'center', gap: 8 },
  input: { width: '100%', minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.ink, textAlign: 'center', fontFamily: f.semibold, fontSize: 23, fontVariant: ['tabular-nums'] },
  fieldLabel: { fontFamily: f.medium, color: c.muted, fontSize: 11 },
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
