import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import type { ScheduleBoundary } from '../core/planning';
import type { AppData } from '../core/stopwatch';
import type { AlertPlayback } from './alertPlayback';
import type { useStopwatch } from './useStopwatch';
import { createPlanningRunner } from './planningRunner';
import { isAppActive, subscribeAppActivity } from './appActivity';

let runCounter = 0;
function createRunId() {
  return `${Date.now()}-${++runCounter}-${Math.random().toString(36).slice(2, 9)}`;
}
type Store = Pick<ReturnType<typeof useStopwatch>, 'getSnapshot' | 'update' | 'ready'>;

export function usePlanningRunner({ getSnapshot, update, ready }: Store, data: AppData, alerts: AlertPlayback) {
  const [boundary, setBoundary] = useState<ScheduleBoundary | null>(null);
  const notify = useCallback((event: ScheduleBoundary) => {
    setBoundary(event);
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(event.kind === 'schedule-complete' ? 'Orarul s-a încheiat.' : `Etapă încheiată: ${event.stepName}.`);
  }, []);
  const controls = useMemo(() => createPlanningRunner({ getSnapshot, update, alerts, notify, isActive: isAppActive,
    now: Date.now, createId: createRunId,
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: (handle) => clearTimeout(handle),
  }), [getSnapshot, update, alerts, notify]);
  useEffect(() => {
    if (!ready) return;
    controls.activate(); controls.reconcile('hydrate');
    const unsubscribe = subscribeAppActivity(() => controls.reconcile('foreground'));
    return () => { unsubscribe(); controls.dispose(); };
  }, [controls, ready]);
  useEffect(() => { if (ready) controls.reconcile(); }, [controls, ready, data.planning.run, data.preferences.timerSound]);
  useEffect(() => {
    if (!boundary) return;
    const timeout = setTimeout(() => setBoundary(null), 3500);
    return () => clearTimeout(timeout);
  }, [boundary]);
  return { controls, boundary };
}
