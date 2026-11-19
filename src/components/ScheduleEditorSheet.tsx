import { MotionPressable } from './MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_NAME_LENGTH, MAX_STEPS, readSchedule, readScheduleSteps } from '../core/planning';
import type { Schedule, ScheduleStep } from '../core/planning';
import { repeatSequence } from '../core/planningTools';
import type { ScheduleCalendar } from '../core/planningCalendar';
import { scheduleCalendarLabel } from '../i18n/formatters';
import { formatRemaining, parseDuration } from '../core/timer';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { createTimingId } from '../hooks/createTimingId';
import { textSizes, radii, fonts as f, Palette } from '../theme';
import { Sheet } from './Sheet';
import { ScheduleStepRow } from './ScheduleStepRow';
import { ScheduleCalendarPanel } from './ScheduleCalendarPanel';
import { ScheduleRepeatPanel } from './ScheduleRepeatPanel';
import { DurationPicker } from './DurationPicker';
import { EditorBody } from './EditorBody';
import { durationMilliseconds } from '../core/durationPicker';
import type { DurationParts } from '../core/durationPicker';
import { useCronoActions } from '../context/CronoContext';
import type { StepDraft } from './ScheduleStepRow';
import { PanelTransition } from './PanelTransition';

function stepDrafts(steps: ScheduleStep[]) {
  return steps.map((step): StepDraft => {
    const seconds = step.durationMs / 1000;
    return { id: step.id, name: step.name, hours: String(Math.floor(seconds / 3600)).padStart(2, '0'),
      minutes: String(Math.floor(seconds / 60) % 60).padStart(2, '0'), seconds: String(seconds % 60).padStart(2, '0') };
  });
}
function draftOf(schedule: Schedule) { return { name: schedule.name, calendar: schedule.calendar, steps: stepDrafts(schedule.steps) }; }

type ReturnTarget = { kind: 'duration'; stepId: string } | { kind: 'calendar' | 'repeat' | 'close' };

