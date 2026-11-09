import { useEffect, useState } from 'react';
import { isAppActive, subscribeAppActivity } from './appActivity';

// Presentation only: no shared-state updates or background interval.
export function useForegroundNow(running: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const changed = () => {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
      setNow(Date.now());
      if (isAppActive()) interval = setInterval(() => setNow(Date.now()), 200);
    };
    changed();
    const unsubscribe = subscribeAppActivity(changed);
    return () => { unsubscribe(); if (interval !== undefined) clearInterval(interval); };
  }, [running]);
  return now;
}
