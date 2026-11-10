import { useCallback, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

/** Keep one display payload through exit; only its own completion may release it. */
export function useSheetPresentation<T>() {
  const sequence = useRef(0);
  const [presentation, setPresentation] = useState<{ token: number; value: T; visible: boolean } | null>(null);
  const open = useCallback((value: T) => setPresentation({ token: ++sequence.current, value, visible: true }), []);
  const close = useCallback(() => {
    Keyboard.dismiss();
    setPresentation((current) => current && { ...current, visible: false });
  }, []);
  const change = useCallback((update: (value: T) => T) => {
    setPresentation((current) => current?.visible ? { ...current, value: update(current.value) } : current);
  }, []);
  const afterClose = useCallback((token: number) => {
    setPresentation((current) => current?.token === token && !current.visible ? null : current);
  }, []);
  return { presentation, open, close, change, afterClose };
}
