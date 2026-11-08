import { useI18n } from '../hooks/useI18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_NAME_LENGTH, MAX_STEPS, readSchedule } from '../core/planning';
import type { Schedule } from '../core/planning';
import type { ScheduleCalendar } from '../core/planningCalendar';
import { scheduleCalendarLabel } from '../i18n/formatters';
import { formatRemaining, parseDuration } from '../core/timer';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { createTimingId } from '../hooks/createTimingId';
import { buttonPressedStyle, fonts as f, Palette } from '../theme';
import { Sheet } from './Sheet';
import { ScheduleStepRow } from './ScheduleStepRow';
import { ScheduleCalendarPanel } from './ScheduleCalendarPanel';
import { DurationPicker } from './DurationPicker';
import { EditorBody } from './EditorBody';
import { durationMilliseconds } from '../core/durationPicker';
import type { DurationParts } from '../core/durationPicker';
import { useCrono } from '../context/CronoContext';
import type { StepDraft } from './ScheduleStepRow';

function draftOf(schedule: Schedule) {
  return { name: schedule.name, calendar: schedule.calendar, steps: schedule.steps.map((step): StepDraft => {
    const seconds = step.durationMs / 1000;
    return { id: step.id, name: step.name, hours: String(Math.floor(seconds / 3600)).padStart(2, '0'),
      minutes: String(Math.floor(seconds / 60) % 60).padStart(2, '0'), seconds: String(seconds % 60).padStart(2, '0') };
  }) };
}

