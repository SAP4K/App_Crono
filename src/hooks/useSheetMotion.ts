import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useMotionPreference } from '../context/MotionContext';
import { motionTokens } from '../theme';
import { createSheetMotion, type SheetMotionState } from './transitionMotion';

export function useSheetMotion(visible: boolean, onAfterClose?: () => void) {
  const policy = useMotionPreference(), viewport = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [state, setState] = useState<SheetMotionState>({ present: false, phase: 'closed', interactive: false });
  const [shown, setShown] = useState(false), [height, setHeight] = useState(0);
  const callback = useRef(onAfterClose), pendingExit = useRef(false);
  useLayoutEffect(() => { callback.current = onAfterClose; }, [onAfterClose]);
  const [controller] = useState(() => createSheetMotion({
    enterMs: motionTokens.sheetEnterMs, exitMs: motionTokens.sheetExitMs,
    driver: { set: (value) => progress.setValue(value), warn: (code) => console.warn(`[motion] ${code}`),
      animate: (toValue, duration, finished) => {
        const animation = Animated.timing(progress, { toValue, duration, easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web', isInteraction: false });
        animation.start(finished); return () => animation.stop();
      } },
    changed: (next) => { setState(next); if (!next.present) setShown(false); },
    exited: () => { pendingExit.current = true; },
  }));
  useLayoutEffect(() => { controller.activate(); return () => { pendingExit.current = false; controller.dispose(); }; }, [controller]);
  useLayoutEffect(() => controller.configure({ ...policy, visible, ready: shown && height > 0 }), [controller, policy, visible, shown, height]);
  useLayoutEffect(() => {
    if (visible) pendingExit.current = false;
    else if (!state.present && pendingExit.current) { pendingExit.current = false; callback.current?.(); }
  }, [state.present, visible]);
  const onShow = useCallback(() => {
    setShown(true);
    // The viewport is a safe off-screen fallback if a host misses its layout event.
    setHeight((current) => current || Math.max(viewport.height, 1));
  }, [viewport.height]);
  const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height || Math.max(viewport.height, 1)), [viewport.height]);
  const surfaceStyle = useMemo(() => ({ transform: [{ translateY: progress.interpolate({
    inputRange: [0, 1], outputRange: [height || viewport.height, 0],
  }) }] }), [progress, height, viewport.height]);
  return { ...state, interactive: visible && state.interactive, progress, surfaceStyle, onShow, onLayout };
}
