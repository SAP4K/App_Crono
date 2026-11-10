import { MotionPressable } from './MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_NAME_LENGTH, MAX_STEPS, readSchedule, readScheduleSteps } from '../core/planning';
import type { Schedule, ScheduleStep } from '../core/planning';
import { repeatSequence } from '../core/planningTools';
import type { ScheduleCalendar } from '../core/planningCalendar';
import { scheduleCalendarLabel } from '../i18n/formatters';
import { formatRemaining, parseDuration } from '../core/timer';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { createTimingId } from '../hooks/createTimingId';
import { textSizes, fonts as f, Palette } from '../theme';
import { Sheet } from './Sheet';
import { ScheduleStepRow } from './ScheduleStepRow';
import { ScheduleCalendarPanel } from './ScheduleCalendarPanel';
import { ScheduleRepeatPanel } from './ScheduleRepeatPanel';
import { DurationPicker } from './DurationPicker';
import { EditorBody } from './EditorBody';
import { durationMilliseconds } from '../core/durationPicker';
import type { DurationParts } from '../core/durationPicker';
import { useCrono } from '../context/CronoContext';
import type { StepDraft } from './ScheduleStepRow';

function stepDrafts(steps: ScheduleStep[]) {
  return steps.map((step): StepDraft => {
    const seconds = step.durationMs / 1000;
    return { id: step.id, name: step.name, hours: String(Math.floor(seconds / 3600)).padStart(2, '0'),
      minutes: String(Math.floor(seconds / 60) % 60).padStart(2, '0'), seconds: String(seconds % 60).padStart(2, '0') };
  });
}
function draftOf(schedule: Schedule) { return { name: schedule.name, calendar: schedule.calendar, steps: stepDrafts(schedule.steps) }; }

