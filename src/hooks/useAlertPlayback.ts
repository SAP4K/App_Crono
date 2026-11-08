import { useCallback, useEffect, useMemo, useState } from 'react';
import type { useStopwatch } from './useStopwatch';
import { createAlertPlayback, idleAlert } from './alertPlayback';
import type { AlertPlayback } from './alertPlayback';
import { isAppActive, subscribeAppActivity } from './appActivity';
import { useAlertSound } from './useAlertSound';
import { completionAlerts } from './completionAlerts';
import { createNativeAlertPlayback } from './nativeAlertPlayback';

let previewCounter = 0;

type Store = Pick<ReturnType<typeof useStopwatch>, 'data' | 'getSnapshot' | 'getHydrationStatus' | 'subscribeUpdates' | 'hydrationStatus'>;
export function useAlertPlayback({ data, getSnapshot, getHydrationStatus, subscribeUpdates, hydrationStatus }: Store) {
  const preferences = data.preferences;
  const transport = useAlertSound(!completionAlerts);
  const [state, setState] = useState(idleAlert);
  const controller = useMemo<AlertPlayback & { syncPolicy?: () => Promise<void>; refresh?: () => Promise<void> }>(() => completionAlerts ? createNativeAlertPlayback({ native: completionAlerts,
    getSnapshot, getHydration: getHydrationStatus, isActive: isAppActive, changed: setState,
    warn: () => console.warn('[audio] Native playback unavailable.'),
  }) : createAlertPlayback({ transport, isActive: isAppActive,
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: (handle) => clearTimeout(handle), changed: setState,
    warn: () => console.warn('[audio] Sound playback unavailable.'),
  }), [transport, getSnapshot, getHydrationStatus]);
  useEffect(() => {
    controller.activate();
    const updates = subscribeUpdates(() => { if (controller.syncPolicy) void controller.syncPolicy(); });
    const unsubscribe = subscribeAppActivity(() => {
      if (controller.syncPolicy) {
        if (isAppActive()) { void controller.refresh?.(); void controller.syncPolicy(); }
        else controller.suspendOwner?.('preview');
      } else if (!isAppActive()) controller.stop();
    });
    return () => { updates(); unsubscribe(); controller.dispose(); };
  }, [controller, subscribeUpdates]);
  useEffect(() => {
    if (controller.syncPolicy) void controller.syncPolicy();
    else controller.stop();
  }, [controller, preferences.alertSoundId, preferences.alertDurationSeconds, preferences.timerSound, hydrationStatus]);
  const preview = useCallback(() => {
    return controller.request({ owner: 'preview', eventId: `preview:${++previewCounter}`, kind: 'preview', dueAt: Date.now(),
      soundId: preferences.alertSoundId, durationSeconds: preferences.alertDurationSeconds, allowed: isAppActive });
  }, [controller, preferences.alertSoundId, preferences.alertDurationSeconds]);
  return { controller, state, preview };
}
