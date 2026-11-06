import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { deleteSchedule, isProtectedSchedule, MAX_SCHEDULES, saveSchedule } from '../core/planning';
import type { Schedule } from '../core/planning';
import { formatRemaining } from '../core/timer';
import { ScheduleEditorSheet } from '../components/ScheduleEditorSheet';
import { ConfirmSheet } from '../components/Sheet';
import { createTimingId } from '../hooks/createTimingId';
import { PlanningRunCard } from '../components/PlanningRunCard';
import { buttonPressedStyle, fonts as f, Palette } from '../theme';

export default function PlanningScreen() {
  const { data, update, feedback, notify, planning } = useCrono(); const styles = useThemeStyles(createStyles);
  const [editor, setEditor] = useState<{ schedule: Schedule; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [replacing, setReplacing] = useState<Schedule | null>(null);
  const scheduleLimit = data.planning.schedules.length >= MAX_SCHEDULES;
  const start = (schedule: Schedule) => {
    feedback();
    if (data.planning.run && data.planning.run.status !== 'completed') setReplacing(schedule);
    else if (!planning.controls.start(schedule.id)) notify('Orarul nu poate fi pornit acum.');
  };
  const save = (schedule: Schedule): boolean => {
    const result = update((previous) => {
      const planning = saveSchedule(previous.planning, schedule);
      return planning === previous.planning ? previous : { ...previous, planning };
    });
    const saved = result.data.planning.schedules.find((item) => item.id === schedule.id);
    const accepted = result.changed || JSON.stringify(saved) === JSON.stringify(schedule);
    if (accepted) { feedback(); notify('Orar salvat.'); }
    return accepted;
  };
  return <View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Planificare</Text>
    <Text style={styles.subtitle}>Mai multe etape. Un ritm ales de tine.</Text>
    <Pressable accessibilityRole="button" disabled={scheduleLimit} onPress={() => {
      feedback(); setEditor({ isNew: true, schedule: { id: createTimingId(), name: '', steps: [{ id: createTimingId(), name: 'Etapa 1', durationMs: 300000 }] } });
    }} style={({ pressed }) => [styles.primary, pressed && !scheduleLimit && buttonPressedStyle, scheduleLimit && styles.disabled]}><Text style={styles.primaryText}>Orar nou</Text></Pressable>
    <Text style={styles.limit}>{data.planning.schedules.length}/{MAX_SCHEDULES} orare salvate · un singur orar activ</Text>
    <FlatList data={data.planning.schedules} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListHeaderComponent={<PlanningRunCard />}
      ListEmptyComponent={<Text style={styles.empty}>Creează un orar cu acțiuni și durate, apoi urmează etapele pe rând.</Text>}
      renderItem={({ item }) => {
        const protectedTemplate = isProtectedSchedule(data.planning, item.id);
        return <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.subtitle}>{item.steps.length} etape · {formatRemaining(item.steps.reduce((sum, step) => sum + step.durationMs, 0))}</Text>
          {protectedTemplate && <Text style={styles.limit}>Oprește orarul înainte să îl modifici.</Text>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Pornește orarul ${item.name}`} disabled={protectedTemplate} onPress={() => start(item)} style={({ pressed }) => [styles.secondary, pressed && !protectedTemplate && buttonPressedStyle, protectedTemplate && styles.disabled]}><Text style={styles.secondaryText}>Pornește</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Editează orarul ${item.name}`} disabled={protectedTemplate} onPress={() => { feedback(); setEditor({ schedule: item, isNew: false }); }} style={({ pressed }) => [styles.secondary, pressed && !protectedTemplate && buttonPressedStyle, protectedTemplate && styles.disabled]}><Text style={styles.secondaryText}>Editează</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Șterge orarul ${item.name}`} disabled={protectedTemplate} onPress={() => { feedback(); setDeleting(item); }} style={({ pressed }) => [styles.secondary, pressed && !protectedTemplate && buttonPressedStyle, protectedTemplate && styles.disabled]}><Text style={styles.danger}>Șterge</Text></Pressable>
          </View>
        </View>;
      }} />
    {editor && <ScheduleEditorSheet schedule={editor.schedule} isNew={editor.isNew} onClose={() => setEditor(null)} onSave={save} />}
    <ConfirmSheet visible={deleting !== null} title="Ștergi orarul?" description="Orarul și etapele sale vor fi șterse de pe acest dispozitiv." confirmLabel="Șterge orarul" onClose={() => setDeleting(null)} onConfirm={() => {
      if (!deleting) return;
      feedback(); update((previous) => { const planning = deleteSchedule(previous.planning, deleting.id); return planning === previous.planning ? previous : { ...previous, planning }; }); setDeleting(null);
    }} />
    <ConfirmSheet visible={replacing !== null} title="Înlocuiești orarul activ?" description="Orarul curent se va opri. Noul orar începe de la prima etapă." confirmLabel="Înlocuiește orarul" onClose={() => setReplacing(null)} onConfirm={() => {
      if (replacing) { feedback(); if (!planning.controls.start(replacing.id, true)) notify('Orarul nu poate fi pornit acum.'); }
      setReplacing(null);
    }} />
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 26, paddingTop: 8 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: 23, letterSpacing: -0.7 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  primary: { backgroundColor: c.action, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: c.actionText, fontFamily: f.semibold, fontSize: 13 },
  limit: { color: c.muted, fontFamily: f.regular, fontSize: 10, lineHeight: 17, marginVertical: 10 },
  list: { paddingBottom: 24 }, empty: { color: c.muted, fontFamily: f.regular, lineHeight: 22, marginVertical: 22 },
  card: { borderWidth: 1, borderColor: c.border, borderRadius: 17, padding: 16, marginBottom: 12, backgroundColor: c.surface },
  name: { fontFamily: f.semibold, color: c.ink, fontSize: 16 }, actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondary: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: c.secondary },
  secondaryText: { fontFamily: f.medium, color: c.ink, fontSize: 12 }, danger: { fontFamily: f.medium, color: c.danger, fontSize: 12 }, disabled: { opacity: 0.4 },
});
