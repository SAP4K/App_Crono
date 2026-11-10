import { useLayoutEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useMotionPreference } from '../context/MotionContext';
import { motionTokens } from '../theme';
import { createPressMotion } from './pressMotion';

export function usePressMotion(disabled: boolean) {
  const { active, reduceMotion } = useMotionPreference();
  const [progress] = useState(() => new Animated.Value(0));
  const [controller] = useState(() => createPressMotion({
    set: (value) => progress.setValue(value),
    animate: (toValue, finished) => {
      const animation = Animated.timing(progress, { toValue,
        duration: toValue === 1 ? motionTokens.pressMs : motionTokens.releaseMs,
        easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web', isInteraction: false });
      animation.start(finished);
      return () => animation.stop();
    },
  }));
  useLayoutEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  useLayoutEffect(() => controller.configure({ disabled, active, reduceMotion }), [controller, disabled, active, reduceMotion]);
  return { progress, controller, reduceMotion, active };
}
