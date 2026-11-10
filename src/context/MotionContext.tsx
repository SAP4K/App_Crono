import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { isAppActive, subscribeAppActivity } from '../hooks/appActivity';
import { observeMotionPreference, type MotionPreference } from '../hooks/motionPreference';

const MotionContext = createContext<MotionPreference>({ reduceMotion: true, active: true });

export function MotionProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<MotionPreference>({ reduceMotion: true, active: true });
  useEffect(() => observeMotionPreference({
    read: () => AccessibilityInfo.isReduceMotionEnabled(),
    subscribe: (changed) => {
      const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', changed);
      return subscription ? () => subscription.remove() : undefined;
    },
    subscribeActivity: subscribeAppActivity, isActive: isAppActive,
    changed: setPreference, warn: (code) => console.warn(`[motion] ${code}`),
  }), []);
  return <MotionContext.Provider value={preference}>{children}</MotionContext.Provider>;
}

export function useMotionPreference() { return useContext(MotionContext); }

/** Suspend covered/hidden surfaces without remounting their drafts or layout. */
export function MotionScope({ active, children }: { active: boolean; children: ReactNode }) {
  const parent = useMotionPreference();
  const preference = useMemo(() => ({ ...parent, active: parent.active && active }), [parent, active]);
  return <MotionContext.Provider value={preference}>{children}</MotionContext.Provider>;
}
