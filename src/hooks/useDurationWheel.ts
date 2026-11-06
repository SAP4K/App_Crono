import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { DurationWheelProps } from '../components/DurationWheel.types';
import { createDurationWheel } from './durationWheel';
import { isAppActive, subscribeAppActivity } from './appActivity';

export function useDurationWheel(props: DurationWheelProps, align: (offset: number) => void) {
  const latest = useRef({ props, align });
  const instance = useRef<ReturnType<typeof createDurationWheel> | null>(null);
  useLayoutEffect(() => { latest.current = { props, align }; });
  useLayoutEffect(() => {
    const controller = createDurationWheel({
      configuration: () => latest.current.props, align: (offset) => latest.current.align(offset),
      select: (value) => latest.current.props.onChange(value), busy: (busy) => latest.current.props.onInteractionChange(busy),
      schedule: (callback, delay) => setTimeout(callback, delay), cancel: (handle) => clearTimeout(handle),
    });
    instance.current = controller; controller.synchronize();
    return () => { controller.dispose(); instance.current = null; };
  }, []);
  useLayoutEffect(() => { instance.current?.synchronize(); }, [props.value, props.rowHeight, props.disabled]);
  useEffect(() => subscribeAppActivity(() => { if (!isAppActive()) instance.current?.synchronize(); }), []);
  return useMemo(() => ({
    synchronize: () => instance.current?.synchronize(),
    beginDrag: () => instance.current?.beginDrag(), beginWheel: () => instance.current?.beginWheel(),
    scroll: (offset: number) => instance.current?.scroll(offset), release: () => instance.current?.release(),
    end: (offset: number) => instance.current?.end(offset), choose: (value: number) => instance.current?.choose(value),
  }), []);
}
