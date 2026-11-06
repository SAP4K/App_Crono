import type { ToastNotice, TimerNotice } from '../core/notices';
import { getMessages } from '../i18n';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useStopwatch } from '../hooks/useStopwatch';
import { useTimerCompletion } from '../hooks/useTimerCompletion';
import type { TimerAudio, TimerControls } from '../hooks/timerCompletion';
import { useAlertPlayback } from '../hooks/useAlertPlayback';
import { usePlanningRunner } from '../hooks/usePlanningRunner';

type CronoValue = ReturnType<typeof useStopwatch> & {
  feedback: () => void;
  notice: ToastNotice | null;
  notify: (message: ToastNotice) => void;
  timerControls: TimerControls;
  alerts: ReturnType<typeof useAlertPlayback>;
  planning: ReturnType<typeof usePlanningRunner>;
};

const CronoContext = createContext<CronoValue | null>(null);

function AwakeGuard() {
  useKeepAwake('crono-active-session', { suppressDeactivateWarnings: true });
  return null;
}

export function CronoProvider({ children }: PropsWithChildren) {
  const stopwatch = useStopwatch();
  const alerts = useAlertPlayback(stopwatch.data.preferences);
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
      controller.request({ owner: 'timer', kind: 'timer-complete', eventId: `timer:${event.runId}`, dueAt: event.dueAt,
        soundId: preferences.alertSoundId, durationSeconds: preferences.alertDurationSeconds, allowed });
    },
    stop: () => controller.cancelOwner('timer'),
  }), [controller, getSnapshot]);
  const timerControls = useTimerCompletion(stopwatch, stopwatch.data, audio, notifyTimer);
  const planning = usePlanningRunner(stopwatch, stopwatch.data, controller);
  useEffect(() => {
    if (alerts.state.error && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(getMessages(getSnapshot().preferences.language).soundUnavailable);
  }, [alerts.state.error, getSnapshot]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  return <CronoContext.Provider value={{ ...stopwatch, feedback, notice, notify, timerControls, alerts, planning }}>
    {(stopwatch.data.stopwatch.startedAt !== null || stopwatch.data.timer.status === 'running' || stopwatch.data.planning.run?.status === 'running') && stopwatch.data.preferences.keepAwake && Platform.OS !== 'web' && <AwakeGuard />}
    {children}
  </CronoContext.Provider>;
}

export function useCrono() {
  const value = useContext(CronoContext);
  if (!value) throw new Error('useCrono must be used inside CronoProvider');
  return value;
}
