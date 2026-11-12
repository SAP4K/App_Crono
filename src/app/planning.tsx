import { MotionPressable } from '../components/MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
import { textSizes, radii, fonts as f, Palette } from '../theme';
import { headingFamily } from '../typography';
import { Icon } from '../components/Icon';
import { useSheetPresentation } from '../hooks/useSheetPresentation';

export default function PlanningScreen() {
  const { language, messages: m } = useI18n();
  const { data, update, getSnapshot, feedback, notify, planning, notifications } = useCrono(); const styles = useThemeStyles(createStyles);
  const editorSheet = useSheetPresentation<{ schedule: Schedule; isNew: boolean }>();
  const editor = editorSheet.presentation?.value;
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [replacing, setReplacing] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dateSheet = useSheetPresentation<CalendarDateParts>();
  const dateDraft = dateSheet.presentation?.value;
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
    editorSheet.open({ isNew: true, schedule: selectedDate ? { ...schedule, calendar: { kind: 'once', date: selectedDate } } : schedule });
  };
  const duplicate = (id: string) => {
    const current = getSnapshot().planning;
    const source = current.schedules.find((item) => item.id === id);
    if (!source || current.schedules.length >= MAX_SCHEDULES) return;
    const suffix = ` (${m.scheduleCopySuffix})`;
    const schedule = duplicateSchedule(source, { id: createTimingId(), stepIds: source.steps.map(() => createTimingId()),
      name: source.name.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd() + suffix });
    if (schedule) { feedback(); setMenuId(null); editorSheet.open({ isNew: true, schedule }); }
  };
  const closeDatePicker = () => {
    feedback();
    dateSheet.close();
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
        <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{m.planningTab}</Text>
        <MotionPressable accessibilityRole="button" accessibilityLabel={m.newSchedule} disabled={scheduleLimit} onPress={() => {
          feedback();
          editorSheet.open({ isNew: true, schedule: {
            id: createTimingId(),
            name: '',
            steps: [{ id: createTimingId(), name: m.stepNumber(1), durationMs: 300000 }],
            calendar: selectedDate === null ? undefined : { kind: 'once', date: selectedDate },
          } });
        }} style={[styles.newAction, scheduleLimit && styles.disabled]}><Icon name="plus" size={21} color={styles.primaryText.color} /></MotionPressable>
        </View>
        <Text style={styles.subtitle}>{m.planningSubtitle}</Text>
        <MotionPressable accessibilityRole="button" accessibilityState={{ expanded: templatesOpen }} aria-expanded={templatesOpen} disabled={scheduleLimit}
          onPress={() => { feedback(); setTemplatesOpen((open) => !open); }}
          style={[styles.filterButton, styles.templateToggle, scheduleLimit && styles.disabled]}>
          <Text style={styles.secondaryText}>{m.planningTemplates}</Text>
        </MotionPressable>
        {templatesOpen && <View style={styles.templateChoices}>{(Object.keys(PLANNING_TEMPLATES) as PlanningTemplateId[]).map((id) => {
          const copy = m.planningTemplateNames[id], durations = PLANNING_TEMPLATES[id];
          const summary = `${m.stepCount(durations.length)} · ${formatRemaining(durations.reduce((sum: number, value) => sum + value, 0))}`;
          const preview = copy.steps.slice(0, 3).join(' → ') + (copy.steps.length > 3 ? ' …' : '');
          return <MotionPressable key={id} accessibilityRole="button" accessibilityLabel={copy.name} accessibilityHint={summary}
            disabled={scheduleLimit} accessibilityState={{ disabled: scheduleLimit }} onPress={() => openTemplate(id)}
            style={[styles.filterButton, styles.templateChoice, scheduleLimit && styles.disabled]}>
            <Text style={styles.secondaryText}>{copy.name}</Text>
            <Text style={styles.templateSummary}>{summary}</Text>
            <Text numberOfLines={2} style={styles.templatePreview}>{preview}</Text>
          </MotionPressable>;
        })}</View>}
        <Text style={styles.limit}>{m.scheduleLimit(schedules.length, MAX_SCHEDULES)}</Text>
        <View style={styles.filters}>
          <MotionPressable accessibilityRole="button" onPress={() => { feedback(); setSelectedDate(null); }}
            style={[styles.filterButton, selectedDate === null && styles.filterSelected]}>
            <Text style={styles.secondaryText}>{m.calendarAll}</Text>
          </MotionPressable>
          <MotionPressable accessibilityRole="button"
            accessibilityLabel={selectedDateLabel ? `${m.calendarChooseDay} · ${selectedDateLabel}` : m.calendarChooseDay}
            onPress={() => { feedback(); dateSheet.open(datePartsFromKey(selectedDate ?? localDateKey(new Date()))); }}
            style={[styles.filterButton, selectedDate !== null && styles.filterSelected]}>
            <Text style={styles.secondaryText}>{selectedDateLabel ?? m.calendarChooseDay}</Text>
          </MotionPressable>
        </View>
        <PlanningRunCard />
      </>}
      ListEmptyComponent={<Text style={styles.empty}>{selectedDate === null ? m.planningEmpty : m.calendarEmpty}</Text>}
      renderItem={({ item }) => {
        const protectedTemplate = isProtectedSchedule(data.planning, item.id);
        return <ScheduleCard schedule={item} protectedTemplate={protectedTemplate} canDuplicate={!scheduleLimit} expanded={menuId === item.id}
          onToggle={() => { feedback(); setMenuId((id) => id === item.id ? null : item.id); }} onStart={() => { setMenuId(null); start(item); }}
          onEdit={() => { feedback(); setMenuId(null); editorSheet.open({ schedule: item, isNew: false }); }}
          onDelete={() => { feedback(); setMenuId(null); setDeleting(item); }} onDuplicate={() => duplicate(item.id)} />;
      }} />
    {dateDraft && dateSheet.presentation && <Sheet visible={dateSheet.presentation.visible} title={m.calendarChooseDay} onClose={closeDatePicker}
      onAfterClose={() => dateSheet.afterClose(dateSheet.presentation!.token)}>
      <View style={styles.dateControls}>
        <CalendarDateFields value={dateDraft}
          onChange={(field, text) => dateSheet.change((previous) => ({ ...previous, [field]: text }))} />
        {!dateCandidate && <Text accessibilityLiveRegion="polite" style={styles.danger}>{m.calendarInvalidDate}</Text>}
        <MotionPressable accessibilityRole="button"
          onPress={() => { feedback(); dateSheet.change(() => datePartsFromKey(localDateKey(new Date()))); }}
          style={[styles.filterButton]}>
          <Text style={styles.secondaryText}>{m.calendarToday}</Text>
        </MotionPressable>
        <MotionPressable accessibilityRole="button" disabled={!dateCandidate} onPress={() => {
          if (!dateCandidate) return;
          setSelectedDate(dateCandidate);
          closeDatePicker();
        }} style={[styles.primary, styles.datePrimary, !dateCandidate && styles.disabled]}>
          <Text style={styles.primaryText}>{m.calendarShow}</Text>
        </MotionPressable>
        <MotionPressable accessibilityRole="button" onPress={closeDatePicker}
          style={[styles.filterButton]}>
          <Text style={styles.secondaryText}>{m.cancel}</Text>
        </MotionPressable>
      </View>
    </Sheet>}
    {editor && editorSheet.presentation && <ScheduleEditorSheet key={editorSheet.presentation.token} schedule={editor.schedule} isNew={editor.isNew}
      visible={editorSheet.presentation.visible} onClose={editorSheet.close} onAfterClose={() => editorSheet.afterClose(editorSheet.presentation!.token)} onSave={save} />}
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
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, minWidth: 0, fontFamily: headingFamily, fontWeight: '400', color: c.ink, fontSize: 30, lineHeight: 39, letterSpacing: -0.3 },
  newAction: { width: 44, height: 44, flexShrink: 0, borderRadius: radii.control, backgroundColor: c.action, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 8 },
  primary: { backgroundColor: c.action, borderRadius: radii.control, minHeight: 52, padding: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: c.actionText, fontFamily: f.semibold, fontSize: textSizes.body },
  limit: { color: c.muted, fontFamily: f.regular, fontSize: textSizes.small, lineHeight: 21, marginVertical: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  templateToggle: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 0, borderWidth: 0, backgroundColor: c.background }, templateChoices: { marginTop: 8, gap: 8 },
  templateChoice: { alignItems: 'stretch', padding: 12 },
  templateSummary: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 4 },
  templatePreview: { fontFamily: f.regular, color: c.ink, fontSize: textSizes.caption, lineHeight: 21, marginTop: 4 },
  filterButton: { minHeight: 44, minWidth: 44, flexShrink: 1, borderWidth: 1, borderColor: c.border, borderRadius: radii.control,
    backgroundColor: c.background, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  filterSelected: { backgroundColor: c.limeSoft, borderColor: c.green },
  dateControls: { gap: 12, paddingBottom: 14 },
  datePrimary: { marginTop: 0 },
  list: { flex: 1 }, empty: { color: c.muted, fontFamily: f.regular, lineHeight: 22, marginVertical: 22 },
  secondaryText: { fontFamily: f.medium, color: c.ink, fontSize: textSizes.caption }, danger: { fontFamily: f.medium, color: c.danger, fontSize: textSizes.caption }, disabled: { opacity: 0.4 },
});
