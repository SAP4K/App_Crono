import { useLayoutEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Easing, Platform, type StyleProp, type View, type ViewStyle } from 'react-native';
import { useMotionPreference } from '../context/MotionContext';
import { createPanelMotion } from '../hooks/transitionMotion';
import { motionTokens } from '../theme';

/** One current panel, without a keyed/remounted draft or a second scroll owner. */
export function PanelTransition({ identity, active = true, onReady, onPending, style, children }: PropsWithChildren<{
  identity: string; active?: boolean; onReady?: () => void; onPending?: () => void; style?: StyleProp<ViewStyle>;
}>) {
  const policy = useMotionPreference(), host = useRef<View>(null);
  const [progress] = useState(() => new Animated.Value(1)), [readyIdentity, setReadyIdentity] = useState<string | null>(null);
  const callbacks = useRef({ onReady, onPending, identity }), previous = useRef({ identity: '', active: false });
  useLayoutEffect(() => { callbacks.current = { onReady, onPending, identity }; }, [onReady, onPending, identity]);
  const [controller] = useState(() => createPanelMotion({ enterMs: motionTokens.panelMs,
    ready: () => setReadyIdentity(callbacks.current.identity),
    driver: { set: (value) => progress.setValue(value), warn: (code) => console.warn(`[motion] ${code}`),
      animate: (toValue, duration, finished) => {
        const animation = Animated.timing(progress, { toValue, duration, easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web', isInteraction: false });
        animation.start(finished); return () => animation.stop();
      } },
  }));
  useLayoutEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  useLayoutEffect(() => {
    if (!active || !previous.current.active || previous.current.identity !== identity) {
      setReadyIdentity(null); callbacks.current.onPending?.();
    }
    previous.current = { identity, active };
    controller.configure({ ...policy, visible: active, identity });
  }, [controller, policy, identity, active]);
  const interactive = active && readyIdentity === identity && policy.active;
  useLayoutEffect(() => { if (Platform.OS === 'web' && host.current) (host.current as unknown as HTMLElement).inert = !interactive; }, [interactive]);
  useLayoutEffect(() => { if (interactive) callbacks.current.onReady?.(); }, [interactive, identity]);
  const motionStyle = useMemo(() => ({ opacity: progress, transform: [{ translateY: progress.interpolate({
    inputRange: [0, 1], outputRange: [policy.reduceMotion ? 0 : motionTokens.panelTravel, 0],
  }) }] }), [progress, policy.reduceMotion]);
  return <Animated.View ref={host} testID="panel-transition" pointerEvents={interactive ? 'auto' : 'none'}
    accessibilityElementsHidden={!interactive} importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
    aria-hidden={!interactive} style={[style, motionStyle]}>{children}</Animated.View>;
}
