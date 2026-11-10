import { MotionPressable } from '../components/MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { emptyStopwatch, MAX_LAPS, pause, recordLap, saveSession, start } from '../core/stopwatch';
import { StopwatchFace } from '../components/StopwatchFace';
import { LapList } from '../components/LapList';
import { Icon } from '../components/Icon';
import { ConfirmSheet } from '../components/Sheet';
import { textSizes, fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';

export default function StopwatchScreen() {
  const { messages: m } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { data, update, feedback, notify } = useCrono();
  const [resetDialog, setResetDialog] = useState(false);
  const compact = useWindowDimensions().height < 740;
  const stopwatch = data.stopwatch;
  const running = stopwatch.startedAt !== null;
  const hasTime = stopwatch.accumulatedMs > 0 || running;
  const lapLimit = stopwatch.laps.length >= MAX_LAPS;
  const secondaryDisabled = running ? lapLimit : !hasTime;

  const toggleRunning = () => {
    feedback();
    update((previous) => ({ ...previous, stopwatch: previous.stopwatch.startedAt !== null ? pause(previous.stopwatch) : start(previous.stopwatch) }));
  };
  const secondaryAction = () => {
    feedback();
    if (running) update((previous) => ({ ...previous, stopwatch: recordLap(previous.stopwatch) }));
    else setResetDialog(true);
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.eyebrow}><View style={styles.dash} /><Text style={styles.eyebrowText}>{m.stopwatchEyebrow}</Text></View>
    <Text accessibilityRole="header" style={styles.title}>{m.stopwatchTitle}</Text>
    <Text style={[styles.subtitle, compact && { marginBottom: 8 }]}>{m.stopwatchSubtitle}</Text>
    <StopwatchFace stopwatch={stopwatch} />
    <View style={styles.actions}>
      <MotionPressable accessibilityRole="button" accessibilityLabel={running ? m.recordLap : m.resetStopwatch} accessibilityState={{ disabled: secondaryDisabled }} disabled={secondaryDisabled} onPress={secondaryAction} style={[styles.secondary, secondaryDisabled && styles.disabled]}>
        <Icon name={running ? 'flag' : 'reset'} size={19} color={secondaryDisabled ? c.subtle : c.ink} />
        <Text style={[styles.secondaryText, secondaryDisabled && { color: c.subtle }]}>{running ? m.lap : m.reset}</Text>
      </MotionPressable>
      <MotionPressable accessibilityRole="button" accessibilityLabel={running ? m.pause : hasTime ? m.resume : m.start} onPress={toggleRunning} style={[styles.primary]}>
        <Icon name={running ? 'pause' : 'play'} size={19} color={c.actionIcon} strokeWidth={1.4} />
        <Text style={styles.primaryText}>{running ? m.pause : hasTime ? m.resume : m.start}</Text>
      </MotionPressable>
    </View>
    {hasTime && !running ? <MotionPressable accessibilityRole="button" onPress={() => { feedback(); update(saveSession); notify('sessionSaved'); }} style={[styles.save]}><Icon name="save" size={15} color={c.green} /><Text style={styles.saveText}>{m.saveSession}</Text></MotionPressable> : <View style={styles.hint}><View style={styles.hintDot} /><Text style={styles.hintText}>{lapLimit ? m.lapLimit : running ? m.runningHint : m.readyHint}</Text></View>}
    <LapList laps={stopwatch.laps} />
    <Text style={styles.footer}>{m.stopwatchFooter}</Text>
    <ConfirmSheet visible={resetDialog} title={m.resetStopwatchTitle} description={m.resetStopwatchHelp} confirmLabel={m.resetStopwatch} onClose={() => setResetDialog(false)} onConfirm={() => { feedback(); update((previous) => ({ ...previous, stopwatch: emptyStopwatch() })); setResetDialog(false); }} />
  </ScrollView>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 26, paddingBottom: 26 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, marginBottom: 11 },
  dash: { width: 17, height: 2, backgroundColor: c.green, borderRadius: 1 },
  eyebrowText: { fontFamily: f.semibold, fontSize: textSizes.small, color: c.green, letterSpacing: 1.7 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: 32, letterSpacing: -1.5, marginBottom: 7 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, marginBottom: 22 },
  actions: { flexDirection: 'row', gap: 12 },
  primary: { flex: 1.32, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.action, minHeight: 61, paddingVertical: 19, borderRadius: 19 },
  primaryText: { fontFamily: f.semibold, color: c.actionText, fontSize: textSizes.body },
  secondary: { flex: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.secondary, minHeight: 61, paddingVertical: 19, borderRadius: 19 },
  secondaryText: { fontFamily: f.semibold, color: c.ink, fontSize: textSizes.caption },
  disabled: { backgroundColor: c.disabled },
  hint: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 3 },
  hintDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.subtle },
  hintText: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.small },
  save: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 7, backgroundColor: c.limeSoft, borderRadius: 13 },
  saveText: { fontFamily: f.semibold, color: c.green, fontSize: textSizes.small },
  footer: { fontFamily: f.medium, fontSize: textSizes.small, color: c.muted, letterSpacing: 1.7, textAlign: 'center', marginTop: 29 },
});
