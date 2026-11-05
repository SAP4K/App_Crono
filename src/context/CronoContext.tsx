import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useStopwatch } from '../hooks/useStopwatch';
import { useTimerCompletion } from '../hooks/useTimerCompletion';
import type { TimerControls } from '../hooks/timerCompletion';
import { useTimerSound } from '../hooks/useTimerSound';

type CronoValue = ReturnType<typeof useStopwatch> & {
  feedback: () => void;
  notice: string | null;
  notify: (message: string) => void;
  timerControls: TimerControls;
};

const CronoContext = createContext<CronoValue | null>(null);

function AwakeGuard() {
  useKeepAwake('crono-active-session', { suppressDeactivateWarnings: true });
  return null;
}

export function CronoProvider({ children }: PropsWithChildren) {
  const stopwatch = useStopwatch();
  const [notice, setNotice] = useState<string | null>(null);
  const feedback = useCallback(() => {
    if (stopwatch.data.preferences.haptics && Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, [stopwatch.data.preferences.haptics]);
  const notify = useCallback((message: string) => setNotice(message), []);
  const notifyTimer = useCallback((message: string) => {
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
    setNotice((previous) => {
      if (message !== 'Timpul a expirat.') return message;
      return previous?.startsWith('Timpul a expirat.') ? null : previous;
    });
  }, []);
  const audio = useTimerSound(notifyTimer);
  const timerControls = useTimerCompletion(stopwatch, stopwatch.data, audio, notifyTimer);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  return <CronoContext.Provider value={{ ...stopwatch, feedback, notice, notify, timerControls }}>
    {(stopwatch.data.stopwatch.startedAt !== null || stopwatch.data.timer.status === 'running') && stopwatch.data.preferences.keepAwake && Platform.OS !== 'web' && <AwakeGuard />}
    {children}
  </CronoContext.Provider>;
}

export function useCrono() {
  const value = useContext(CronoContext);
  if (!value) throw new Error('useCrono must be used inside CronoProvider');
  return value;
}
