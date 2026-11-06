import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_NAME_LENGTH, MAX_STEPS, readSchedule } from '../core/planning';
import type { Schedule } from '../core/planning';
import { formatRemaining, parseDuration } from '../core/timer';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { createTimingId } from '../hooks/createTimingId';
import { buttonPressedStyle, fonts as f, Palette } from '../theme';
import { Sheet } from './Sheet';
import { ScheduleStepRow } from './ScheduleStepRow';
import type { StepDraft } from './ScheduleStepRow';

function draftOf(schedule: Schedule) {
  return { name: schedule.name, steps: schedule.steps.map((step): StepDraft => {
    const seconds = step.durationMs / 1000;
    return { id: step.id, name: step.name, hours: String(Math.floor(seconds / 3600)).padStart(2, '0'),
      minutes: String(Math.floor(seconds / 60) % 60).padStart(2, '0'), seconds: String(seconds % 60).padStart(2, '0') };
  }) };
}

export function ScheduleEditorSheet({ schedule, isNew, onClose, onSave }: {
  schedule: Schedule; isNew: boolean; onClose: () => void; onSave: (schedule: Schedule) => boolean;
}) {
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  const [initial] = useState(() => draftOf(schedule)); const [draft, setDraft] = useState(initial);
  const [discard, setDiscard] = useState(false); const [saveError, setSaveError] = useState(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const candidate = readSchedule({ id: schedule.id, name: draft.name, steps: draft.steps.map((step) => ({
    id: step.id, name: step.name, durationMs: parseDuration(step.hours, step.minutes, step.seconds) ?? 0,
  })) });
  const total = candidate?.steps.reduce((sum, step) => sum + step.durationMs, 0) ?? 0;
  const stepLimit = draft.steps.length >= MAX_STEPS;
  const close = () => { if (discard) setDiscard(false); else if (dirty) setDiscard(true); else onClose(); };
  const move = (index: number, direction: number) => setDraft((previous) => {
    const next = index + direction;
    if (next < 0 || next >= previous.steps.length) return previous;
    const steps = [...previous.steps]; [steps[index], steps[next]] = [steps[next], steps[index]];
    return { ...previous, steps };
  });
  return <Sheet visible title={discard ? 'Renunți la modificări?' : isNew ? 'Orar nou' : 'Editează orarul'} onClose={close} scrollable={false}>
    {discard ? <View style={styles.discard}>
      <Text style={styles.help}>Modificările nesalvate se vor pierde.</Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.secondary, pressed && buttonPressedStyle]}><Text style={styles.danger}>Renunță la modificări</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setDiscard(false)} style={({ pressed }) => [styles.primary, pressed && buttonPressedStyle]}><Text style={styles.primaryText}>Continuă editarea</Text></Pressable>
    </View> : <>
      <TextInput accessibilityLabel="Nume orar" placeholder="De exemplu, Studiu" placeholderTextColor={c.muted} value={draft.name} maxLength={MAX_NAME_LENGTH} onChangeText={(name) => setDraft((previous) => ({ ...previous, name }))} style={styles.name} selectionColor={c.green} />
      <Text style={styles.help}>{draft.steps.length}/{MAX_STEPS} etape · {candidate ? `Total ${formatRemaining(total)}` : 'Adaugă un nume și durate între 00:00:01 și 23:59:59.'}</Text>
      <FlatList data={draft.steps} keyExtractor={(step) => step.id} keyboardShouldPersistTaps="handled" initialNumToRender={4} style={styles.list} renderItem={({ item, index }) => <ScheduleStepRow value={item} index={index} count={draft.steps.length}
        onChange={(changes) => setDraft((previous) => ({ ...previous, steps: previous.steps.map((step) => step.id === item.id ? { ...step, ...changes } : step) }))}
        onMove={(direction) => move(index, direction)} onRemove={() => setDraft((previous) => ({ ...previous, steps: previous.steps.filter((step) => step.id !== item.id) }))} />}
        ListFooterComponent={<Pressable accessibilityRole="button" disabled={stepLimit} onPress={() => {
          const step: StepDraft = { id: createTimingId(), name: `Etapa ${draft.steps.length + 1}`, hours: '00', minutes: '05', seconds: '00' };
          setDraft((previous) => ({ ...previous, steps: [...previous.steps, step] }));
        }} style={({ pressed }) => [styles.secondary, pressed && !stepLimit && buttonPressedStyle, stepLimit && styles.disabled]}><Text style={styles.secondaryText}>Adaugă etapă</Text></Pressable>} />
      {saveError && <Text accessibilityLiveRegion="polite" style={styles.danger}>Orarul nu poate fi salvat acum. Verifică dacă este activ sau ai atins limita.</Text>}
      <Pressable accessibilityRole="button" disabled={!candidate} onPress={() => { if (candidate) { if (onSave(candidate)) onClose(); else setSaveError(true); } }} style={({ pressed }) => [styles.primary, pressed && !!candidate && buttonPressedStyle, !candidate && styles.disabled]}><Text style={styles.primaryText}>Salvează orarul</Text></Pressable>
    </>}
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  name: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, fontFamily: f.semibold, color: c.ink, fontSize: 15, backgroundColor: c.surface },
  help: { fontFamily: f.regular, fontSize: 11, lineHeight: 18, color: c.muted, marginVertical: 12 },
  list: { flex: 1 },
  primary: { minHeight: 48, paddingHorizontal: 14, backgroundColor: c.action, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primaryText: { fontFamily: f.semibold, fontSize: 13, color: c.actionText },
  secondary: { minHeight: 46, borderRadius: 12, padding: 12, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  secondaryText: { fontFamily: f.medium, fontSize: 12, color: c.ink },
  disabled: { opacity: 0.4 }, danger: { fontFamily: f.medium, fontSize: 12, color: c.danger }, discard: { gap: 12 },
});