export function ScheduleEditorSheet({ schedule, isNew, visible = true, onClose, onSave, onAfterClose }: {
  schedule: Schedule; isNew: boolean; visible?: boolean; onClose: () => void; onSave: (schedule: Schedule) => boolean; onAfterClose?: () => void;
}) {
  const { language, messages: m } = useI18n();
  const { colors: c } = useTheme(); const styles = useThemeStyles(createStyles);
  const [initial] = useState(() => draftOf(schedule)); const [draft, setDraft] = useState(initial);
  const [discard, setDiscard] = useState(false); const [saveError, setSaveError] = useState(false);
  const { feedback } = useCronoActions();
  const [durationEdit, setDurationEdit] = useState<{ stepId: string; parts: DurationParts } | null>(null);
  const [wheelBusy, setWheelBusy] = useState(false);
  const [calendarEdit, setCalendarEdit] = useState(false);
  const [repeatEdit, setRepeatEdit] = useState(false);
  const [readyPanel, setReadyPanel] = useState<string | null>(null);
  const repeatButton = useRef<View>(null), calendarButton = useRef<View>(null), closeButton = useRef<View>(null);
  const temporaryParts = useRef<DurationParts | null>(null), moving = useRef(false);
  const list = useRef<FlatList<StepDraft>>(null), listOffset = useRef(0);
  const durationButtons = useRef(new Map<string, View>());
  const panelReturn = useRef<{ offset: number; target: ReturnTarget } | null>(null), restoring = useRef(false);
  const editorReady = useRef(false);
  const covered = discard || !!durationEdit || calendarEdit || repeatEdit;
  const rememberReturn = useCallback((target: ReturnTarget) => { panelReturn.current = { offset: listOffset.current, target }; }, []);
  const restoreList = useCallback(() => {
    const pending = panelReturn.current;
    if (!restoring.current || !pending) return;
    list.current?.scrollToOffset({ offset: pending.offset, animated: false });
    if (!editorReady.current) return;
    const button = pending.target.kind === 'duration' ? durationButtons.current.get(pending.target.stepId)
      : pending.target.kind === 'calendar' ? calendarButton.current
        : pending.target.kind === 'repeat' ? repeatButton.current : closeButton.current;
    if (button) {
      if (Platform.OS === 'web') (button as unknown as HTMLElement).focus({ preventScroll: true });
      else button.focus();
      restoring.current = false; panelReturn.current = null;
    }
  }, []);
  useEffect(() => { if (!covered) restoreList(); }, [covered, restoreList]);
  const closeDuration = () => {
    feedback(); restoring.current = true;
    temporaryParts.current = null; moving.current = false; setWheelBusy(false); setDurationEdit(null);
  };
  const openDuration = useCallback((step: StepDraft) => {
    rememberReturn({ kind: 'duration', stepId: step.id });
    feedback(); Keyboard.dismiss();
    const parts = { hours: Number(step.hours), minutes: Number(step.minutes), seconds: Number(step.seconds) };
    temporaryParts.current = parts; moving.current = false; setWheelBusy(false); setDurationEdit({ stepId: step.id, parts });
  }, [feedback, rememberReturn]);
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
  const initialSerialized = useMemo(() => JSON.stringify(initial), [initial]);
  const dirty = useMemo(() => initialSerialized !== JSON.stringify(draft), [initialSerialized, draft]);
  const parsedSteps = useMemo(() => draft.steps.map((step) => ({ id: step.id, name: step.name,
    durationMs: parseDuration(step.hours, step.minutes, step.seconds) ?? 0 })), [draft.steps]);
  const repeatable = useMemo(() => readScheduleSteps(parsedSteps), [parsedSteps]);
  const closeRepeat = () => { feedback(); restoring.current = true; setRepeatEdit(false); };
  const applyRepeat = (cycles: number) => {
    if (!repeatable) return;
    const repeated = repeatSequence(repeatable, cycles, Array.from({ length: repeatable.length * (cycles - 1) }, () => createTimingId()));
    if (!repeated) return;
    setDraft((previous) => ({ ...previous, steps: stepDrafts(repeated) })); closeRepeat();
  };
  const candidate = useMemo(() => readSchedule({ id: schedule.id, name: draft.name, calendar: draft.calendar, steps: parsedSteps }),
    [schedule.id, draft.name, draft.calendar, parsedSteps]);
  const total = useMemo(() => candidate?.steps.reduce((sum, step) => sum + step.durationMs, 0) ?? 0, [candidate]);
  const stepLimit = draft.steps.length >= MAX_STEPS;
  const close = () => {
    if (durationEdit) { closeDuration(); return; }
    if (calendarEdit) { closeCalendar(); return; }
    if (repeatEdit) { closeRepeat(); return; }
    if (discard) { restoring.current = true; setDiscard(false); }
    else if (dirty) { rememberReturn({ kind: 'close' }); setDiscard(true); }
    else onClose();
  };
  const move = useCallback((id: string, direction: number) => setDraft((previous) => {
    const index = previous.steps.findIndex((step) => step.id === id);
    if (index < 0) return previous;
    const next = index + direction;
    if (next < 0 || next >= previous.steps.length) return previous;
    const steps = [...previous.steps]; [steps[index], steps[next]] = [steps[next], steps[index]];
    return { ...previous, steps };
  }), []);
  const changeStep = useCallback((id: string, changes: Partial<StepDraft>) => setDraft((previous) => ({
    ...previous, steps: previous.steps.map((step) => step.id === id ? { ...step, ...changes } : step),
  })), []);
  const removeStep = useCallback((id: string) => setDraft((previous) => ({ ...previous, steps: previous.steps.filter((step) => step.id !== id) })), []);
  const registerDuration = useCallback((id: string, node: View | null) => {
    if (node) { durationButtons.current.set(id, node); restoreList(); } else durationButtons.current.delete(id);
  }, [restoreList]);
  const renderStep = useCallback(({ item, index }: { item: StepDraft; index: number }) =>
    <ScheduleStepRow value={item} index={index} count={draft.steps.length} onChange={changeStep}
      onEditDuration={openDuration} durationRef={registerDuration} onMove={move} onRemove={removeStep} />,
  [draft.steps.length, changeStep, openDuration, registerDuration, move, removeStep]);
  const selectedIndex = durationEdit ? draft.steps.findIndex((step) => step.id === durationEdit.stepId) : -1;
  const durationValid = durationEdit !== null && durationMilliseconds(durationEdit.parts) !== null;
  const applyDisabled = wheelBusy || selectedIndex < 0 || !durationValid;
  const title = durationEdit ? m.durationPickerTitle(selectedIndex + 1)
    : calendarEdit ? m.calendarSchedule
    : repeatEdit ? m.repeatSequence
    : discard ? m.discardTitle : isNew ? m.newSchedule : m.editScheduleTitle;
  return <Sheet visible={visible} title={title} onClose={close} onAfterClose={onAfterClose} scrollable={false} closeButtonRef={closeButton}>
    {discard && <ScrollView style={styles.discard} contentContainerStyle={styles.discardContent} keyboardShouldPersistTaps="handled" bounces={false}>
      <PanelTransition identity="discard" active={visible}>
      <Text style={styles.help}>{m.discardHelp}</Text>
      <MotionPressable accessibilityRole="button" onPress={onClose} style={[styles.secondary]}><Text style={styles.danger}>{m.discardChanges}</Text></MotionPressable>
      <MotionPressable accessibilityRole="button" onPress={() => { restoring.current = true; setDiscard(false); }} style={[styles.primary]}><Text style={styles.primaryText}>{m.continueEditing}</Text></MotionPressable>
      </PanelTransition>
    </ScrollView>}
    <EditorBody hidden={covered}>
      <PanelTransition identity="editor" active={!covered && visible} style={styles.editorFrame}
        onPending={() => { editorReady.current = false; }} onReady={() => { editorReady.current = true; restoreList(); }}>
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
        renderItem={renderStep}
        ListFooterComponent={<><MotionPressable accessibilityRole="button" disabled={stepLimit} onPress={() => {
          const step: StepDraft = { id: createTimingId(), name: m.stepNumber(draft.steps.length + 1), hours: '00', minutes: '05', seconds: '00' };
          setDraft((previous) => ({ ...previous, steps: [...previous.steps, step] }));
        }} style={[styles.secondary, stepLimit && styles.disabled]}><Text style={styles.secondaryText}>{m.addStep}</Text></MotionPressable>
      {saveError && <Text accessibilityLiveRegion="polite" style={styles.danger}>{m.saveScheduleError}</Text>}
      <MotionPressable accessibilityRole="button" disabled={!candidate} onPress={() => { if (candidate) { if (onSave(candidate)) onClose(); else setSaveError(true); } }} style={[styles.primary, !candidate && styles.disabled]}><Text style={styles.primaryText}>{m.saveSchedule}</Text></MotionPressable>
        </>} />
      </PanelTransition>
    </EditorBody>
    {durationEdit && <ScrollView style={styles.durationPanel} contentContainerStyle={styles.durationContent} keyboardShouldPersistTaps="handled" bounces={false}>
      <PanelTransition identity={`duration:${durationEdit.stepId}`} active={visible}
        onPending={() => setReadyPanel(null)} onReady={() => setReadyPanel(`duration:${durationEdit.stepId}`)}>
      <Text style={styles.help}>{draft.steps[selectedIndex]?.name}</Text>
      <DurationPicker value={durationEdit.parts} onChange={changeDuration} stepNumber={selectedIndex + 1}
        autoFocus={readyPanel === `duration:${durationEdit.stepId}`} disabled={!visible}
        onInteractionChange={(busy) => { moving.current = busy; setWheelBusy(busy); }} />
      <Text style={styles.help}>{durationValid ? m.durationWheelHint : m.durationInvalid}</Text>
      <View style={styles.durationActions}>
        <MotionPressable accessibilityRole="button" disabled={applyDisabled}
          onPress={applyDuration} style={[styles.primary, applyDisabled && styles.disabled]}>
          <Text style={styles.primaryText}>{m.applyDuration}</Text>
        </MotionPressable>
        <MotionPressable accessibilityRole="button" onPress={closeDuration} style={styles.secondary}>
          <Text style={styles.secondaryText}>{m.cancel}</Text>
        </MotionPressable>
      </View>
      </PanelTransition>
    </ScrollView>}
    {repeatEdit && repeatable && <ScrollView style={styles.calendarPanel} contentContainerStyle={styles.calendarContent}
      keyboardShouldPersistTaps="handled" bounces={false}>
      <PanelTransition identity="repeat" active={visible}>
      <ScheduleRepeatPanel steps={repeatable} onApply={applyRepeat} onCancel={closeRepeat} />
      </PanelTransition>
    </ScrollView>}
    {calendarEdit && <ScrollView style={styles.calendarPanel} contentContainerStyle={styles.calendarContent}
      keyboardShouldPersistTaps="handled" bounces={false}>
      <PanelTransition identity="calendar" active={visible} onPending={() => setReadyPanel(null)} onReady={() => setReadyPanel('calendar')}>
      <ScheduleCalendarPanel initialCalendar={draft.calendar} onApply={applyCalendar} onCancel={closeCalendar} autoFocus={readyPanel === 'calendar'} />
      </PanelTransition>
    </ScrollView>}
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  durationPanel: { position: 'absolute', top: 0, bottom: 0, left: 24, right: 24, zIndex: 1, backgroundColor: c.background },
  durationContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 16 },
  durationActions: { gap: 12 },
  calendarPanel: { position: 'absolute', top: 0, bottom: 0, left: 24, right: 24, zIndex: 1, backgroundColor: c.background },
  calendarContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  calendarButton: { marginTop: 8, marginBottom: 12, alignItems: 'flex-start' },
  name: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: radii.control, paddingHorizontal: 12, fontFamily: f.semibold, color: c.ink, fontSize: textSizes.input, backgroundColor: c.background },
  help: { fontFamily: f.regular, fontSize: textSizes.small, lineHeight: 21, color: c.muted, marginVertical: 12 },
  list: { flex: 1 },
  editorFrame: { flex: 1, minHeight: 0 },
  primary: { minHeight: 54, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: c.action, borderRadius: radii.control, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primaryText: { fontFamily: f.semibold, fontSize: textSizes.body, color: c.actionText },
  secondary: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: radii.control, padding: 12, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  secondaryText: { fontFamily: f.medium, fontSize: textSizes.caption, color: c.ink },
  disabled: { opacity: 0.4 }, danger: { fontFamily: f.medium, fontSize: textSizes.caption, color: c.danger },
  discard: { position: 'absolute', top: 0, bottom: 0, left: 24, right: 24, zIndex: 1, backgroundColor: c.background },
  discardContent: { gap: 12, paddingBottom: 12 },
});
