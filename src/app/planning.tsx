import { useI18n } from '../hooks/useI18n';
import { useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { useThemeStyles } from '../context/ThemeContext';
import { deleteSchedule, isProtectedSchedule, MAX_NAME_LENGTH, MAX_SCHEDULES, saveSchedule } from '../core/planning';
import type { Schedule } from '../core/planning';
import { dateKeyFromParts, datePartsFromKey, localDateKey, matchesScheduleDate, type CalendarDateParts } from '../core/planningCalendar';
import { planningDateLabel } from '../i18n/formatters';
import { duplicateSchedule, PLANNING_TEMPLATES, scheduleFromTemplate, type PlanningTemplateId } from '../core/planningTools';
import { formatRemaining } from '../core/timer';
import { ScheduleEditorSheet } from '../components/ScheduleEditorSheet';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { CalendarDateFields } from '../components/CalendarDateFields';
import { createTimingId } from '../hooks/createTimingId';
import { PlanningRunCard } from '../components/PlanningRunCard';
import { ScheduleCard } from '../components/ScheduleCard';
import { textSizes, buttonPressedStyle, fonts as f, Palette } from '../theme';

export default function PlanningScreen() {
  const { language, messages: m } = useI18n();
  const { data, update, getSnapshot, feedback, notify, planning, notifications } = useCrono(); const styles = useThemeStyles(createStyles);
  const [editor, setEditor] = useState<{ schedule: Schedule; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [replacing, setReplacing] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateDraft, setDateDraft] = useState<CalendarDateParts | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false), [menuId, setMenuId] = useState<string | null>(null);
  const schedules = data.planning.schedules;
  const scheduleLimit = schedules.length >= MAX_SCHEDULES;
  const visibleSchedules = selectedDate === null ? schedules : schedules.filter((item) => matchesScheduleDate(item.calendar, selectedDate));
  const selectedDateLabel = selectedDate === null ? null : planningDateLabel(selectedDate, language);
  const dateCandidate = dateDraft && dateKeyFromParts(dateDraft);
  const openTemplate = (template: PlanningTemplateId) => {
    const copy = m.planningTemplateNames[template];
    const schedule = scheduleFromTemplate({ template, id: createTimingId(), stepIds: PLANNING_TEMPLATES[template].map(() => createTimingId()),
      name: copy.name, stepNames: copy.steps });
    if (!schedule || getSnapshot().planning.schedules.length >= MAX_SCHEDULES) return;
    feedback(); setTemplatesOpen(false); setMenuId(null);
    setEditor({ isNew: true, schedule: selectedDate ? { ...schedule, calendar: { kind: 'once', date: selectedDate } } : schedule });
  };
  const duplicate = (id: string) => {
    const current = getSnapshot().planning;
    const source = current.schedules.find((item) => item.id === id);
    if (!source || current.schedules.length >= MAX_SCHEDULES) return;
    const suffix = ` (${m.scheduleCopySuffix})`;
    const schedule = duplicateSchedule(source, { id: createTimingId(), stepIds: source.steps.map(() => createTimingId()),
      name: source.name.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd() + suffix });
    if (schedule) { feedback(); setMenuId(null); setEditor({ isNew: true, schedule }); }
  };
  const closeDatePicker = () => {
    feedback();
    Keyboard.dismiss();
    setDateDraft(null);
  };
  const start = (schedule: Schedule) => {
    feedback();
    if (data.planning.run && data.planning.run.status !== 'completed') setReplacing(schedule);
    else if (!planning.controls.start(schedule.id)) notify('scheduleUnavailable');
    else void notifications.controller.requestPermission();
  };
  const save = (schedule: Schedule): boolean => {
    const result = update((previous) => {
      const planning = saveSchedule(previous.planning, schedule);
      return planning === previous.planning ? previous : { ...previous, planning };
    });
    const saved = result.data.planning.schedules.find((item) => item.id === schedule.id);
    const accepted = result.changed || JSON.stringify(saved) === JSON.stringify(schedule);
    if (accepted) { feedback(); notify('scheduleSaved'); }
    return accepted;
  };
  return <View style={styles.screen}>
    <FlatList style={styles.list} data={visibleSchedules} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <Text accessibilityRole="header" style={styles.title}>{m.planningTab}</Text>
        <Text style={styles.subtitle}>{m.planningSubtitle}</Text>
        <Pressable accessibilityRole="button" disabled={scheduleLimit} onPress={() => {
          feedback();
          setEditor({ isNew: true, schedule: {
            id: createTimingId(),
            name: '',
            steps: [{ id: createTimingId(), name: m.stepNumber(1), durationMs: 300000 }],
            calendar: selectedDate === null ? undefined : { kind: 'once', date: selectedDate },
          } });
        }} style={({ pressed }) => [styles.primary, pressed && !scheduleLimit && buttonPressedStyle, scheduleLimit && styles.disabled]}><Text style={styles.primaryText}>{m.newSchedule}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: templatesOpen }} aria-expanded={templatesOpen} disabled={scheduleLimit}
          onPress={() => { feedback(); setTemplatesOpen((open) => !open); }}
          style={({ pressed }) => [styles.filterButton, styles.templateToggle, scheduleLimit && styles.disabled, pressed && buttonPressedStyle]}>
          <Text style={styles.secondaryText}>{m.planningTemplates}</Text>
        </Pressable>
        {templatesOpen && <View style={styles.templateChoices}>{(Object.keys(PLANNING_TEMPLATES) as PlanningTemplateId[]).map((id) => {
          const copy = m.planningTemplateNames[id], durations = PLANNING_TEMPLATES[id];
          const summary = `${m.stepCount(durations.length)} · ${formatRemaining(durations.reduce((sum: number, value) => sum + value, 0))}`;
          const preview = copy.steps.slice(0, 3).join(' → ') + (copy.steps.length > 3 ? ' …' : '');
          return <Pressable key={id} accessibilityRole="button" accessibilityLabel={copy.name} accessibilityHint={summary}
            disabled={scheduleLimit} accessibilityState={{ disabled: scheduleLimit }} onPress={() => openTemplate(id)}
            style={({ pressed }) => [styles.filterButton, styles.templateChoice, scheduleLimit && styles.disabled, pressed && !scheduleLimit && buttonPressedStyle]}>
            <Text style={styles.secondaryText}>{copy.name}</Text>
            <Text style={styles.templateSummary}>{summary}</Text>
            <Text numberOfLines={2} style={styles.templatePreview}>{preview}</Text>
          </Pressable>;
        })}</View>}
        <Text style={styles.limit}>{m.scheduleLimit(schedules.length, MAX_SCHEDULES)}</Text>
        <View style={styles.filters}>
          <Pressable accessibilityRole="button" onPress={() => { feedback(); setSelectedDate(null); }}
            style={({ pressed }) => [styles.filterButton, selectedDate === null && styles.filterSelected, pressed && buttonPressedStyle]}>
            <Text style={styles.secondaryText}>{m.calendarAll}</Text>
          </Pressable>
          <Pressable accessibilityRole="button"
            accessibilityLabel={selectedDateLabel ? `${m.calendarChooseDay} · ${selectedDateLabel}` : m.calendarChooseDay}
            onPress={() => { feedback(); setDateDraft(datePartsFromKey(selectedDate ?? localDateKey(new Date()))); }}
            style={({ pressed }) => [styles.filterButton, selectedDate !== null && styles.filterSelected, pressed && buttonPressedStyle]}>
            <Text style={styles.secondaryText}>{selectedDateLabel ?? m.calendarChooseDay}</Text>
          </Pressable>
        </View>
        <PlanningRunCard />
      </>}
      ListEmptyComponent={<Text style={styles.empty}>{selectedDate === null ? m.planningEmpty : m.calendarEmpty}</Text>}
      renderItem={({ item }) => {
        const protectedTemplate = isProtectedSchedule(data.planning, item.id);
        return <ScheduleCard schedule={item} protectedTemplate={protectedTemplate} canDuplicate={!scheduleLimit} expanded={menuId === item.id}
          onToggle={() => { feedback(); setMenuId((id) => id === item.id ? null : item.id); }} onStart={() => { setMenuId(null); start(item); }}
          onEdit={() => { feedback(); setMenuId(null); setEditor({ schedule: item, isNew: false }); }}
          onDelete={() => { feedback(); setMenuId(null); setDeleting(item); }} onDuplicate={() => duplicate(item.id)} />;
      }} />
    {dateDraft && <Sheet visible title={m.calendarChooseDay} onClose={closeDatePicker}>
      <View style={styles.dateControls}>
        <CalendarDateFields value={dateDraft}
          onChange={(field, text) => setDateDraft((previous) => previous && { ...previous, [field]: text })} />
        {!dateCandidate && <Text accessibilityLiveRegion="polite" style={styles.danger}>{m.calendarInvalidDate}</Text>}
        <Pressable accessibilityRole="button"
          onPress={() => { feedback(); setDateDraft(datePartsFromKey(localDateKey(new Date()))); }}
          style={({ pressed }) => [styles.filterButton, pressed && buttonPressedStyle]}>
          <Text style={styles.secondaryText}>{m.calendarToday}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!dateCandidate} onPress={() => {
          if (!dateCandidate) return;
          setSelectedDate(dateCandidate);
          closeDatePicker();
        }} style={({ pressed }) => [styles.primary, styles.datePrimary, !dateCandidate && styles.disabled, pressed && buttonPressedStyle]}>
          <Text style={styles.primaryText}>{m.calendarShow}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={closeDatePicker}
          style={({ pressed }) => [styles.filterButton, pressed && buttonPressedStyle]}>
          <Text style={styles.secondaryText}>{m.cancel}</Text>
        </Pressable>
      </View>
    </Sheet>}
    {editor && <ScheduleEditorSheet schedule={editor.schedule} isNew={editor.isNew} onClose={() => setEditor(null)} onSave={save} />}
    <ConfirmSheet visible={deleting !== null} title={m.deleteScheduleTitle} description={m.deleteScheduleHelp} confirmLabel={m.deleteScheduleConfirm} onClose={() => setDeleting(null)} onConfirm={() => {
      if (!deleting) return;
      feedback(); update((previous) => { const planning = deleteSchedule(previous.planning, deleting.id); return planning === previous.planning ? previous : { ...previous, planning }; }); setDeleting(null);
    }} />
    <ConfirmSheet visible={replacing !== null} title={m.replaceScheduleTitle} description={m.replaceScheduleHelp} confirmLabel={m.replaceScheduleConfirm} onClose={() => setReplacing(null)} onConfirm={() => {
      if (replacing) {
        feedback();
        if (!planning.controls.start(replacing.id, true)) notify('scheduleUnavailable');
        else void notifications.controller.requestPermission();
      }
      setReplacing(null);
    }} />
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 8, paddingBottom: 24 },
  title: { fontFamily: f.bold, color: c.ink, fontSize: textSizes.heading, letterSpacing: -0.7 },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 8 },
  primary: { backgroundColor: c.action, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: c.actionText, fontFamily: f.semibold, fontSize: textSizes.body },
  limit: { color: c.muted, fontFamily: f.regular, fontSize: textSizes.small, lineHeight: 21, marginVertical: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  templateToggle: { marginTop: 10 }, templateChoices: { marginTop: 8, gap: 8 },
  templateChoice: { alignItems: 'stretch', padding: 12 },
  templateSummary: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 4 },
  templatePreview: { fontFamily: f.regular, color: c.ink, fontSize: textSizes.caption, lineHeight: 21, marginTop: 4 },
  filterButton: { minHeight: 44, minWidth: 44, flexShrink: 1, borderWidth: 1, borderColor: c.border, borderRadius: 10,
    backgroundColor: c.secondary, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  filterSelected: { backgroundColor: c.limeSoft, borderColor: c.green },
  dateControls: { gap: 12, paddingBottom: 14 },
  datePrimary: { marginTop: 0 },
  list: { flex: 1 }, empty: { color: c.muted, fontFamily: f.regular, lineHeight: 22, marginVertical: 22 },
  secondaryText: { fontFamily: f.medium, color: c.ink, fontSize: textSizes.caption }, danger: { fontFamily: f.medium, color: c.danger, fontSize: textSizes.caption }, disabled: { opacity: 0.4 },
});
