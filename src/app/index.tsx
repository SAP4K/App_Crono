import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { emptyStopwatch, MAX_LAPS, pause, recordLap, saveSession, start } from '../core/stopwatch';
import { StopwatchFace } from '../components/StopwatchFace';
import { LapList } from '../components/LapList';
import { Icon } from '../components/Icon';
import { ConfirmSheet } from '../components/Sheet';
import { colors as c, fonts as f } from '../theme';

export default function StopwatchScreen() {
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
    <View style={styles.eyebrow}><View style={styles.dash} /><Text style={styles.eyebrowText}>UN MOMENT PENTRU TINE</Text></View>
    <Text accessibilityRole="header" style={styles.title}>În ritmul tău.</Text>
    <Text style={[styles.subtitle, compact && { marginBottom: 8 }]}>Fiecare secundă, sub control.</Text>
    <StopwatchFace stopwatch={stopwatch} />
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={running ? 'Înregistrează o tură' : 'Resetează cronometrul'} accessibilityState={{ disabled: secondaryDisabled }} disabled={secondaryDisabled} onPress={secondaryAction} style={({ pressed }) => [styles.secondary, secondaryDisabled && styles.disabled, pressed && styles.pressed]}>
        <Icon name={running ? 'flag' : 'reset'} size={19} color={secondaryDisabled ? c.subtle : c.ink} />
        <Text style={[styles.secondaryText, secondaryDisabled && { color: c.subtle }]}>{running ? 'Tură' : 'Resetează'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={running ? 'Pauză' : hasTime ? 'Continuă' : 'Pornește'} onPress={toggleRunning} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Icon name={running ? 'pause' : 'play'} size={19} color={c.lime} strokeWidth={1.4} />
        <Text style={styles.primaryText}>{running ? 'Pauză' : hasTime ? 'Continuă' : 'Pornește'}</Text>
      </Pressable>
    </View>
    {hasTime && !running ? <Pressable accessibilityRole="button" onPress={() => { feedback(); update(saveSession); notify('Sesiune salvată în istoric.'); }} style={({ pressed }) => [styles.save, pressed && styles.pressed]}><Icon name="save" size={15} color={c.green} /><Text style={styles.saveText}>Salvează sesiunea</Text></Pressable> : <View style={styles.hint}><View style={styles.hintDot} /><Text style={styles.hintText}>{lapLimit ? 'Ai atins limita de 1.000 de ture.' : running ? 'Rămâi în mișcare. Noi ținem timpul.' : 'Un start mic. Un pas înainte.'}</Text></View>}
    <LapList laps={stopwatch.laps} />
    <Text style={styles.footer}>FĂ LOC LUCRURILOR CARE CONTEAZĂ.</Text>
    <ConfirmSheet visible={resetDialog} title="Un nou început?" description="Timpul și turele acestei sesiuni vor fi șterse. Poți salva sesiunea în istoric înainte de resetare." confirmLabel="Resetează cronometrul" onClose={() => setResetDialog(false)} onConfirm={() => { feedback(); update((previous) => ({ ...previous, stopwatch: emptyStopwatch() })); setResetDialog(false); }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 26, paddingBottom: 26 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, marginBottom: 11 },
  dash: { width: 17, height: 2, backgroundColor: '#839D59', borderRadius: 1 },
  eyebrowText: { fontFamily: f.semibold, fontSize: 8, color: '#7C8C67', letterSpacing: 1.7 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: 32, letterSpacing: -1.5, marginBottom: 7 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: 12, marginBottom: 22 },
  actions: { flexDirection: 'row', gap: 12 },
  primary: { flex: 1.32, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.ink, minHeight: 61, paddingVertical: 19, borderRadius: 19 },
  primaryText: { fontFamily: f.semibold, color: c.background, fontSize: 14 },
  secondary: { flex: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8EDDDE6', minHeight: 61, paddingVertical: 19, borderRadius: 19 },
  secondaryText: { fontFamily: f.semibold, color: c.ink, fontSize: 12 },
  disabled: { backgroundColor: '#ECEFE5' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  hint: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 3 },
  hintDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#A4B788' },
  hintText: { fontFamily: f.regular, color: '#8B947F', fontSize: 10 },
  save: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 7, backgroundColor: c.limeSoft, borderRadius: 13 },
  saveText: { fontFamily: f.semibold, color: c.green, fontSize: 11 },
  footer: { fontFamily: f.medium, fontSize: 7, color: '#A5AF97', letterSpacing: 1.7, textAlign: 'center', marginTop: 29 },
});
