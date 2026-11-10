import type { PropsWithChildren } from 'react';
import { useIsFocused } from 'expo-router';

export function NavigationScene({ name, children }: PropsWithChildren<{ name: string }>) {
  const focused = useIsFocused();
  // DOM-only isolation leaves portaled modals under their own presentation owner.
  return <div data-testid={`scene-${name}`} inert={!focused} aria-hidden={!focused}
    style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, pointerEvents: focused ? 'auto' : 'none' }}>{children}</div>;
}
