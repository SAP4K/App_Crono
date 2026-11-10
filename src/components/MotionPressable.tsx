import { forwardRef, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import { usePressMotion } from '../hooks/usePressMotion';
import { motionTokens } from '../theme';

type HostProps = Omit<PressableProps, 'style'> & {
  pressableStyle: PressableProps['style']; style?: StyleProp<ViewStyle>;
};

// Keep callback styles outside Animated's style flattening, and keep one host/ref.
const PressableHost = forwardRef<View, HostProps>(function PressableHost({ pressableStyle, style, ...props }, ref) {
  return <Pressable {...props} ref={ref} style={(state) => [
    typeof pressableStyle === 'function' ? pressableStyle(state) : pressableStyle, style,
  ]} />;
});
const AnimatedPressable = Animated.createAnimatedComponent(PressableHost);

export const MotionPressable = forwardRef<View, PressableProps>(function MotionPressable({
  style, disabled = false, onPressIn, onPressOut, onBlur, ...props
}, ref) {
  const { progress, controller, reduceMotion, active } = usePressMotion(disabled === true);
  const base = StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style);
  const opacity = base?.opacity ?? 1;
  const transform = base?.transform;
  const motionStyle = useMemo(() => ({
    opacity: Animated.multiply(opacity, progress.interpolate({ inputRange: [0, 1], outputRange: [1, motionTokens.pressedOpacity] })),
    transform: [...(Array.isArray(transform) ? transform : []), { scale: progress.interpolate({
      inputRange: [0, 1], outputRange: [1, reduceMotion ? 1 : motionTokens.pressedScale],
    }) }],
  }), [progress, opacity, transform, reduceMotion]);
  return <AnimatedPressable {...props} ref={ref} disabled={disabled} pressableStyle={style}
    style={disabled || !active ? undefined : motionStyle}
    onPressIn={(event) => { controller.pressIn(); onPressIn?.(event); }}
    onPressOut={(event) => { controller.pressOut(); onPressOut?.(event); }}
    onBlur={(event) => { controller.cancel(); onBlur?.(event); }} />;
});
