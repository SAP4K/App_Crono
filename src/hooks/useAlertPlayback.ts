import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Preferences } from '../core/stopwatch';
import { createAlertPlayback, idleAlert } from './alertPlayback';
import { isAppActive, subscribeAppActivity } from './appActivity';
import { useAlertSound } from './useAlertSound';

let previewCounter = 0;

export function useAlertPlayback(preferences: Preferences) {
  const transport = useAlertSound();
  const [state, setState] = useState(idleAlert);
  const controller = useMemo(() => createAlertPlayback({ transport, isActive: isAppActive,
    schedule: (callback, delay) => setTimeout(callback, delay), cancel: clearTimeout, changed: setState,
    warn: () => console.warn('[audio] Sound playback unavailable.'),
  }), [transport]);
  useEffect(() => {
    controller.activate();
    const unsubscribe = subscribeAppActivity(() => { if (!isAppActive()) controller.stop(); });
    return () => { unsubscribe(); controller.dispose(); };
  }, [controller]);
  useEffect(() => { controller.stop(); }, [controller, preferences.alertSoundId, preferences.alertDurationSeconds, preferences.timerSound]);
  const preview = useCallback(() => {
    return controller.request({ owner: 'preview', eventId: `preview:${++previewCounter}`, kind: 'preview', dueAt: Date.now(),
      soundId: preferences.alertSoundId, durationSeconds: preferences.alertDurationSeconds, allowed: isAppActive });
  }, [controller, preferences.alertSoundId, preferences.alertDurationSeconds]);
  return { controller, state, preview };
}