type ReturnTarget = { kind: 'duration'; stepId: string } | { kind: 'calendar' | 'repeat' | 'close' };

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
  const [repeatEdit, setRepeatEdit] = useState(false);
  const repeatButton = useRef<View>(null), calendarButton = useRef<View>(null), closeButton = useRef<View>(null);
  const temporaryParts = useRef<DurationParts | null>(null), moving = useRef(false);
  const list = useRef<FlatList<StepDraft>>(null), listOffset = useRef(0);
  const durationButtons = useRef(new Map<string, View>());
  const panelReturn = useRef<{ offset: number; target: ReturnTarget } | null>(null), restoring = useRef(false);
  const covered = discard || !!durationEdit || calendarEdit || repeatEdit;
  const rememberReturn = (target: ReturnTarget) => { panelReturn.current = { offset: listOffset.current, target }; };
  const restoreList = useCallback(() => {
    const pending = panelReturn.current;
    if (!restoring.current || !pending) return;
    list.current?.scrollToOffset({ offset: pending.offset, animated: false });
    const button = pending.target.kind === 'duration' ? durationButtons.current.get(pending.target.stepId)
      : pending.target.kind === 'calendar' ? calendarButton.current
        : pending.target.kind === 'repeat' ? repeatButton.current : closeButton.current;
    if (button) { button.focus(); restoring.current = false; panelReturn.current = null; }
  }, []);
  useEffect(() => { if (!covered) restoreList(); }, [covered, restoreList]);
  const closeDuration = () => {
    feedback(); restoring.current = true;
    temporaryParts.current = null; moving.current = false; setWheelBusy(false); setDurationEdit(null);
  };
  const openDuration = (step: StepDraft) => {
    rememberReturn({ kind: 'duration', stepId: step.id });
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
    restoring.current = true;
    setCalendarEdit(false);
  };
  const applyCalendar = (calendar: ScheduleCalendar | undefined) => {
    setDraft((previous) => ({ ...previous, calendar }));
    closeCalendar();
  };
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const repeatable = readScheduleSteps(draft.steps.map((step) => ({ id: step.id, name: step.name,
    durationMs: parseDuration(step.hours, step.minutes, step.seconds) ?? 0 })));
  const closeRepeat = () => { feedback(); restoring.current = true; setRepeatEdit(false); };
  const applyRepeat = (cycles: number) => {
    if (!repeatable) return;
    const repeated = repeatSequence(repeatable, cycles, Array.from({ length: repeatable.length * (cycles - 1) }, () => createTimingId()));
    if (!repeated) return;
    setDraft((previous) => ({ ...previous, steps: stepDrafts(repeated) })); closeRepeat();
  };
  const candidate = readSchedule({ id: schedule.id, name: draft.name, calendar: draft.calendar, steps: draft.steps.map((step) => ({
    id: step.id, name: step.name, durationMs: parseDuration(step.hours, step.minutes, step.seconds) ?? 0,
  })) });
  const total = candidate?.steps.reduce((sum, step) => sum + step.durationMs, 0) ?? 0;
  const stepLimit = draft.steps.length >= MAX_STEPS;
  const close = () => {
    if (durationEdit) { closeDuration(); return; }
    if (calendarEdit) { closeCalendar(); return; }
    if (repeatEdit) { closeRepeat(); return; }
    if (discard) { restoring.current = true; setDiscard(false); }
    else if (dirty) { rememberReturn({ kind: 'close' }); setDiscard(true); }
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
    : repeatEdit ? m.repeatSequence
    : discard ? m.discardTitle : isNew ? m.newSchedule : m.editScheduleTitle;
  return <Sheet visible title={title} onClose={close} scrollable={false} closeButtonRef={closeButton}>
    {discard && <ScrollView style={styles.discard} contentContainerStyle={styles.discardContent} keyboardShouldPersistTaps="handled" bounces={false}>
      <Text style={styles.help}>{m.discardHelp}</Text>
      <MotionPressable accessibilityRole="button" onPress={onClose} style={[styles.secondary]}><Text style={styles.danger}>{m.discardChanges}</Text></MotionPressable>
      <MotionPressable accessibilityRole="button" onPress={() => { restoring.current = true; setDiscard(false); }} style={[styles.primary]}><Text style={styles.primaryText}>{m.continueEditing}</Text></MotionPressable>
    </ScrollView>}
    <EditorBody hidden={covered}>
      <FlatList ref={list} data={draft.steps} onLayout={restoreList}
        onScroll={({ nativeEvent }) => { if (!covered) listOffset.current = nativeEvent.contentOffset.y; }} scrollEventThrottle={32} keyExtractor={(step) => step.id} keyboardShouldPersistTaps="handled" initialNumToRender={4} style={styles.list}
        ListHeaderComponent={<>
        <TextInput accessibilityLabel={m.scheduleName} placeholder={m.schedulePlaceholder} placeholderTextColor={c.muted} value={draft.name} maxLength={MAX_NAME_LENGTH} onChangeText={(name) => setDraft((previous) => ({ ...previous, name }))} style={styles.name} selectionColor={c.green} />
      <MotionPressable ref={calendarButton} accessibilityRole="button"
        onPress={() => { rememberReturn({ kind: 'calendar' }); feedback(); Keyboard.dismiss(); setCalendarEdit(true); }}
        style={[styles.secondary, styles.calendarButton]}>
        <Text style={styles.secondaryText}>{m.calendarSchedule} · {scheduleCalendarLabel(draft.calendar, language)}</Text>
      </MotionPressable>
      <MotionPressable ref={repeatButton} accessibilityRole="button" disabled={!repeatable}
        onPress={() => { rememberReturn({ kind: 'repeat' }); feedback(); Keyboard.dismiss(); setRepeatEdit(true); }}
        style={[styles.secondary, !repeatable && styles.disabled]}>
        <Text style={styles.secondaryText}>{m.repeatSequence}</Text>
      </MotionPressable>
      <Text style={styles.help}>{m.editorCount(draft.steps.length, MAX_STEPS)} · {candidate ? m.editorTotal(formatRemaining(total)) : m.draftInvalid}</Text>
        </>}
        renderItem={({ item, index }) => <ScheduleStepRow value={item} index={index} count={draft.steps.length}
        onChange={(changes) => setDraft((previous) => ({ ...previous, steps: previous.steps.map((step) => step.id === item.id ? { ...step, ...changes } : step) }))}
        onEditDuration={() => openDuration(item)} durationRef={(node) => {
          if (node) { durationButtons.current.set(item.id, node); restoreList(); } else durationButtons.current.delete(item.id);
        }} onMove={(direction) => move(index, direction)} onRemove={() => setDraft((previous) => ({ ...previous, steps: previous.steps.filter((step) => step.id !== item.id) }))} />}
        ListFooterComponent={<><MotionPressable accessibilityRole="button" disabled={stepLimit} onPress={() => {
          const step: StepDraft = { id: createTimingId(), name: m.stepNumber(draft.steps.length + 1), hours: '00', minutes: '05', seconds: '00' };
          setDraft((previous) => ({ ...previous, steps: [...previous.steps, step] }));
        }} style={[styles.secondary, stepLimit && styles.disabled]}><Text style={styles.secondaryText}>{m.addStep}</Text></MotionPressable>
      {saveError && <Text accessibilityLiveRegion="polite" style={styles.danger}>{m.saveScheduleError}</Text>}
      <MotionPressable accessibilityRole="button" disabled={!candidate} onPress={() => { if (candidate) { if (onSave(candidate)) onClose(); else setSaveError(true); } }} style={[styles.primary, !candidate && styles.disabled]}><Text style={styles.primaryText}>{m.saveSchedule}</Text></MotionPressable>
        </>} />
    </EditorBody>
    {durationEdit && <ScrollView style={styles.durationPanel} contentContainerStyle={styles.durationContent} keyboardShouldPersistTaps="handled" bounces={false}>
      <Text style={styles.help}>{draft.steps[selectedIndex]?.name}</Text>
      <DurationPicker value={durationEdit.parts} onChange={changeDuration} stepNumber={selectedIndex + 1} autoFocus
        onInteractionChange={(busy) => { moving.current = busy; setWheelBusy(busy); }} />
      <Text style={styles.help}>{durationMilliseconds(durationEdit.parts) === null ? m.durationInvalid : m.durationWheelHint}</Text>
      <MotionPressable accessibilityRole="button" disabled={wheelBusy || selectedIndex < 0 || durationMilliseconds(durationEdit.parts) === null}
        onPress={applyDuration} style={[styles.primary, (wheelBusy || selectedIndex < 0 || durationMilliseconds(durationEdit.parts) === null) && styles.disabled]}>
        <Text style={styles.primaryText}>{m.applyDuration}</Text>
      </MotionPressable>
      <MotionPressable accessibilityRole="button" onPress={closeDuration} style={[styles.secondary]}>
        <Text style={styles.secondaryText}>{m.cancel}</Text>
      </MotionPressable>
    </ScrollView>}
    {repeatEdit && repeatable && <ScrollView style={styles.calendarPanel} contentContainerStyle={styles.calendarContent}
      keyboardShouldPersistTaps="handled" bounces={false}>
      <ScheduleRepeatPanel steps={repeatable} onApply={applyRepeat} onCancel={closeRepeat} />
    </ScrollView>}
    {calendarEdit && <ScrollView style={styles.calendarPanel} contentContainerStyle={styles.calendarContent}
      keyboardShouldPersistTaps="handled" bounces={false}>
      <ScheduleCalendarPanel initialCalendar={draft.calendar} onApply={applyCalendar} onCancel={closeCalendar} />
    </ScrollView>}
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  durationPanel: { position: 'absolute', top: 0, bottom: 0, left: 26, right: 26, zIndex: 1, backgroundColor: c.background },
  durationContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 16 },
  calendarPanel: { position: 'absolute', top: 0, bottom: 0, left: 26, right: 26, zIndex: 1, backgroundColor: c.background },
  calendarContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  calendarButton: { marginTop: 8, marginBottom: 12, alignItems: 'flex-start' },
  name: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, fontFamily: f.semibold, color: c.ink, fontSize: textSizes.input, backgroundColor: c.surface },
  help: { fontFamily: f.regular, fontSize: textSizes.small, lineHeight: 21, color: c.muted, marginVertical: 12 },
  list: { flex: 1 },
  primary: { minHeight: 48, paddingHorizontal: 14, backgroundColor: c.action, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primaryText: { fontFamily: f.semibold, fontSize: textSizes.body, color: c.actionText },
  secondary: { minHeight: 46, borderRadius: 12, padding: 12, backgroundColor: c.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  secondaryText: { fontFamily: f.medium, fontSize: textSizes.caption, color: c.ink },
  disabled: { opacity: 0.4 }, danger: { fontFamily: f.medium, fontSize: textSizes.caption, color: c.danger },
  discard: { position: 'absolute', top: 0, bottom: 0, left: 26, right: 26, zIndex: 1, backgroundColor: c.background },
  discardContent: { gap: 12, paddingBottom: 12 },
});
