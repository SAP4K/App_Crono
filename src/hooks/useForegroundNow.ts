import { usePresentationActive } from '../context/PresentationContext';
import { useMotionPreference } from '../context/MotionContext';
import { useLayoutEffect, useState } from 'react';
import { isAppActive, subscribeAppActivity } from './appActivity';

// Presentation only: no shared-state updates or background interval.
export function useForegroundNow(running: boolean, intervalMs = 200) {
  const visible = usePresentationActive();
  const { active } = useMotionPreference();
  const [now, setNow] = useState(Date.now);
  useLayoutEffect(() => {
    if (!running || !visible || !active) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const changed = () => {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
      setNow(Date.now());
      if (isAppActive()) interval = setInterval(() => setNow(Date.now()), intervalMs);
    };
    changed();
    const unsubscribe = subscribeAppActivity(changed);
    return () => { unsubscribe(); if (interval !== undefined) clearInterval(interval); };
  }, [running, visible, active, intervalMs]);
  return now;
}
