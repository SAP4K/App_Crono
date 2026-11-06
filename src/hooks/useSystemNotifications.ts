import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createNotificationCoordinator } from './notificationCoordinator';
import type { NotificationState } from './notificationCoordinator';
import type { NativeNotificationResponse } from './notificationTypes';
import { systemNotifications } from './systemNotifications';
import { createTimingId } from './createTimingId';
import { isAppActive, subscribeAppActivity } from './appActivity';
import type { useStopwatch } from './useStopwatch';

type Store = Pick<ReturnType<typeof useStopwatch>, 'getSnapshot' | 'subscribeUpdates' | 'getHydrationStatus' | 'hydrationStatus'>;

export function useSystemNotifications({ getSnapshot, subscribeUpdates, getHydrationStatus, hydrationStatus }: Store) {
  const [reported, setReported] = useState<NotificationState | null>(null);
  const [response, setResponse] = useState<NativeNotificationResponse | null>(null);
  const observed = useRef(getSnapshot());
  const controller = useMemo(() => createNotificationCoordinator({
    getSnapshot, getHydration: getHydrationStatus, native: systemNotifications, now: Date.now,
    createId: createTimingId, changed: setReported,
    warn: (operation) => console.warn(`[notifications] ${operation} failed.`),
  }), [getSnapshot, getHydrationStatus]);

  useEffect(() => {
    controller.activate();
    let mounted = true, responseGeneration = 0;
    const unsubscribe = subscribeUpdates(() => {
      const previous = observed.current, current = getSnapshot(); observed.current = current;
      const before = previous.preferences, after = current.preferences;
      if (previous.timer === current.timer && previous.planning.run === current.planning.run
        && before.systemNotifications === after.systemNotifications && before.language === after.language
        && before.timerSound === after.timerSound && before.alertSoundId === after.alertSoundId) return;
      void controller.reconcile();
    });
    const stopActivity = subscribeAppActivity(() => { if (isAppActive()) void controller.reconcile(true); });
    const stopNative = systemNotifications.listen(controller.received, (value) => {
      responseGeneration++;
      if (mounted) setResponse(value);
    });
    const initialTicket = responseGeneration;
    void systemNotifications.lastResponse().then((value) => {
      if (mounted && responseGeneration === initialTicket && value) setResponse(value);
    }).catch(() => console.warn('[notifications] Initial response unavailable.'));
    return () => { mounted = false; unsubscribe(); stopActivity(); stopNative(); controller.dispose(); };
  }, [controller, getSnapshot, subscribeUpdates]);

  useEffect(() => {
    observed.current = getSnapshot();
    void controller.reconcile(true);
  }, [controller, getSnapshot, hydrationStatus]);

  const consumeResponse = useCallback((identifier: string) => {
    setResponse((current) => current?.identifier === identifier ? null : current);
    void systemNotifications.lastResponse().then((last) => {
      if (last?.identifier === identifier) return systemNotifications.clearResponse();
    }).catch(() => console.warn('[notifications] Response cleanup failed.'));
  }, []);
  const openSettings = useCallback((exact = false) => {
    void systemNotifications.openSettings(exact).catch(() => {
      console.warn('[notifications] Settings could not open.');
      setReported({ ...controller.getState(), status: 'failed' });
    });
  }, [controller]);

  return { state: reported ?? controller.getState(), controller, response, consumeResponse, openSettings,
    supported: systemNotifications.supported, exactAlarmSettings: systemNotifications.exactAlarmSettings };
}
