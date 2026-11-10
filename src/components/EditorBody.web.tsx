import type { PropsWithChildren } from 'react';
import { MotionScope } from '../context/MotionContext';

export function EditorBody({ hidden, children }: PropsWithChildren<{ hidden: boolean }>) {
  // Preserve the virtualized viewport while excluding the covered editor from tab order and accessibility.
  return <div inert={hidden} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, visibility: hidden ? 'hidden' : 'visible' }}><MotionScope active={!hidden}>{children}</MotionScope></div>;
}
