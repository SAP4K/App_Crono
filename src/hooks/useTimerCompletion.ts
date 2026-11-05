import { useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { createTimerCoordinator, TimerAudio } from './timerCompletion';
import type { AppData } from '../core/stopwatch';
import type { useStopwatch } from './useStopwatch';

type Store = Pick<ReturnType<typeof useStopwatch>, 'getSnapshot' | 'update' | 'ready'>;
let runCounter = 0;
function createId() {
  return `${Date.now()}-${++runCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

function isActive() {
  return Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active';
}

export function useTimerCompletion({ getSnapshot, update, ready }: Store, data: AppData, audio: TimerAudio, notify: (message: string) => void) {
  const coordinator = useMemo(() => createTimerCoordinator({
    getSnapshot, update, ...audio, notify, isActive, now: Date.now,
    createId,
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: clearTimeout,
  }), [getSnapshot, update, audio, notify]);

  useEffect(() => {
    if (!ready) return;
    coordinator.activate();
    coordinator.reconcile('hydrate');
    const changed = () => coordinator.reconcile('foreground');
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', changed);
      return () => { document.removeEventListener('visibilitychange', changed); coordinator.dispose(); };
    }
    const subscription = AppState.addEventListener('change', changed);
    return () => { subscription.remove(); coordinator.dispose(); };
  }, [coordinator, ready]);

  useEffect(() => {
    if (ready) coordinator.reconcile();
  }, [coordinator, ready, data.timer, data.preferences.timerSound]);

  return coordinator;
}