export function ScheduleEditorSheet({ schedule, isNew, onClose, onSave }: {
  schedule: Schedule; isNew: boolean; onClose: () => void; onSave: (schedule: Schedule) => boolean;
}) {
  const { language, messages: m } = useI18n();
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  const [initial] = useState(() => draftOf(schedule)); const [draft, setDraft] = useState(initial);
  const [discard, setDiscard] = useState(false); const [saveError, setSaveError] = useState(false);
  const { feedback } = useCrono();
  const [durationEdit, setDurationEdit] = useState<{ stepId: string; parts: DurationParts } | null>(null);
  const [wheelBusy, setWheelBusy] = useState(false);
  const [calendarEdit, setCalendarEdit] = useState(false);
  const calendarButton = useRef<View>(null), restoreCalendarFocus = useRef(false);
  useEffect(() => {
    if (!calendarEdit && restoreCalendarFocus.current) {
      restoreCalendarFocus.current = false;
      calendarButton.current?.focus();
    }
  }, [calendarEdit]);
  const temporaryParts = useRef<DurationParts | null>(null), moving = useRef(false);
  const list = useRef<FlatList<StepDraft>>(null), listOffset = useRef(0), returnOffset = useRef(0);
  const durationButtons = useRef(new Map<string, View>()), restoreFocus = useRef<string | null>(null);
  const restoreList = useCallback(() => {
    const id = restoreFocus.current;
    if (!id) return;
    list.current?.scrollToOffset({ offset: returnOffset.current, animated: false });
    const button = durationButtons.current.get(id);
    if (button) { button.focus(); restoreFocus.current = null; }
  }, []);
  useEffect(() => { if (!durationEdit) restoreList(); }, [durationEdit, restoreList]);
  const closeDuration = () => {
    feedback(); restoreFocus.current = durationEdit?.stepId ?? null;
    temporaryParts.current = null; moving.current = false; setWheelBusy(false); setDurationEdit(null);
  };
  const openDuration = (step: StepDraft) => {
    returnOffset.current = listOffset.current;
    feedback(); Keyboard.dismiss();
    const parts = { hours: Number(step.hours), minutes: Number(step.minutes), seconds: Number(step.seconds) };
    temporaryParts.current = parts; moving.current = false; setWheelBusy(false); setDurationEdit({ stepId: step.id, parts });
  };
  const changeDuration = (changes: Partial<DurationParts>) => {
    if (!durationEdit || !temporaryParts.current) return;
    const parts = { ...temporaryParts.current, ...changes };
    temporaryParts.current = parts; setDurationEdit({ stepId: durationEdit.stepId, parts });
  };
  const applyDuration = () => {
    const parts = temporaryParts.current;
    if (!durationEdit || !parts || moving.current || durationMilliseconds(parts) === null) return;
    const id = durationEdit.stepId;
    setDraft((previous) => ({ ...previous, steps: previous.steps.map((step) => step.id !== id ? step : {
      ...step, hours: String(parts.hours).padStart(2, '0'), minutes: String(parts.minutes).padStart(2, '0'), seconds: String(parts.seconds).padStart(2, '0'),
    }) }));
    closeDuration();
  };
  const closeCalendar = () => {
    feedback();
    Keyboard.dismiss();
    restoreCalendarFocus.current = true;
    setCalendarEdit(false);
  };
  const applyCalendar = (calendar: ScheduleCalendar | undefined) => {
    setDraft((previous) => ({ ...previous, calendar }));
    closeCalendar();
  };
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const candidate = readSchedule({ id: schedule.id, name: draft.name, calendar: draft.calendar, steps: draft.steps.map((step) => ({
    id: step.id, name: step.name, durationMs: parseDuration(step.hours, step.minutes, step.seconds) ?? 0,
  })) });
  const total = candidate?.steps.reduce((sum, step) => sum + step.durationMs, 0) ?? 0;
  const stepLimit = draft.steps.length >= MAX_STEPS;
  const close = () => {
    if (durationEdit) { closeDuration(); return; }
    if (calendarEdit) { closeCalendar(); return; }
    if (discard) setDiscard(false);
    else if (dirty) setDiscard(true);
    else onClose();
  };
  const move = (index: number, direction: number) => setDraft((previous) => {
    const next = index + direction;
    if (next < 0 || next >= previous.steps.length) return previous;
    const steps = [...previous.steps]; [steps[index], steps[next]] = [steps[next], steps[index]];
    return { ...previous, steps };
  });
  const selectedIndex = durationEdit ? draft.steps.findIndex((step) => step.id === durationEdit.stepId) : -1;
  const title = durationEdit ? m.durationPickerTitle(selectedIndex + 1)
    : calendarEdit ? m.calendarSchedule
    : discard ? m.discardTitle : isNew ? m.newSchedule : m.editScheduleTitle;
  return <Sheet visible title={title} onClose={close} scrollable={false}>
    {discard && <View style={styles.discard}>
      <Text style={styles.help}>{m.discardHelp}</Text>
      <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.secondary, pressed && buttonPressedStyle]}><Text style={styles.danger}>{m.discardChanges}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setDiscard(false)} style={({ pressed }) => [styles.primary, pressed && buttonPressedStyle]}><Text style={styles.primaryText}>{m.continueEditing}</Text></Pressable>
    </View>}
    <EditorBody hidden={discard || !!durationEdit || calendarEdit}>
      <TextInput accessibilityLabel={m.scheduleName} placeholder={m.schedulePlaceholder} placeholderTextColor={c.muted} value={draft.name} maxLength={MAX_NAME_LENGTH} onChangeText={(name) => setDraft((previous) => ({ ...previous, name }))} style={styles.name} selectionColor={c.green} />
      <Pressable ref={calendarButton} accessibilityRole="button"
        onPress={() => { feedback(); Keyboard.dismiss(); setCalendarEdit(true); }}
        style={({ pressed }) => [styles.secondary, styles.calendarButton, pressed && buttonPressedStyle]}>
        <Text style={styles.secondaryText}>{m.calendarSchedule} · {scheduleCalendarLabel(draft.calendar, language)}</Text>
      </Pressable>
      <Text style={styles.help}>{m.editorCount(draft.steps.length, MAX_STEPS)} · {candidate ? m.editorTotal(formatRemaining(total)) : m.draftInvalid}</Text>
      <FlatList ref={list} data={draft.steps} onLayout={() => { if (!durationEdit) restoreList(); }}
        onScroll={({ nativeEvent }) => { if (!durationEdit) listOffset.current = nativeEvent.contentOffset.y; }} scrollEventThrottle={32} keyExtractor={(step) => step.id} keyboardShouldPersistTaps="handled" initialNumToRender={4} style={styles.list} renderItem={({ item, index }) => <ScheduleStepRow value={item} index={index} count={draft.steps.length}
        onChange={(changes) => setDraft((previous) => ({ ...previous, steps: previous.steps.map((step) => step.id === item.id ? { ...step, ...changes } : step) }))}
        onEditDuration={() => openDuration(item)} durationRef={(node) => {
          if (node) durationButtons.current.set(item.id, node); else durationButtons.current.delete(item.id);
        }} onMove={(direction) => move(index, direction)} onRemove={() => setDraft((previous) => ({ ...previous, steps: previous.steps.filter((step) => step.id !== item.id) }))} />}
        ListFooterComponent={<Pressable accessibilityRole="button" disabled={stepLimit} onPress={() => {
          const step: StepDraft = { id: createTimingId(), name: m.stepNumber(draft.steps.length + 1), hours: '00', minutes: '05', seconds: '00' };
          setDraft((previous) => ({ ...previous, steps: [...previous.steps, step] }));
        }} style={({ pressed }) => [styles.secondary, pressed && !stepLimit && buttonPressedStyle, stepLimit && styles.disabled]}><Text style={styles.secondaryText}>{m.addStep}</Text></Pressable>} />
      {saveError && <Text accessibilityLiveRegion="polite" style={styles.danger}>{m.saveScheduleError}</Text>}
      <Pressable accessibilityRole="button" disabled={!candidate} onPress={() => { if (candidate) { if (onSave(candidate)) onClose(); else setSaveError(true); } }} style={({ pressed }) => [styles.primary, pressed && !!candidate && buttonPressedStyle, !candidate && styles.disabled]}><Text style={styles.primaryText}>{m.saveSchedule}</Text></Pressable>
    </EditorBody>
    {durationEdit && <View style={styles.durationPanel}>
      <Text style={styles.help}>{draft.steps[selectedIndex]?.name}</Text>
      <DurationPicker value={durationEdit.parts} onChange={changeDuration} stepNumber={selectedIndex + 1} autoFocus
        onInteractionChange={(busy) => { moving.current = busy; setWheelBusy(busy); }} />
      <Text style={styles.help}>{durationMilliseconds(durationEdit.parts) === null ? m.durationInvalid : m.durationWheelHint}</Text>
      <Pressable accessibilityRole="button" disabled={wheelBusy || selectedIndex < 0 || durationMilliseconds(durationEdit.parts) === null}
        onPress={applyDuration} style={({ pressed }) => [styles.primary, pressed && buttonPressedStyle,
          (wheelBusy || selectedIndex < 0 || durationMilliseconds(durationEdit.parts) === null) && styles.disabled]}>
        <Text style={styles.primaryText}>{m.applyDuration}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={closeDuration} style={({ pressed }) => [styles.secondary, pressed && buttonPressedStyle]}>
        <Text style={styles.secondaryText}>{m.cancel}</Text>
      </Pressable>
    </View>}
    {calendarEdit && <ScrollView style={styles.calendarPanel} contentContainerStyle={styles.calendarContent}
      keyboardShouldPersistTaps="handled" bounces={false}>
      <ScheduleCalendarPanel initialCalendar={draft.calendar} onApply={applyCalendar} onCancel={closeCalendar} />
    </ScrollView>}
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  durationPanel: { position: 'absolute', top: 0, bottom: 0, left: 26, right: 26, zIndex: 1, backgroundColor: c.background, justifyContent: 'center', paddingBottom: 16 },
  calendarPanel: { position: 'absolute', top: 0, bottom: 0, left: 26, right: 26, zIndex: 1, backgroundColor: c.background },
  calendarContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  calendarButton: { marginTop: 8, marginBottom: 0, alignItems: 'flex-start' },
  name: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, fontFamily: f.semibold, color: c.ink, fontSize: 15, backgroundColor: c.surface },
  help: { fontFamily: f.regular, fontSize: 11, lineHeight: 18, color: c.muted, marginVertical: 12 },
  list: { flex: 1 },
  primary: { minHeight: 48, paddingHorizontal: 14, backgroundColor: c.action, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primaryText: { fontFamily: f.semibold, fontSize: 13, color: c.actionText },
  secondary: { minHeight: 46, borderRadius: 12, padding: 12, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  secondaryText: { fontFamily: f.medium, fontSize: 12, color: c.ink },
  disabled: { opacity: 0.4 }, danger: { fontFamily: f.medium, fontSize: 12, color: c.danger },
  discard: { position: 'absolute', top: 0, bottom: 0, left: 26, right: 26, zIndex: 1, backgroundColor: c.background, gap: 12 },
});
