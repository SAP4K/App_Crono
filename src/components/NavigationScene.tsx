import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router';

export function NavigationScene({ name, children }: PropsWithChildren<{ name: string }>) {
  const focused = useIsFocused();
  return <View testID={`scene-${name}`} pointerEvents={focused ? 'auto' : 'none'}
    accessibilityElementsHidden={!focused} importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
    style={{ flex: 1, minHeight: 0 }}>{children}</View>;
}
