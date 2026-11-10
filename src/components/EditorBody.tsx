import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { MotionScope } from '../context/MotionContext';

export function EditorBody({ hidden, children }: PropsWithChildren<{ hidden: boolean }>) {
  return <View accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    style={{ flex: 1, minHeight: 0, opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}><MotionScope active={!hidden}>{children}</MotionScope></View>;
}
