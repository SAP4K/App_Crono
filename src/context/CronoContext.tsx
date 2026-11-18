import type { AppData } from '../core/stopwatch';
import type { ToastNotice, TimerNotice } from '../core/notices';
import { getMessages } from '../i18n';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useStopwatch } from '../hooks/useStopwatch';
import { useTimerCompletion } from '../hooks/useTimerCompletion';
import type { TimerAudio, TimerControls } from '../hooks/timerCompletion';
import { useAlertPlayback } from '../hooks/useAlertPlayback';
import { usePlanningRunner } from '../hooks/usePlanningRunner';
import { useSystemNotifications } from '../hooks/useSystemNotifications';

type CronoValue = ReturnType<typeof useStopwatch> & {
  feedback: () => void;
  notice: ToastNotice | null;
  notify: (message: ToastNotice) => void;
  timerControls: TimerControls;
  alerts: ReturnType<typeof useAlertPlayback>;
  planning: ReturnType<typeof usePlanningRunner>;
  notifications: ReturnType<typeof useSystemNotifications>;
};

const CronoContext = createContext<CronoValue | null>(null);
type Actions = Pick<CronoValue, 'update' | 'getSnapshot' | 'feedback' | 'notify' | 'timerControls'> & {
  planning: Pick<CronoValue['planning'], 'controls'>;
  notifications: Pick<CronoValue['notifications'], 'controller'>;
};
type Status = Pick<CronoValue, 'ready' | 'hydrationStatus' | 'storageError' | 'dismissStorageError' | 'notice'>;
const ActionsContext = createContext<Actions | null>(null);
const StatusContext = createContext<Status | null>(null);
const StoreContext = createContext<Pick<CronoValue, 'getSnapshot' | 'subscribeUpdates'> | null>(null);

function required<T>(value: T | null): T {
  if (!value) throw new Error('CRONO hooks must be used inside CronoProvider');
  return value;
}
export function useCronoActions() { return required(useContext(ActionsContext)); }
export function useCronoStatus() { return required(useContext(StatusContext)); }
/** Read immutable branches from the existing accepted store, never a second store. */
export function useCronoData<K extends keyof AppData>(key: K): AppData[K] {
  const store = required(useContext(StoreContext));
  const snapshot = useCallback(() => store.getSnapshot()[key], [store, key]);
  return useSyncExternalStore(store.subscribeUpdates, snapshot, snapshot);
}

function AwakeGuard() {
  useKeepAwake('crono-active-session', { suppressDeactivateWarnings: true });
  return null;
}

export function CronoProvider({ children }: PropsWithChildren) {
  const stopwatch = useStopwatch();
  const alerts = useAlertPlayback(stopwatch);
  const { controller } = alerts;
  const { getSnapshot } = stopwatch;
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const feedback = useCallback(() => {
    if (stopwatch.data.preferences.haptics && Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, [stopwatch.data.preferences.haptics]);
  const notify = useCallback((message: ToastNotice) => setNotice(message), []);
  const notifyTimer = useCallback((message: TimerNotice) => {
    const m = getMessages(getSnapshot().preferences.language);
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message === 'timer-complete' ? m.timerComplete : `${m.timerComplete} ${m.soundUnavailable}`);
  }, [getSnapshot]);
  const audio = useMemo<TimerAudio>(() => ({
    play: async (allowed, event) => {
      if (!event) return;
      const { preferences } = getSnapshot();
      controller.request({ owner: 'timer', kind: 'timer-complete', eventId: `timer:${event.runId}`, runId: event.runId, dueAt: event.dueAt,
        soundId: preferences.alertSoundId, durationSeconds: preferences.alertDurationSeconds, allowed });
    },
    stop: () => controller.cancelOwner('timer'),
    suspend: () => controller.suspendOwner ? controller.suspendOwner('timer') : controller.cancelOwner('timer'),
  }), [controller, getSnapshot]);
  const timerControls = useTimerCompletion(stopwatch, stopwatch.data, audio, notifyTimer);
  const planning = usePlanningRunner(stopwatch, stopwatch.data, controller);
  const notifications = useSystemNotifications(stopwatch);
  useEffect(() => {
    if (alerts.state.error && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(getMessages(getSnapshot().preferences.language).soundUnavailable);
  }, [alerts.state.error, getSnapshot]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const actions = useMemo<Actions>(() => ({ update: stopwatch.update, getSnapshot, feedback, notify, timerControls,
    planning: { controls: planning.controls }, notifications: { controller: notifications.controller } }),
  [stopwatch.update, getSnapshot, feedback, notify, timerControls, planning.controls, notifications.controller]);
  const status = useMemo<Status>(() => ({ ready: stopwatch.ready, hydrationStatus: stopwatch.hydrationStatus,
    storageError: stopwatch.storageError, dismissStorageError: stopwatch.dismissStorageError, notice }),
  [stopwatch.ready, stopwatch.hydrationStatus, stopwatch.storageError, stopwatch.dismissStorageError, notice]);
  // Hydration is not an accepted edit; changing this port once lets early readers refresh.
  const store = useMemo(() => ({ getSnapshot, subscribeUpdates: stopwatch.subscribeUpdates, hydrationStatus: stopwatch.hydrationStatus }),
    [getSnapshot, stopwatch.subscribeUpdates, stopwatch.hydrationStatus]);
  return <StoreContext.Provider value={store}><ActionsContext.Provider value={actions}><StatusContext.Provider value={status}>
  <CronoContext.Provider value={{ ...stopwatch, feedback, notice, notify, timerControls, alerts, planning, notifications }}>
    {(stopwatch.data.stopwatch.startedAt !== null || stopwatch.data.timer.status === 'running' || stopwatch.data.planning.run?.status === 'running') && stopwatch.data.preferences.keepAwake && Platform.OS !== 'web' && <AwakeGuard />}
    {children}
  </CronoContext.Provider></StatusContext.Provider></ActionsContext.Provider></StoreContext.Provider>;
}

export function useCrono() {
  const value = useContext(CronoContext);
  if (!value) throw new Error('useCrono must be used inside CronoProvider');
  return value;
}
